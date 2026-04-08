import { db } from "../db";
import {
  users,
  churchHierarchy,
  hierarchyMembership,
  readingStreaks,
  topicEngagement,
  topicEngagementDaily,
  topicTrend,
  pastoralCareAlert,
  heatmapTile,
  activityPatternTile,
  analyticsCache,
} from "../../shared/schema";
import { eq, sql, like, and } from "drizzle-orm";
import bcrypt from "bcrypt";

const DEMO_PREFIX = "demo-";
const DEMO_EMAIL_DOMAIN = "@demo.gracethroughfaith.app";

function demoId(suffix: string) {
  return `${DEMO_PREFIX}${suffix}`;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateMinusDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return formatDate(monday);
}

const AGE_GROUPS = ["13-17", "18-25", "26-35", "36-45", "46-55", "56-65", "65+"];

const TOPIC_IDS = [
  "abandonment", "addiction", "anger", "anxiety", "forgiveness",
  "grief", "loneliness", "purpose", "fear", "marriage",
  "patience", "temptation", "suffering", "gratitude", "prayer",
  "identity", "contentment", "integrity", "doubt", "generosity",
  "depression", "trust", "humility", "parenting", "hope",
  "sabbath", "justice", "work", "sanctuary", "second-coming",
  "three-angels", "health-message", "state-of-dead", "great-controversy",
  "stewardship", "serving-others", "fasting", "baptism", "discipleship",
  "gods-love", "gods-grace", "the-trinity",
];

const TOPIC_TYPES = [
  "signpost", "essentials", "video", "reading_plan",
  "devotional", "search", "sabbath_school",
] as const;

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Daniel", "Nancy", "Matthew", "Lisa",
  "Anthony", "Betty", "Mark", "Margaret", "Donald", "Sandra", "Steven", "Ashley",
  "Paul", "Dorothy", "Andrew", "Kimberly", "Joshua", "Emily", "Kenneth", "Donna",
  "George", "Michelle", "Edward", "Carol", "Brian", "Amanda", "Ronald", "Melissa",
  "Timothy", "Deborah",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
];

