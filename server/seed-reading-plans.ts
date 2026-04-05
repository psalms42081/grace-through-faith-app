import { readingPlans, planDays } from "../shared/schema";
import { eq, and } from "drizzle-orm";

interface SeedPlan {
  title: string;
  description: string;
  category: string;
  durationDays: number;
  status?: string;
  days?: { dayNumber: number; bookId: number; chapter: number; verseStart?: number; verseEnd?: number }[];
}

const READING_PLAN_SEEDS: SeedPlan[] = [
  {
    title: "7 Days of Psalms for Stronger Faith",
    description: "Spend a week immersed in the Psalms — ancient prayers and songs that strengthen trust in God through every season of life.",
    category: "Spiritual Growth",
    durationDays: 7,
    days: [
      { dayNumber: 1, bookId: 19, chapter: 1 },
      { dayNumber: 2, bookId: 19, chapter: 2 },
      { dayNumber: 3, bookId: 19, chapter: 3 },
      { dayNumber: 4, bookId: 19, chapter: 4 },
      { dayNumber: 5, bookId: 19, chapter: 5 },
      { dayNumber: 6, bookId: 19, chapter: 6 },
      { dayNumber: 7, bookId: 19, chapter: 7 },
    ],
  },
  {
    title: "14 Days Through the Sermon on the Mount",
    description: "Walk through Jesus' most transformative teaching — a radical blueprint for kingdom living found in Matthew 5–7.",
    category: "Spiritual Growth",
    durationDays: 14,
    days: [
      { dayNumber: 1, bookId: 40, chapter: 5, verseStart: 1, verseEnd: 12 },
      { dayNumber: 2, bookId: 40, chapter: 5, verseStart: 13, verseEnd: 20 },
      { dayNumber: 3, bookId: 40, chapter: 5, verseStart: 21, verseEnd: 32 },
      { dayNumber: 4, bookId: 40, chapter: 5, verseStart: 33, verseEnd: 48 },
      { dayNumber: 5, bookId: 40, chapter: 6, verseStart: 1, verseEnd: 8 },
      { dayNumber: 6, bookId: 40, chapter: 6, verseStart: 9, verseEnd: 15 },
      { dayNumber: 7, bookId: 40, chapter: 6, verseStart: 16, verseEnd: 24 },
      { dayNumber: 8, bookId: 40, chapter: 6, verseStart: 25, verseEnd: 34 },
      { dayNumber: 9, bookId: 40, chapter: 7, verseStart: 1, verseEnd: 6 },
      { dayNumber: 10, bookId: 40, chapter: 7, verseStart: 7, verseEnd: 12 },
      { dayNumber: 11, bookId: 40, chapter: 7, verseStart: 13, verseEnd: 14 },
      { dayNumber: 12, bookId: 40, chapter: 7, verseStart: 15, verseEnd: 20 },
      { dayNumber: 13, bookId: 40, chapter: 7, verseStart: 21, verseEnd: 23 },
      { dayNumber: 14, bookId: 40, chapter: 7, verseStart: 24, verseEnd: 29 },
    ],
  },
  {
    title: "7 Days on Anxiety and Peace",
    description: "When worry overwhelms, Scripture offers a path to peace. Seven passages that point anxious hearts toward the Prince of Peace.",
    category: "Mental Health",
    durationDays: 7,
    days: [
      { dayNumber: 1, bookId: 50, chapter: 4 },
      { dayNumber: 2, bookId: 23, chapter: 41 },
      { dayNumber: 3, bookId: 19, chapter: 23 },
      { dayNumber: 4, bookId: 19, chapter: 46 },
      { dayNumber: 5, bookId: 40, chapter: 6 },
      { dayNumber: 6, bookId: 45, chapter: 8 },
      { dayNumber: 7, bookId: 23, chapter: 26 },
    ],
  },
  {
    title: "7 Days on Who You Are in Christ",
    description: "Discover your true identity — chosen, redeemed, and deeply loved. Let Scripture redefine how you see yourself through Christ.",
    category: "Identity",
    durationDays: 7,
    days: [
      { dayNumber: 1, bookId: 49, chapter: 1 },
      { dayNumber: 2, bookId: 49, chapter: 2 },
      { dayNumber: 3, bookId: 45, chapter: 8 },
      { dayNumber: 4, bookId: 19, chapter: 139 },
      { dayNumber: 5, bookId: 43, chapter: 15 },
      { dayNumber: 6, bookId: 48, chapter: 2 },
      { dayNumber: 7, bookId: 51, chapter: 3 },
    ],
  },
  {
    title: "7 Days on Forgiveness",
    description: "Forgiveness is at the heart of the Gospel. Explore what it means to receive and extend the grace Christ offers.",
    category: "Relationships",
    durationDays: 7,
    days: [
      { dayNumber: 1, bookId: 40, chapter: 18 },
      { dayNumber: 2, bookId: 49, chapter: 4 },
      { dayNumber: 3, bookId: 51, chapter: 3 },
      { dayNumber: 4, bookId: 42, chapter: 15 },
      { dayNumber: 5, bookId: 1, chapter: 50 },
      { dayNumber: 6, bookId: 45, chapter: 12 },
      { dayNumber: 7, bookId: 40, chapter: 6 },
    ],
  },
  {
    title: "5 Days Through the Life of David",
    description: "From shepherd boy to king — trace David's journey of faith, failure, and restoration through Scripture's most vivid narrative.",
    category: "Young Disciples",
    durationDays: 5,
    days: [
      { dayNumber: 1, bookId: 9, chapter: 16 },
      { dayNumber: 2, bookId: 9, chapter: 17 },
      { dayNumber: 3, bookId: 10, chapter: 5 },
      { dayNumber: 4, bookId: 19, chapter: 23 },
      { dayNumber: 5, bookId: 19, chapter: 51 },
    ],
  },
  {
    title: "The Easter Story",
    description: "Walk through the final days of Jesus — from the upper room to the empty tomb. The story that changed everything.",
    category: "Seasonal",
    durationDays: 8,
    days: [
      { dayNumber: 1, bookId: 42, chapter: 22 },
      { dayNumber: 2, bookId: 40, chapter: 26 },
      { dayNumber: 3, bookId: 43, chapter: 18 },
      { dayNumber: 4, bookId: 42, chapter: 23 },
      { dayNumber: 5, bookId: 43, chapter: 19 },
      { dayNumber: 6, bookId: 42, chapter: 24, verseStart: 1, verseEnd: 27 },
      { dayNumber: 7, bookId: 42, chapter: 24, verseStart: 28, verseEnd: 53 },
      { dayNumber: 8, bookId: 43, chapter: 20 },
    ],
  },
  {
    title: "Standing Firm in Faith",
    description: "Coming soon — a powerful study on persevering through trials, rooted in the promises of God.",
    category: "Spiritual Growth",
    durationDays: 7,
    status: "coming-soon",
  },
];

