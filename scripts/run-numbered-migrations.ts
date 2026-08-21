import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const MIGRATION_PATTERN = /^(\d{4})_.+\.sql$/;
const ADOPTED_SCHEMA_MIGRATIONS = new Set([
  "0000_sharp_slyde.sql",
  "0003_remove_hologram_and_scholarly_persona.sql",
]);
const LEDGER_TABLE = "app_sql_migration";
const LOCK_NAME = "grace-through-faith:numbered-sql-migrations:v1";

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid PostgreSQL identifier: ${value}`);
  }

  return `"${value}"`;
}

function parseThroughVersion(argv: string[]): string | undefined {
  const inline = argv.find((argument) => argument.startsWith("--through="));
  const throughIndex = argv.indexOf("--through");
  const rawValue = inline?.slice("--through=".length)
    ?? (throughIndex >= 0 ? argv[throughIndex + 1] : undefined);

  if (throughIndex >= 0 && !rawValue) {
    throw new Error("--through requires a migration version such as 0004");
  }

  if (!rawValue) {
    return undefined;
  }

  const match = rawValue.match(/^(\d{1,4})/);
  if (!match) {
    throw new Error(`Invalid --through migration version: ${rawValue}`);
  }

  return match[1].padStart(4, "0");
}

function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function targetConfiguredSchema(content: string, databaseSchema: string): string {
  if (databaseSchema === "public") {
    return content;
  }

  return content.replaceAll('"public".', `${quoteIdentifier(databaseSchema)}.`);
}

function withoutOuterTransaction(content: string, filename: string): string {
  const trimmed = content.trim();
  const startsTransaction = /^BEGIN\s*;/i.test(trimmed);
  const endsTransaction = /COMMIT\s*;$/i.test(trimmed);

  if (startsTransaction !== endsTransaction) {
    throw new Error(
      `${filename} must contain both BEGIN/COMMIT or neither so the runner can apply it atomically`,
    );
  }

  if (!startsTransaction) {
    return trimmed;
  }

  return trimmed
    .replace(/^BEGIN\s*;\s*/i, "")
    .replace(/\s*COMMIT\s*;$/i, "")
    .trim();
}

async function verifyExistingGraceThroughFaithSchema(
  client: Client,
  databaseSchema: string,
) {
  const requiredColumns = [
    ["users", "id"],
    ["users", "preferred_curriculum"],
    ["study_guide_session", "persona"],
    ["devotional_plan", "id"],
    ["devotional_day", "plan_id"],
    ["user_plan_enrollment", "plan_id"],
    ["sabbath_school_quarterly", "curriculum_type"],
    ["sabbath_school_day", "audio_url"],
    ["sabbath_school_lesson", "video_by_artist"],
  ];
  const columnCheck = await client.query<{ table_name: string; column_name: string }>(
    `SELECT required.table_name, required.column_name
       FROM unnest($2::text[], $3::text[]) AS required(table_name, column_name)
       LEFT JOIN information_schema.columns existing
         ON existing.table_schema = $1
        AND existing.table_name = required.table_name
        AND existing.column_name = required.column_name
      WHERE existing.column_name IS NULL`,
    [
      databaseSchema,
      requiredColumns.map(([tableName]) => tableName),
      requiredColumns.map(([, columnName]) => columnName),
    ],
  );

  if (columnCheck.rows.length > 0) {
    const missing = columnCheck.rows
      .map(({ table_name, column_name }) => `${table_name}.${column_name}`)
      .join(", ");
    throw new Error(
      `Refusing to baseline an incomplete or unrelated existing schema; missing: ${missing}. Run the schema push before adopting numbered migrations.`,
    );
  }

  const quotedSchema = quoteIdentifier(databaseSchema);
  const retiredState = await client.query<{
    pioneer_video_exists: boolean;
    hologram_column_exists: boolean;
    scholarly_persona_count: number;
    persona_default: string | null;
  }>(
    `SELECT
       to_regclass($1) IS NOT NULL AS pioneer_video_exists,
       EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = $2
            AND table_name = 'users'
            AND column_name = 'hologram_onboarding_seen'
       ) AS hologram_column_exists,
       (SELECT count(*)::int
          FROM ${quotedSchema}."study_guide_session"
         WHERE persona = 'scholarly') AS scholarly_persona_count,
       (SELECT column_default
          FROM information_schema.columns
         WHERE table_schema = $2
           AND table_name = 'study_guide_session'
           AND column_name = 'persona') AS persona_default`,
    [`${databaseSchema}.pioneer_video`, databaseSchema],
  );
  const state = retiredState.rows[0];

  if (
    state?.pioneer_video_exists
    || state?.hologram_column_exists
    || state?.scholarly_persona_count !== 0
    || !state?.persona_default?.includes("pastoral")
  ) {
    throw new Error(
      "Refusing to baseline migration 0003 because its retirement postconditions are not present. Preserve or migrate legacy hologram/persona data explicitly before adoption.",
    );
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run numbered SQL migrations");
  }

  const databaseSchema = process.env.NUMBERED_MIGRATIONS_SCHEMA ?? "public";
  const quotedSchema = quoteIdentifier(databaseSchema);
  const throughVersion = parseThroughVersion(process.argv.slice(2));
  const migrationsDirectory = path.resolve(process.cwd(), "migrations");
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((filename) => MIGRATION_PATTERN.test(filename))
    .sort();

  if (migrationFiles.length === 0) {
    throw new Error(`No numbered SQL migrations found in ${migrationsDirectory}`);
  }

  const duplicateVersion = migrationFiles.find((filename, index) => {
    const version = filename.slice(0, 4);
    return migrationFiles.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index && candidate.slice(0, 4) === version,
    );
  });
  if (duplicateVersion) {
    throw new Error(`Multiple SQL migrations use version ${duplicateVersion.slice(0, 4)}`);
  }

  const selectedFiles = throughVersion
    ? migrationFiles.filter((filename) => filename.slice(0, 4) <= throughVersion)
    : migrationFiles;
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  const managesAdvisoryLock =
    process.env.NUMBERED_MIGRATIONS_LOCK_HELD !== "1";
  const lockName = `${LOCK_NAME}:${databaseSchema}`;

  await client.connect();
  try {
    await client.query(`SET search_path TO ${quotedSchema}`);
    if (managesAdvisoryLock) {
      await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockName]);
    }

    const schemaState = await client.query<{ has_application_tables: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM information_schema.tables
          WHERE table_schema = $1
            AND table_name <> $2
       ) AS has_application_tables`,
      [databaseSchema, LEDGER_TABLE],
    );
    const hasApplicationTables = schemaState.rows[0]?.has_application_tables ?? false;

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(LEDGER_TABLE)} (
        filename text PRIMARY KEY,
        checksum varchar(64) NOT NULL,
        execution_method varchar(20) NOT NULL
          CHECK (execution_method IN ('applied', 'schema_baseline')),
        applied_at timestamptz DEFAULT now() NOT NULL
      )
    `);

    const adoptedLedgerEntries = hasApplicationTables
      ? await client.query<{ filename: string }>(
          `SELECT filename
             FROM ${quoteIdentifier(LEDGER_TABLE)}
            WHERE filename = ANY($1::text[])`,
          [[...ADOPTED_SCHEMA_MIGRATIONS]],
        )
      : { rows: [] };
    const recordedAdoptedMigrations = new Set(
      adoptedLedgerEntries.rows.map(({ filename }) => filename),
    );
    const needsSchemaAdoption =
      hasApplicationTables
      && [...ADOPTED_SCHEMA_MIGRATIONS].some(
        (filename) => !recordedAdoptedMigrations.has(filename),
      );

    if (needsSchemaAdoption) {
      await verifyExistingGraceThroughFaithSchema(client, databaseSchema);
    }

    for (const filename of selectedFiles) {
      const migrationPath = path.join(migrationsDirectory, filename);
      const content = await readFile(migrationPath, "utf8");
      const migrationChecksum = checksum(content);
      const ledgerResult = await client.query<{
        checksum: string;
        execution_method: string;
      }>(
        `SELECT checksum, execution_method
           FROM ${quoteIdentifier(LEDGER_TABLE)}
          WHERE filename = $1`,
        [filename],
      );
      const ledgerEntry = ledgerResult.rows[0];

      if (ledgerEntry) {
        if (ledgerEntry.checksum !== migrationChecksum) {
          throw new Error(
            `${filename} changed after it was recorded in ${LEDGER_TABLE}; create a new migration instead`,
          );
        }

        console.log(`Skipping ${filename} (${ledgerEntry.execution_method})`);
        continue;
      }

      if (hasApplicationTables && ADOPTED_SCHEMA_MIGRATIONS.has(filename)) {
        await client.query(
          `INSERT INTO ${quoteIdentifier(LEDGER_TABLE)}
             (filename, checksum, execution_method)
           VALUES ($1, $2, 'schema_baseline')`,
          [filename, migrationChecksum],
        );
        console.log(`Recorded ${filename} as the baseline for the existing schema`);
        continue;
      }

      const sql = withoutOuterTransaction(
        targetConfiguredSchema(content, databaseSchema),
        filename,
      );
      console.log(`Applying ${filename}...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${quoteIdentifier(LEDGER_TABLE)}
             (filename, checksum, execution_method)
           VALUES ($1, $2, 'applied')`,
          [filename, migrationChecksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      console.log(`Applied ${filename}`);
    }
  } finally {
    if (managesAdvisoryLock) {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockName]);
      } catch {
        // The connection may already be unavailable after a database-level failure.
      }
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error("Numbered SQL migration runner failed:", error);
  process.exit(1);
});