const HIERARCHY_NODES = [
  { id: demoId("gc"), name: "General Conference", tier: 1, parentId: null, timezone: "America/New_York", lat: 39.0437, lng: -77.1109 },

  { id: demoId("div-spd"), name: "South Pacific Division", tier: 2, parentId: demoId("gc"), timezone: "Australia/Sydney", lat: -33.8688, lng: 151.2093 },
  { id: demoId("div-iad"), name: "Inter-American Division", tier: 2, parentId: demoId("gc"), timezone: "America/Mexico_City", lat: 19.4326, lng: -99.1332 },
  { id: demoId("div-ted"), name: "Trans-European Division", tier: 2, parentId: demoId("gc"), timezone: "Europe/London", lat: 51.5074, lng: -0.1278 },

  { id: demoId("union-nsw"), name: "Australian Union Conference", tier: 3, parentId: demoId("div-spd"), timezone: "Australia/Sydney", lat: -33.8688, lng: 151.2093 },
  { id: demoId("union-nzp"), name: "New Zealand Pacific Union", tier: 3, parentId: demoId("div-spd"), timezone: "Pacific/Auckland", lat: -36.8485, lng: 174.7633 },
  { id: demoId("union-png"), name: "Papua New Guinea Union Mission", tier: 3, parentId: demoId("div-spd"), timezone: "Pacific/Port_Moresby", lat: -6.3147, lng: 143.9555 },
  { id: demoId("union-tpum"), name: "Trans Pacific Union Mission", tier: 3, parentId: demoId("div-spd"), timezone: "Pacific/Fiji", lat: -17.7134, lng: 178.0650 },
  { id: demoId("union-wpum"), name: "Western Pacific Union Mission", tier: 3, parentId: demoId("div-spd"), timezone: "Pacific/Guadalcanal", lat: -9.4438, lng: 160.0356 },

  { id: demoId("conf-gsc"), name: "Greater Sydney Conference", tier: 4, parentId: demoId("union-nsw"), timezone: "Australia/Sydney", lat: -33.8688, lng: 151.2093 },
  { id: demoId("conf-nnsw"), name: "North New South Wales Conference", tier: 4, parentId: demoId("union-nsw"), timezone: "Australia/Sydney", lat: -32.9267, lng: 151.7789 },
  { id: demoId("conf-sqld"), name: "South Queensland Conference", tier: 4, parentId: demoId("union-nsw"), timezone: "Australia/Brisbane", lat: -27.4698, lng: 153.0251 },
  { id: demoId("conf-vic"), name: "Victorian Conference", tier: 4, parentId: demoId("union-nsw"), timezone: "Australia/Melbourne", lat: -37.8136, lng: 144.9631 },
  { id: demoId("conf-nzn"), name: "North New Zealand Conference", tier: 4, parentId: demoId("union-nzp"), timezone: "Pacific/Auckland", lat: -36.8485, lng: 174.7633 },
  { id: demoId("conf-nzs"), name: "South New Zealand Conference", tier: 4, parentId: demoId("union-nzp"), timezone: "Pacific/Auckland", lat: -43.5321, lng: 172.6362 },
  { id: demoId("conf-ehi"), name: "Eastern Highlands Simbu Mission", tier: 4, parentId: demoId("union-png"), timezone: "Pacific/Port_Moresby", lat: -6.0000, lng: 145.0000 },
  { id: demoId("conf-cpm"), name: "Central Papua Mission", tier: 4, parentId: demoId("union-png"), timezone: "Pacific/Port_Moresby", lat: -8.5000, lng: 147.0000 },
  { id: demoId("conf-fiji"), name: "Fiji Mission", tier: 4, parentId: demoId("union-tpum"), timezone: "Pacific/Fiji", lat: -17.7134, lng: 178.0650 },
  { id: demoId("conf-samoa"), name: "Samoa-Tokelau Mission", tier: 4, parentId: demoId("union-tpum"), timezone: "Pacific/Apia", lat: -13.8333, lng: -171.7500 },
  { id: demoId("conf-sol"), name: "Solomon Islands Mission", tier: 4, parentId: demoId("union-wpum"), timezone: "Pacific/Guadalcanal", lat: -9.4438, lng: 160.0356 },
  { id: demoId("conf-van"), name: "Vanuatu Mission", tier: 4, parentId: demoId("union-wpum"), timezone: "Pacific/Efate", lat: -17.7334, lng: 168.3273 },

  { id: demoId("ch-wahroonga"), name: "Wahroonga SDA Church", tier: 7, parentId: demoId("conf-gsc"), timezone: "Australia/Sydney", lat: -33.7178, lng: 151.1130 },
  { id: demoId("ch-hornsby"), name: "Hornsby SDA Church", tier: 7, parentId: demoId("conf-gsc"), timezone: "Australia/Sydney", lat: -33.7044, lng: 151.0992 },
  { id: demoId("ch-parramatta"), name: "Parramatta SDA Church", tier: 7, parentId: demoId("conf-gsc"), timezone: "Australia/Sydney", lat: -33.8150, lng: 151.0012 },
  { id: demoId("ch-avondale"), name: "Avondale Memorial Church", tier: 7, parentId: demoId("conf-nnsw"), timezone: "Australia/Sydney", lat: -33.0688, lng: 151.4667 },
  { id: demoId("ch-cooranbong"), name: "Cooranbong SDA Church", tier: 7, parentId: demoId("conf-nnsw"), timezone: "Australia/Sydney", lat: -33.0754, lng: 151.4630 },
  { id: demoId("ch-brisbane-central"), name: "Brisbane Central SDA Church", tier: 7, parentId: demoId("conf-sqld"), timezone: "Australia/Brisbane", lat: -27.4694, lng: 153.0251 },
  { id: demoId("ch-goldcoast"), name: "Gold Coast SDA Church", tier: 7, parentId: demoId("conf-sqld"), timezone: "Australia/Brisbane", lat: -28.0167, lng: 153.4000 },
  { id: demoId("ch-nunawading"), name: "Nunawading SDA Church", tier: 7, parentId: demoId("conf-vic"), timezone: "Australia/Melbourne", lat: -37.8216, lng: 145.1753 },
  { id: demoId("ch-melbourne-central"), name: "Melbourne Central SDA Church", tier: 7, parentId: demoId("conf-vic"), timezone: "Australia/Melbourne", lat: -37.8136, lng: 144.9631 },
  { id: demoId("ch-auckland-central"), name: "Auckland Central SDA Church", tier: 7, parentId: demoId("conf-nzn"), timezone: "Pacific/Auckland", lat: -36.8485, lng: 174.7633 },
  { id: demoId("ch-hamilton"), name: "Hamilton SDA Church", tier: 7, parentId: demoId("conf-nzn"), timezone: "Pacific/Auckland", lat: -37.7870, lng: 175.2793 },
  { id: demoId("ch-christchurch"), name: "Christchurch SDA Church", tier: 7, parentId: demoId("conf-nzs"), timezone: "Pacific/Auckland", lat: -43.5321, lng: 172.6362 },
  { id: demoId("ch-dunedin"), name: "Dunedin SDA Church", tier: 7, parentId: demoId("conf-nzs"), timezone: "Pacific/Auckland", lat: -45.8788, lng: 170.5028 },
  { id: demoId("ch-goroka"), name: "Goroka SDA Church", tier: 7, parentId: demoId("conf-ehi"), timezone: "Pacific/Port_Moresby", lat: -6.0837, lng: 145.3868 },
  { id: demoId("ch-kundiawa"), name: "Kundiawa SDA Church", tier: 7, parentId: demoId("conf-ehi"), timezone: "Pacific/Port_Moresby", lat: -6.0167, lng: 144.9667 },
  { id: demoId("ch-port-moresby"), name: "Port Moresby Central SDA Church", tier: 7, parentId: demoId("conf-cpm"), timezone: "Pacific/Port_Moresby", lat: -9.4438, lng: 147.1803 },
  { id: demoId("ch-lae"), name: "Lae SDA Church", tier: 7, parentId: demoId("conf-cpm"), timezone: "Pacific/Port_Moresby", lat: -6.7340, lng: 147.0026 },
  { id: demoId("ch-suva"), name: "Suva SDA Church", tier: 7, parentId: demoId("conf-fiji"), timezone: "Pacific/Fiji", lat: -18.1416, lng: 178.4419 },
  { id: demoId("ch-nadi"), name: "Nadi SDA Church", tier: 7, parentId: demoId("conf-fiji"), timezone: "Pacific/Fiji", lat: -17.7765, lng: 177.9443 },
  { id: demoId("ch-apia"), name: "Apia Central SDA Church", tier: 7, parentId: demoId("conf-samoa"), timezone: "Pacific/Apia", lat: -13.8333, lng: -171.7500 },
  { id: demoId("ch-honiara"), name: "Honiara Central SDA Church", tier: 7, parentId: demoId("conf-sol"), timezone: "Pacific/Guadalcanal", lat: -9.4438, lng: 160.0356 },
  { id: demoId("ch-gizo"), name: "Gizo SDA Church", tier: 7, parentId: demoId("conf-sol"), timezone: "Pacific/Guadalcanal", lat: -8.1000, lng: 156.8500 },
  { id: demoId("ch-port-vila"), name: "Port Vila SDA Church", tier: 7, parentId: demoId("conf-van"), timezone: "Pacific/Efate", lat: -17.7334, lng: 168.3273 },
  { id: demoId("ch-luganville"), name: "Luganville SDA Church", tier: 7, parentId: demoId("conf-van"), timezone: "Pacific/Efate", lat: -15.5186, lng: 167.1764 },
];