export async function seedReadingPlans(database: any): Promise<void> {
  try {
    console.log("[seed-plans] Starting reading plans seed check...");
    const existingReadyMade = await database
      .select({ id: readingPlans.id })
      .from(readingPlans)
      .where(eq(readingPlans.type, "ready-made"))
      .limit(1);
    console.log(`[seed-plans] Found ${existingReadyMade.length} existing ready-made plans`);
    if (existingReadyMade.length > 0) {
      console.log("[seed-plans] Ready-made reading plans already seeded, skipping.");
      return;
    }

    console.log("[seed-plans] Seeding reading plans...");

    for (const plan of READING_PLAN_SEEDS) {
      const [inserted] = await database
        .insert(readingPlans)
        .values({
          title: plan.title,
          description: plan.description,
          category: plan.category,
          durationDays: plan.durationDays,
          type: "ready-made",
          status: plan.status ?? "active",
        })
        .returning();

      if (plan.days && plan.days.length > 0) {
        await database.insert(planDays).values(
          plan.days.map((d) => ({
            planId: inserted.id,
            dayNumber: d.dayNumber,
            bookId: d.bookId,
            chapter: d.chapter,
            verseStart: d.verseStart ?? null,
            verseEnd: d.verseEnd ?? null,
          }))
        );
      }

      console.log(`  [seed-plans] Reading plan: "${plan.title}" (${plan.days?.length ?? 0} days)`);
    }

    console.log("[seed-plans] Reading plans seeding complete.");
  } catch (err) {
    console.error("[seed-plans] FATAL ERROR seeding reading plans:", err);
    throw err;
  }
}
