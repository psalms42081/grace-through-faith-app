import { biblicalSeries, biblicalEpisodes } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function deduplicateSeries(database: any): Promise<void> {
  const allSeries = await database
    .select({ id: biblicalSeries.id, title: biblicalSeries.title, createdAt: biblicalSeries.createdAt })
    .from(biblicalSeries)
    .orderBy(biblicalSeries.createdAt);

  const seen = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const s of allSeries) {
    if (seen.has(s.title)) {
      duplicateIds.push(s.id);
    } else {
      seen.set(s.title, s.id);
    }
  }

  if (duplicateIds.length > 0) {
    console.log(`[seed-series] Removing ${duplicateIds.length} duplicate series: ${duplicateIds.join(", ")}`);
    for (const dupId of duplicateIds) {
      await database.delete(biblicalEpisodes).where(eq(biblicalEpisodes.seriesId, dupId));
      await database.delete(biblicalSeries).where(eq(biblicalSeries.id, dupId));
    }
    console.log("[seed-series] Duplicates removed.");
  }
}

const COMPLETED_EPISODES: Record<string, { videoUrl: string; duration: number }> = {
  "He Is Risen": {
    videoUrl: "https://res.cloudinary.com/dy77gwpzu/video/upload/v1774827906/grace-through-faith/easter-story/episode6-he-is-risen.mp4",
    duration: 190,
  },
};

async function ensureCompletedEpisodes(database: any): Promise<void> {
  for (const [title, data] of Object.entries(COMPLETED_EPISODES)) {
    const [ep] = await database
      .select({ id: biblicalEpisodes.id, videoUrl: biblicalEpisodes.videoUrl, status: biblicalEpisodes.status })
      .from(biblicalEpisodes)
      .where(eq(biblicalEpisodes.title, title))
      .limit(1);

    if (ep && ep.videoUrl === data.videoUrl && ep.status === "complete") {
      console.log(`[seed-series] "${title}" already has video URL`);
    } else if (ep) {
      await database
        .update(biblicalEpisodes)
        .set({ videoUrl: data.videoUrl, duration: data.duration, status: "complete" })
        .where(eq(biblicalEpisodes.id, ep.id));
      console.log(`[seed-series] Updated "${title}" with video URL`);
    }
  }
}