const CHURCH_IDS = HIERARCHY_NODES.filter(n => n.tier === 7).map(n => n.id);
const CONFERENCE_IDS = HIERARCHY_NODES.filter(n => n.tier === 4).map(n => n.id);

function buildPath(nodeId: string): string {
  const parts: string[] = [];
  let current = HIERARCHY_NODES.find(n => n.id === nodeId);
  while (current) {
    parts.unshift(current.id);
    current = current.parentId ? HIERARCHY_NODES.find(n => n.id === current!.parentId) : undefined;
  }
  return "/" + parts.join("/");
}

function generateDemoUsers(count: number): Array<{
  id: string;
  username: string;
  password: string;
  displayName: string;
  email: string;
  role: string;
  ageGroup: string;
  hierarchyNodeId: string;
}> {
  const result = [];
  for (let i = 1; i <= count; i++) {
    const num = String(i).padStart(3, "0");
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const churchId = CHURCH_IDS[i % CHURCH_IDS.length];
    result.push({
      id: demoId(`user-${num}`),
      username: `demo.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${num}`,
      password: "$2b$10$demohashedpasswordplaceholdervalue000000000000000000",
      displayName: `${firstName} ${lastName}`,
      email: `demo-user-${num}${DEMO_EMAIL_DOMAIN}`,
      role: "member",
      ageGroup: randomPick(AGE_GROUPS),
      hierarchyNodeId: churchId,
    });
  }
  return result;
}

