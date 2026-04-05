import { devotionalPlans } from "../shared/schema";
import { eq } from "drizzle-orm";

const CATEGORY_MAP: Record<string, "foundations" | "prophetic"> = {
  "Foundations of Faith": "foundations",
  "The Life of Christ": "foundations",
  "Psalms of Comfort": "foundations",
  "God's Unfailing Love": "foundations",
  "The Sabbath Rest": "foundations",
  "Walking Through the Wilderness": "foundations",
  "A Life of Prayer": "foundations",
  "Wisdom for Life": "foundations",
  "Living in Hope": "foundations",
  "Grace Upon Grace": "foundations",
  "Finding Peace": "foundations",
  "The Sermon on the Mount": "foundations",
  "Strength in Weakness": "foundations",
  "Daniel's Prophecies — End-Time Visions": "prophetic",
  "Prophets and Prophecy": "prophetic",
  "The Heavenly Sanctuary": "prophetic",
  "Death, Sleep, and Resurrection": "prophetic",
};

export async function fixDevotionalCategories(database: any): Promise<void> {
  console.log("[fix-categories] Checking devotional plan categories...");

  const allPlans = await database
    .select({ id: devotionalPlans.id, title: devotionalPlans.title, category: devotionalPlans.category })
    .from(devotionalPlans);

  let updated = 0;

  for (const plan of allPlans) {
    const correctCategory = CATEGORY_MAP[plan.title];
    if (!correctCategory) continue;

    if (plan.category !== correctCategory) {
      await database
        .update(devotionalPlans)
        .set({ category: correctCategory })
        .where(eq(devotionalPlans.id, plan.id));
      console.log(`[fix-categories] "${plan.title}": ${plan.category} → ${correctCategory}`);
      updated++;
    }
  }

  if (updated === 0) {
    console.log("[fix-categories] All categories already correct.");
  } else {
    console.log(`[fix-categories] Updated ${updated} plan categories.`);
  }
}
