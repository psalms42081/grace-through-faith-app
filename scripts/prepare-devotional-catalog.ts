import { spawn } from "node:child_process";
import { Client } from "pg";

const LOCK_NAME = "grace-through-faith:numbered-sql-migrations:v1";

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid PostgreSQL identifier: ${value}`);
  }

  return `"${value}"`;
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed ${
            signal ? `with signal ${signal}` : `with exit code ${code}`
          }`,
        ),
      );
    });
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to prepare the devotional catalog");
  }

  const databaseSchema = process.env.NUMBERED_MIGRATIONS_SCHEMA ?? "public";
  const lockName = `${LOCK_NAME}:${databaseSchema}`;
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  const childEnv = {
    ...process.env,
    NUMBERED_MIGRATIONS_LOCK_HELD: "1",
  };

  await client.connect();
  try {
    await client.query(`SET search_path TO ${quoteIdentifier(databaseSchema)}`);
    console.log("Waiting for the devotional catalog deployment lock...");
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockName]);
    console.log("Devotional catalog deployment lock acquired.");

    await run(
      "npx",
      ["tsx", "scripts/run-numbered-migrations.ts", "--through", "0004"],
      childEnv,
    );
    await run("npx", ["tsx", "scripts/seed-books.ts"], childEnv);
    await run("npx", ["tsx", "scripts/seed-strongs-from-json.ts"], childEnv);
    await run("npx", ["tsx", "scripts/seed-devotionals.ts"], childEnv);
    await run("npx", ["tsx", "scripts/seed-sda-devotionals.ts"], childEnv);
    await run("npx", ["tsx", "scripts/seed-more-devotionals.ts"], childEnv);
    await run("npx", ["tsx", "server/seed-plans.ts"], childEnv);
    await run("npx", ["tsx", "scripts/run-numbered-migrations.ts"], childEnv);
    await run("npm", ["run", "test:devotional-catalog"], childEnv);
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockName]);
    } catch {
      // The session may already be gone; PostgreSQL releases its advisory lock.
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error("Devotional catalog preparation failed:", error);
  process.exit(1);
});