const PASTORAL_ALERT_CONFIGS = [
  { churchIdx: 0, alertType: "disengagement", topic: "grief", severity: "HIGH", memberCount: 3 },
  { churchIdx: 2, alertType: "sensitive_spike", topic: "depression", severity: "MODERATE", memberCount: 5 },
  { churchIdx: 5, alertType: "disengagement", topic: "doubt", severity: "HIGH", memberCount: 2 },
  { churchIdx: 8, alertType: "sensitive_spike", topic: "anxiety", severity: "MODERATE", memberCount: 4 },
  { churchIdx: 12, alertType: "disengagement", topic: "loneliness", severity: "HIGH", memberCount: 3 },
  { churchIdx: 15, alertType: "sensitive_spike", topic: "addiction", severity: "MODERATE", memberCount: 2 },
  { churchIdx: 20, alertType: "congregational", topic: "fear", severity: "MODERATE", memberCount: 6 },
  { churchIdx: 25, alertType: "congregational", topic: "suffering", severity: "HIGH", memberCount: 4 },
];

export async function seedDemoData(): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
  const counts: Record<string, number> = {};

  try {
    const existing = await db.select({ id: churchHierarchy.id })
      .from(churchHierarchy)
      .where(like(churchHierarchy.id, "demo-%"))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, message: "Demo data already exists. Clear it first.", counts: {} };
    }

    console.log("[DemoSeed] Creating hierarchy nodes...");
    for (const node of HIERARCHY_NODES) {
      await db.insert(churchHierarchy).values({
        id: node.id,
        name: node.name,
        tier: node.tier,
        parentId: node.parentId,
        path: buildPath(node.id),
        timezone: node.timezone,
        latitude: node.lat,
        longitude: node.lng,
      });
    }
    counts.hierarchy_nodes = HIERARCHY_NODES.length;

    console.log("[DemoSeed] Creating 200 demo users...");
    const demoUsers = generateDemoUsers(200);
    const BATCH = 25;
    for (let i = 0; i < demoUsers.length; i += BATCH) {
      await db.insert(users).values(demoUsers.slice(i, i + BATCH));
    }
    counts.users = demoUsers.length;

    console.log("[DemoSeed] Creating hierarchy memberships...");
    const memberships = demoUsers.map(u => ({
      id: demoId(`hm-${u.id.replace("demo-", "")}`),
      userId: u.id,
      hierarchyNodeId: u.hierarchyNodeId,
      role: "member" as const,
      isPrimary: true,
    }));
    for (let i = 0; i < memberships.length; i += BATCH) {
      await db.insert(hierarchyMembership).values(memberships.slice(i, i + BATCH));
    }
    counts.memberships = memberships.length;

    console.log("[DemoSeed] Creating reading streaks...");
    const streaks = demoUsers.map(u => ({
      id: demoId(`streak-${u.id.replace("demo-", "")}`),
      userId: u.id,
      currentStreak: randomInt(3, 45),
      longestStreak: randomInt(15, 90),
      lastReadDate: formatDate(dateMinusDays(randomInt(0, 3))),
    }));
    for (let i = 0; i < streaks.length; i += BATCH) {
      await db.insert(readingStreaks).values(streaks.slice(i, i + BATCH));
    }
    counts.reading_streaks = streaks.length;

    console.log("[DemoSeed] Creating topic engagement events...");
    let engagementCount = 0;
    const engagementBatch: any[] = [];

    for (const user of demoUsers) {
      const topicCount = randomInt(8, 20);
      const selectedTopics = [...TOPIC_IDS].sort(() => Math.random() - 0.5).slice(0, topicCount);

      for (const topic of selectedTopics) {
        const eventsForTopic = randomInt(1, 5);
        for (let e = 0; e < eventsForTopic; e++) {
          const daysAgo = randomInt(0, 89);
          const topicType = randomPick([...TOPIC_TYPES]);
          engagementBatch.push({
            id: demoId(`te-${user.id.replace("demo-", "")}-${topic}-${e}`),
            userId: user.id,
            topic,
            topicType,
            contentId: `${topic}-content-${randomInt(1, 5)}`,
            durationSec: randomInt(30, 1200),
            isSensitive: ["depression", "addiction", "grief", "anxiety", "loneliness", "doubt"].includes(topic),
            hierarchyNodeId: user.hierarchyNodeId,
            createdAt: dateMinusDays(daysAgo),
          });
          engagementCount++;
        }
      }
    }
    for (let i = 0; i < engagementBatch.length; i += BATCH) {
      await db.insert(topicEngagement).values(engagementBatch.slice(i, i + BATCH));
    }
    counts.topic_engagement = engagementCount;

    console.log("[DemoSeed] Creating daily engagement rollups...");
    let dailyCount = 0;
    const dailyBatch: any[] = [];

    for (const churchId of CHURCH_IDS) {
      const churchUsers = demoUsers.filter(u => u.hierarchyNodeId === churchId);
      for (let daysAgo = 0; daysAgo < 90; daysAgo += 1) {
        const date = formatDate(dateMinusDays(daysAgo));
        const topicCount = randomInt(3, 8);
        const selectedTopics = [...TOPIC_IDS].sort(() => Math.random() - 0.5).slice(0, topicCount);

        for (const topic of selectedTopics) {
          const topicType = randomPick([...TOPIC_TYPES]);
          const uniqueUsers = randomInt(1, Math.min(churchUsers.length, 8));
          dailyBatch.push({
            id: demoId(`ted-${churchId.replace("demo-", "")}-${date}-${topic}`),
            hierarchyNodeId: churchId,
            topic,
            topicType,
            date,
            totalViews: randomInt(uniqueUsers, uniqueUsers * 4),
            totalDurationSec: randomInt(uniqueUsers * 60, uniqueUsers * 600),
            uniqueUsers,
            ageGroupBreakdown: Object.fromEntries(
              AGE_GROUPS.slice(0, randomInt(2, 5)).map(g => [g, randomInt(1, 3)])
            ),
          });
          dailyCount++;
        }
      }
    }
    for (let i = 0; i < dailyBatch.length; i += BATCH) {
      await db.insert(topicEngagementDaily).values(dailyBatch.slice(i, i + BATCH));
    }
    counts.topic_engagement_daily = dailyCount;

    console.log("[DemoSeed] Creating topic trends...");
    let trendCount = 0;
    const trendBatch: any[] = [];
    const thisWeekStart = getWeekStart(new Date());

    for (const churchId of CHURCH_IDS) {
      const trendTopics = [...TOPIC_IDS].sort(() => Math.random() - 0.5).slice(0, 10);
      for (const topic of trendTopics) {
        const topicType = randomPick([...TOPIC_TYPES]);
        const currentViews = randomInt(5, 50);
        const prevViews = randomInt(3, 45);
        const pct = prevViews > 0 ? Math.round(((currentViews - prevViews) / prevViews) * 100) : 100;
        trendBatch.push({
          id: demoId(`tt-${churchId.replace("demo-", "")}-${topic}`),
          hierarchyNodeId: churchId,
          topic,
          topicType,
          currentWeekViews: currentViews,
          previousWeekViews: prevViews,
          trendPercent: pct,
          trendDirection: pct > 10 ? "rising" : pct < -10 ? "falling" : "stable",
          avgCompletionRate: randomFloat(0.3, 0.95),
          topAgeGroup: randomPick(AGE_GROUPS),
          topAgeGroupCount: randomInt(3, 15),
          weekStartDate: thisWeekStart,
        });
        trendCount++;
      }
    }
    for (let i = 0; i < trendBatch.length; i += BATCH) {
      await db.insert(topicTrend).values(trendBatch.slice(i, i + BATCH));
    }
    counts.topic_trends = trendCount;

    console.log("[DemoSeed] Creating activity pattern tiles...");
    let patternCount = 0;
    const patternBatch: any[] = [];

    for (const churchId of CHURCH_IDS) {
      for (let day = 0; day < 7; day++) {
        for (let block = 0; block < 24; block++) {
          const isSabbath = day === 6;
          const isMorning = block >= 5 && block <= 8;
          const isEvening = block >= 18 && block <= 21;
          const isSabbathMorning = isSabbath && block >= 9 && block <= 12;

          let baseScore = randomInt(0, 15);
          if (isMorning) baseScore += randomInt(10, 25);
          if (isEvening) baseScore += randomInt(5, 20);
          if (isSabbathMorning) baseScore += randomInt(30, 60);
          if (block >= 0 && block <= 4) baseScore = randomInt(0, 5);

          patternBatch.push({
            id: demoId(`apt-${churchId.replace("demo-", "")}-${day}-${block}`),
            hierarchyNodeId: churchId,
            dayOfWeek: day,
            timeBlock: block,
            engagementCount: randomInt(0, baseScore),
            engagementScore: baseScore,
            timeRange: "month",
          });
          patternCount++;
        }
      }
    }
    for (let i = 0; i < patternBatch.length; i += 50) {
      await db.insert(activityPatternTile).values(patternBatch.slice(i, i + 50));
    }
    counts.activity_pattern_tiles = patternCount;

    console.log("[DemoSeed] Creating heatmap tiles...");
    let heatmapCount = 0;
    const heatmapBatch: any[] = [];

    for (const node of HIERARCHY_NODES.filter(n => n.tier === 7)) {
      const jitterLat = randomFloat(-0.05, 0.05);
      const jitterLng = randomFloat(-0.05, 0.05);
      heatmapBatch.push({
        id: demoId(`ht-${node.id.replace("demo-", "")}`),
        hierarchyNodeId: node.id,
        latitude: node.lat + jitterLat,
        longitude: node.lng + jitterLng,
        engagementCount: randomInt(50, 500),
        engagementScore: randomInt(20, 95),
        regionKey: node.name.split(" ")[0].toLowerCase(),
        regionLevel: "city",
        timeRange: "month",
        userCount: randomInt(5, 25),
      });
      heatmapCount++;
    }
    for (let i = 0; i < heatmapBatch.length; i += BATCH) {
      await db.insert(heatmapTile).values(heatmapBatch.slice(i, i + BATCH));
    }
    counts.heatmap_tiles = heatmapCount;

    console.log("[DemoSeed] Creating pastoral care alerts...");
    const alertBatch: any[] = [];
    for (const config of PASTORAL_ALERT_CONFIGS) {
      const churchId = CHURCH_IDS[config.churchIdx % CHURCH_IDS.length];
      const churchUsers = demoUsers.filter(u => u.hierarchyNodeId === churchId);
      const optedIn = churchUsers.slice(0, Math.min(config.memberCount, churchUsers.length)).map(u => ({
        userId: u.id,
        displayName: u.displayName,
      }));

      alertBatch.push({
        id: demoId(`pca-${config.churchIdx}-${config.topic}`),
        hierarchyNodeId: churchId,
        alertType: config.alertType,
        severity: config.severity,
        topic: config.topic,
        memberCount: config.memberCount,
        optedInMembers: optedIn,
        isReviewed: false,
        weekStartDate: thisWeekStart,
      });
    }
    await db.insert(pastoralCareAlert).values(alertBatch);
    counts.pastoral_care_alerts = alertBatch.length;

    console.log("[DemoSeed] Creating analytics cache entries...");
    let cacheCount = 0;
    const cacheBatch: any[] = [];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const currentWeekStart = new Date(
      Date.now() - new Date().getDay() * 86400000
    ).toISOString().split("T")[0];
    const previousWeekStart = new Date(
      new Date(currentWeekStart).getTime() - 7 * 86400000
    ).toISOString().split("T")[0];
    const twoWeeksAgoStart = new Date(
      new Date(currentWeekStart).getTime() - 14 * 86400000
    ).toISOString().split("T")[0];
    const cacheTimeRanges = [currentWeekStart, previousWeekStart, twoWeeksAgoStart];

    for (const nodeId of [
      demoId("gc"),
      demoId("div-spd"),
      demoId("div-iad"),
      demoId("div-ted"),
      demoId("union-nsw"),
      demoId("union-nzp"),
      demoId("union-png"),
      demoId("union-tpum"),
      demoId("union-wpum"),
      ...CONFERENCE_IDS,
      ...CHURCH_IDS,
    ]) {
      const isDivision = nodeId.startsWith("demo-div-");
      const isUnion = nodeId.startsWith("demo-union-");
      const isConference = nodeId.startsWith("demo-conf-");
      const isChurch = nodeId.startsWith("demo-ch-");

      const activeUsers = isDivision
        ? randomInt(800, 1200)
        : isUnion
          ? randomInt(300, 600)
          : isConference
            ? randomInt(120, 260)
            : isChurch
              ? randomInt(25, 90)
              : randomInt(1500, 2500);

      const totalEngagements = isDivision
        ? randomInt(3000, 5000)
        : isUnion
          ? randomInt(1000, 2000)
          : isConference
            ? randomInt(500, 1400)
            : isChurch
              ? randomInt(150, 700)
              : randomInt(6000, 12000);

      const bibleReadingSessions = isDivision
        ? randomInt(400, 600)
        : isUnion
          ? randomInt(180, 320)
          : isConference
            ? randomInt(90, 220)
            : isChurch
              ? randomInt(20, 90)
              : randomInt(700, 1200);

      const plansCompleted = isDivision
        ? randomInt(80, 120)
        : isUnion
          ? randomInt(35, 80)
          : isConference
            ? randomInt(20, 60)
            : isChurch
              ? randomInt(5, 25)
              : randomInt(140, 220);

      const videosWatched = isDivision
        ? randomInt(200, 350)
        : isUnion
          ? randomInt(90, 180)
          : isConference
            ? randomInt(50, 130)
            : isChurch
              ? randomInt(10, 55)
              : randomInt(350, 600);

      const studySessions = isDivision
        ? randomInt(150, 250)
        : isUnion
          ? randomInt(70, 140)
          : isConference
            ? randomInt(45, 110)
            : isChurch
              ? randomInt(10, 50)
              : randomInt(280, 480);

      const totalDurationSec = totalEngagements * randomInt(120, 240);
      const prayerRequests = Math.max(
        0,
        Math.round(activeUsers * randomFloat(0.03, 0.12))
      );

      for (const tr of cacheTimeRanges) {
        cacheBatch.push({
          id: demoId(`ac-${nodeId.replace("demo-", "")}-${tr}`),
          hierarchyNodeId: nodeId,
          cacheType: "dashboard",
          timeRange: tr,
          data: {
            active_users: activeUsers,
            total_engagements: totalEngagements,
            total_duration_sec: totalDurationSec,
            bible_reading_sessions: bibleReadingSessions,
            plans_completed: plansCompleted,
            videos_watched: videosWatched,
            study_sessions: studySessions,
            prayer_requests: prayerRequests,
            new_members: randomInt(0, Math.max(1, Math.floor(activeUsers * 0.02))),
            top_topics: [],
            age_segments: {},
          },
          expiresAt,
        });
        cacheCount++;
      }
    }
    for (let i = 0; i < cacheBatch.length; i += BATCH) {
      await db.insert(analyticsCache).values(cacheBatch.slice(i, i + BATCH));
    }
    counts.analytics_cache = cacheCount;

    console.log("[DemoSeed] Demo data seeded successfully!");
    return {
      success: true,
      message: `Demo data seeded: ${HIERARCHY_NODES.length} nodes, ${demoUsers.length} users, ${engagementCount} engagement events, ${alertBatch.length} alerts`,
      counts,
    };
  } catch (err: any) {
    console.error("[DemoSeed] Error:", err);
    return { success: false, message: `Seed failed: ${err.message}`, counts };
  }
}

