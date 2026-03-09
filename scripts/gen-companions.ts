import { generateQuarterCompanions, getAvailableQuarters } from "../server/services/batch-generator";

function getCurrentQuarterCode(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const quarter = month <= 3 ? "01" : month <= 6 ? "02" : month <= 9 ? "03" : "04";
  return `${year}-${quarter}`;
}

async function main() {
  const args = process.argv.slice(2);
  const eqForm = args.find(a => a.startsWith("--quarter="))?.split("=")[1];
  const flagIdx = args.indexOf("--quarter");
  const posForm = flagIdx >= 0 && flagIdx + 1 < args.length && !args[flagIdx + 1].startsWith("--")
    ? args[flagIdx + 1]
    : undefined;
  const quarterArg = eqForm || posForm;
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const listQuarters = args.includes("--list");

  if (listQuarters) {
    const quarters = await getAvailableQuarters();
    console.log("\nAvailable quarters:");
    for (const q of quarters) {
      console.log(`  ${q.quarterCode} - ${q.title} (${q.companionCount}/${q.lessonCount} companions)`);
    }
    process.exit(0);
  }

  const quarterCode = quarterArg || getCurrentQuarterCode();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Batch generating companions for quarter: ${quarterCode}`);
  console.log(`Options: force=${force}, dryRun=${dryRun}`);
  console.log("=".repeat(60));

  try {
    const result = await generateQuarterCompanions(quarterCode, { force, dryRun });

    console.log(`\n${"=".repeat(60)}`);
    console.log("BATCH GENERATION RESULTS");
    console.log("=".repeat(60));
    console.log(`Quarter: ${result.quarterTitle} (${result.quarterCode})`);
    console.log(`Total lessons: ${result.total}`);
    console.log(`Generated: ${result.generated}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log(`\nPacket stats: ${result.packetStats.created} created, ${result.packetStats.updated} updated, ${result.packetStats.unchanged} unchanged`);

    if (result.details.length > 0) {
      console.log("\nDetails:");
      for (const d of result.details) {
        const icon = d.action === "generated" ? "+" : d.action === "skipped" ? "-" : "X";
        console.log(`  [${icon}] Lesson ${d.weekNumber}: ${d.lessonTitle} (${d.action}${d.reason ? ` - ${d.reason}` : ""})`);
      }
    }
  } catch (err: any) {
    console.error(`\nFATAL: ${err.message}`);
    process.exit(1);
  }

  process.exit(0);
}

main();
