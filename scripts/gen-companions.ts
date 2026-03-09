import { generateSabbathSchoolCompanion } from "../server/services/content-engine";

const LESSONS = [
  { id: "2d5a9fa6-6446-4fd8-9390-8387d8ce08a0", num: 11, title: "Living With Christ" },
  { id: "06671a37-9103-4967-b4cf-3afb3e27476b", num: 5, title: "Shining as Lights in the Night" },
  { id: "6401c90d-d1ed-4d7a-a340-eb83d8c70720", num: 9, title: "Reconciliation and Hope" },
  { id: "7c8ce001-1157-4e45-bdb1-452d8e83b07f", num: 8, title: "The Preeminence of Christ" },
  { id: "2953bbd7-00bb-4c39-8225-7f3f3ff298d7", num: 4, title: "Unity Through Humility" },
];

async function main() {
  for (const lesson of LESSONS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Generating companion for Lesson ${lesson.num}: ${lesson.title}`);
    console.log("=".repeat(60));
    try {
      const resourceId = await generateSabbathSchoolCompanion(lesson.id);
      console.log(`SUCCESS: Resource created with ID: ${resourceId}`);
    } catch (err: any) {
      console.error(`FAILED: ${err.message}`);
    }
  }
  console.log("\nAll done.");
  process.exit(0);
}

main();
