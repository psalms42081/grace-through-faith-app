import { db } from "../server/db";
import { seedResources } from "../server/seed-resources";

async function main() {
  await seedResources(db);
  process.exit(0);
}

main().catch((err) => {
  console.error("Resource seed error:", err);
  process.exit(1);
});