export async function seedBiblicalSeries(database: any): Promise<void> {
  try {
    console.log("[seed-series] Starting biblical series seed check...");

    await deduplicateSeries(database);
    await ensureCompletedEpisodes(database);

    const existing = await database.select({ id: biblicalSeries.id }).from(biblicalSeries).limit(1);
    console.log(`[seed-series] Found ${existing.length} existing series`);
    if (existing.length > 0) {
      console.log("[seed-series] Biblical series already seeded, skipping.");
      return;
    }

    console.log("[seed-series] Seeding biblical series...");

  const [easterSeries] = await database.insert(biblicalSeries).values({
    title: "The Easter Story",
    subtitle: "Why Jesus Had to Die for Us",
    tag: "Easter Special",
    speaker: "Adult",
    gradientColors: ["#1a0a2e", "#2d1b69", "#4c1d95"],
    episodeCount: 6,
    status: "published",
    isFeatured: true,
    sortOrder: 0,
  }).returning();

  await database.insert(biblicalEpisodes).values([
    {
      seriesId: easterSeries.id,
      title: "The Last Supper",
      description: "Jesus shares a final meal with His disciples, instituting the Lord's Supper and washing their feet in an act of servant leadership.",
      scriptureAnchor: "Luke 22:14-20",
      videoUrl: "",
      duration: 480,
      orderIndex: 1,
      status: "ready",
    },
    {
      seriesId: easterSeries.id,
      title: "Garden of Gethsemane",
      description: "In the garden, Jesus agonizes in prayer before His arrest, asking the Father to take the cup from Him yet submitting to God's will.",
      scriptureAnchor: "Matthew 26:36-46",
      videoUrl: "",
      duration: 420,
      orderIndex: 2,
      status: "ready",
    },
    {
      seriesId: easterSeries.id,
      title: "The Trial",
      description: "Jesus stands before Pilate and the Jewish leaders, falsely accused yet silent before His accusers, fulfilling the prophecy of Isaiah.",
      scriptureAnchor: "John 18:28-40",
      videoUrl: "",
      duration: 540,
      orderIndex: 3,
      status: "ready",
    },
    {
      seriesId: easterSeries.id,
      title: "The Crucifixion",
      description: "Jesus is nailed to the cross at Golgotha, bearing the sins of the world. His final words echo through history: 'It is finished.'",
      scriptureAnchor: "John 19:17-30",
      videoUrl: "",
      duration: 600,
      orderIndex: 4,
      status: "ready",
    },
    {
      seriesId: easterSeries.id,
      title: "The Burial",
      description: "Joseph of Arimathea and Nicodemus lay Jesus in a new tomb. The stone is rolled in place as hope seems lost.",
      scriptureAnchor: "Matthew 27:57-66",
      videoUrl: "",
      duration: 360,
      orderIndex: 5,
      status: "ready",
    },
    {
      seriesId: easterSeries.id,
      title: "He Is Risen",
      description: "On the third day, the tomb is empty. The angel declares: 'He is not here; He has risen!' Death is defeated and hope is restored.",
      scriptureAnchor: "Matthew 28:1-10",
      videoUrl: "https://res.cloudinary.com/dy77gwpzu/video/upload/v1774827906/grace-through-faith/easter-story/episode6-he-is-risen.mp4",
      duration: 190,
      orderIndex: 6,
      status: "complete",
    },
  ]);

  const [gospelSeries] = await database.insert(biblicalSeries).values({
    title: "The Gospel Stories",
    subtitle: "Walking Through the Life of Christ",
    tag: "New",
    speaker: "Adult",
    gradientColors: ["#0a1628", "#1e3a5f"],
    episodeCount: 8,
    status: "published",
    isFeatured: false,
    sortOrder: 1,
  }).returning();

  await database.insert(biblicalEpisodes).values([
    {
      seriesId: gospelSeries.id,
      title: "The Annunciation",
      description: "The angel Gabriel appears to Mary in Nazareth, announcing that she will bear the Son of the Most High. Mary responds in faith: 'Let it be to me according to your word.'",
      scriptureAnchor: "Luke 1:26-38",
      videoUrl: "",
      duration: 420,
      orderIndex: 1,
      status: "ready",
    },
    {
      seriesId: gospelSeries.id,
      title: "Born in Bethlehem",
      description: "Joseph and Mary travel to Bethlehem for the census. In a humble manger, Jesus is born. Shepherds come to worship, guided by angels proclaiming peace on earth.",
      scriptureAnchor: "Luke 2:1-20",
      videoUrl: "",
      duration: 480,
      orderIndex: 2,
      status: "ready",
    },
    {
      seriesId: gospelSeries.id,
      title: "The Baptism of Jesus",
      description: "Jesus comes to the Jordan River where John baptizes Him. The heavens open, the Spirit descends like a dove, and the Father's voice declares: 'This is my beloved Son.'",
      scriptureAnchor: "Matthew 3:13-17",
      videoUrl: "",
      duration: 360,
      orderIndex: 3,
      status: "ready",
    },
    {
      seriesId: gospelSeries.id,
      title: "Temptation in the Wilderness",
      description: "After 40 days of fasting in the desert, Satan tempts Jesus three times. Each time, Jesus answers with Scripture, demonstrating victory over the enemy.",
      scriptureAnchor: "Matthew 4:1-11",
      videoUrl: "",
      duration: 480,
      orderIndex: 4,
      status: "ready",
    },
    {
      seriesId: gospelSeries.id,
      title: "Calling the Disciples",
      description: "Jesus walks along the Sea of Galilee and calls fishermen to follow Him. 'Come, follow me,' He says, 'and I will make you fishers of men.' They leave everything behind.",
      scriptureAnchor: "Mark 1:16-20",
      videoUrl: "",
      duration: 420,
      orderIndex: 5,
      status: "ready",
    },
    {
      seriesId: gospelSeries.id,
      title: "The Sermon on the Mount",
      description: "On a mountainside, Jesus teaches the Beatitudes and the Lord's Prayer, redefining righteousness with words that still transform lives today.",
      scriptureAnchor: "Matthew 5-7",
      videoUrl: "",
      duration: 600,
      orderIndex: 6,
      status: "ready",
    },
    {
      seriesId: gospelSeries.id,
      title: "Feeding the Five Thousand",
      description: "With just five loaves and two fish, Jesus feeds a multitude. The disciples learn that in God's hands, even the smallest offering becomes more than enough.",
      scriptureAnchor: "John 6:1-14",
      videoUrl: "",
      duration: 420,
      orderIndex: 7,
      status: "ready",
    },
    {
      seriesId: gospelSeries.id,
      title: "The Transfiguration",
      description: "On a high mountain, Jesus is transfigured before Peter, James, and John. His face shines like the sun. Moses and Elijah appear, and God's voice speaks from the cloud.",
      scriptureAnchor: "Matthew 17:1-9",
      videoUrl: "",
      duration: 480,
      orderIndex: 8,
      status: "ready",
    },
  ]);

  const [parablesSeries] = await database.insert(biblicalSeries).values({
    title: "Parables of Jesus",
    subtitle: "Timeless Lessons for Today",
    tag: "New",
    speaker: "Adult",
    gradientColors: ["#1a0f0a", "#5f3a1e"],
    episodeCount: 5,
    status: "published",
    isFeatured: false,
    sortOrder: 2,
  }).returning();

  await database.insert(biblicalEpisodes).values([
    {
      seriesId: parablesSeries.id,
      title: "The Good Samaritan",
      description: "A man is beaten and left for dead on the road to Jericho. A priest and a Levite pass by, but a Samaritan stops to help. Jesus asks: 'Who was a neighbor to the man?'",
      scriptureAnchor: "Luke 10:25-37",
      videoUrl: "",
      duration: 420,
      orderIndex: 1,
      status: "ready",
    },
    {
      seriesId: parablesSeries.id,
      title: "The Prodigal Son",
      description: "A younger son demands his inheritance and wastes it in reckless living. Broken and hungry, he returns home — and his father runs to meet him with open arms.",
      scriptureAnchor: "Luke 15:11-32",
      videoUrl: "",
      duration: 540,
      orderIndex: 2,
      status: "ready",
    },
    {
      seriesId: parablesSeries.id,
      title: "The Sower and the Seeds",
      description: "A farmer scatters seed on four types of soil. Jesus reveals that the soil represents the condition of the human heart and its openness to God's word.",
      scriptureAnchor: "Matthew 13:1-23",
      videoUrl: "",
      duration: 480,
      orderIndex: 3,
      status: "ready",
    },
    {
      seriesId: parablesSeries.id,
      title: "The Lost Sheep",
      description: "A shepherd has 100 sheep but one wanders away. He leaves the 99 to search for the lost one. Jesus teaches that heaven rejoices over every sinner who repents.",
      scriptureAnchor: "Luke 15:1-7",
      videoUrl: "",
      duration: 360,
      orderIndex: 4,
      status: "ready",
    },
    {
      seriesId: parablesSeries.id,
      title: "The Ten Virgins",
      description: "Ten young women wait for the bridegroom. Five are prepared with oil in their lamps; five are not. Jesus warns: 'Watch, for you do not know the day or the hour.'",
      scriptureAnchor: "Matthew 25:1-13",
      videoUrl: "",
      duration: 420,
      orderIndex: 5,
      status: "ready",
    },
  ]);

    console.log("[seed-series] Biblical series seeded successfully.");
  } catch (err) {
    console.error("[seed-series] FATAL ERROR seeding biblical series:", err);
    throw err;
  }
}