export async function clearDemoData(): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
  const counts: Record<string, number> = {};

  try {
    console.log("[DemoSeed] Clearing demo data...");

    const demoUserRows = await db.select({ id: users.id })
      .from(users)
      .where(like(users.email, `%${DEMO_EMAIL_DOMAIN}`));
    const demoUserIds = demoUserRows.map(r => r.id);
    counts.demo_users_found = demoUserIds.length;

    if (demoUserIds.length > 0) {
      const idList = demoUserIds.map(id => `'${id}'`).join(",");

      await db.execute(sql.raw(`DELETE FROM topic_engagement WHERE user_id IN (${idList})`));
      await db.execute(sql.raw(`DELETE FROM reading_streak WHERE user_id IN (${idList})`));
      await db.execute(sql.raw(`DELETE FROM hierarchy_membership WHERE user_id IN (${idList})`));

      const BATCH = 50;
      for (let i = 0; i < demoUserIds.length; i += BATCH) {
        const batch = demoUserIds.slice(i, i + BATCH);
        const batchList = batch.map(id => `'${id}'`).join(",");
        await db.execute(sql.raw(`DELETE FROM users WHERE id IN (${batchList})`));
      }
      counts.users_deleted = demoUserIds.length;
    }

    const delTed = await db.execute(sql.raw(`DELETE FROM topic_engagement_daily WHERE hierarchy_node_id LIKE 'demo-%'`));
    counts.topic_engagement_daily_deleted = (delTed as any).rowCount ?? 0;

    const delTt = await db.execute(sql.raw(`DELETE FROM topic_trend WHERE hierarchy_node_id LIKE 'demo-%'`));
    counts.topic_trends_deleted = (delTt as any).rowCount ?? 0;

    const delPca = await db.execute(sql.raw(`DELETE FROM pastoral_care_alert WHERE hierarchy_node_id LIKE 'demo-%'`));
    counts.pastoral_alerts_deleted = (delPca as any).rowCount ?? 0;

    const delApt = await db.execute(sql.raw(`DELETE FROM activity_pattern_tile WHERE hierarchy_node_id LIKE 'demo-%'`));
    counts.activity_patterns_deleted = (delApt as any).rowCount ?? 0;

    const delHt = await db.execute(sql.raw(`DELETE FROM heatmap_tile WHERE hierarchy_node_id LIKE 'demo-%'`));
    counts.heatmap_tiles_deleted = (delHt as any).rowCount ?? 0;

    const delAc = await db.execute(sql.raw(`DELETE FROM analytics_cache WHERE hierarchy_node_id LIKE 'demo-%'`));
    counts.analytics_cache_deleted = (delAc as any).rowCount ?? 0;

    const delCh = await db.execute(sql.raw(`DELETE FROM church_hierarchy WHERE id LIKE 'demo-%'`));
    counts.hierarchy_nodes_deleted = (delCh as any).rowCount ?? 0;

    console.log("[DemoSeed] Demo data cleared successfully!");
    return {
      success: true,
      message: "All demo data cleared",
      counts,
    };
  } catch (err: any) {
    console.error("[DemoSeed] Clear error:", err);
    return { success: false, message: `Clear failed: ${err.message}`, counts };
  }
}

export async function isDemoDataLoaded(): Promise<boolean> {
  const result = await db.select({ id: churchHierarchy.id })
    .from(churchHierarchy)
    .where(like(churchHierarchy.id, "demo-%"))
    .limit(1);
  return result.length > 0;
}
