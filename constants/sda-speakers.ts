export interface SDASpeaker {
  id: string;
  name: string;
  ministry: string;
  bio: string;
  topics: string[];
  color: string;
  youtubeChannelId: string;
  featuredVideoIds: string[];
}

const SPEAKER_IMAGES: Record<string, any> = {
  "doug-batchelor": require("@/assets/speakers/doug-batchelor.png"),
  "john-lomacang": require("@/assets/speakers/john-lomacang.png"),
  "david-asscherick": require("@/assets/speakers/david-asscherick.png"),
  "ivor-myers": require("@/assets/speakers/ivor-myers.png"),
  "randy-skeete": require("@/assets/speakers/randy-skeete.png"),
  "ca-murray": require("@/assets/speakers/ca-murray.png"),
  "wes-peppers": require("@/assets/speakers/wes-peppers.png"),
  "elizabeth-talbot": require("@/assets/speakers/elizabeth-talbot.png"),
  "shawn-boonstra": require("@/assets/speakers/shawn-boonstra.png"),
  "mark-finley": require("@/assets/speakers/mark-finley.png"),
  "john-bradshaw": require("@/assets/speakers/john-bradshaw.png"),
  "walter-veith": require("@/assets/speakers/walter-veith.png"),
  "stephen-bohr": require("@/assets/speakers/stephen-bohr.png"),
  "carlton-byrd": require("@/assets/speakers/carlton-byrd.png"),
  "taj-pacleb": require("@/assets/speakers/taj-pacleb.png"),
};

export function getSpeakerImage(id: string): any | undefined {
  return SPEAKER_IMAGES[id];
}

export interface SermonVideo {
  id: string;
  title: string;
  speakerId: string;
  youtubeVideoId: string;
  topic: string;
  duration?: string;
}

export const SDA_SPEAKERS: SDASpeaker[] = [
  {
    id: "doug-batchelor",
    name: "Doug Batchelor",
    ministry: "Amazing Facts",
    bio: "Evangelist and president of Amazing Facts International, known for dynamic prophecy seminars and Bible teaching.",
    topics: ["Prophecy", "Evangelism", "Revelation", "Daniel"],
    color: "#27AE60",
    youtubeChannelId: "UCEJi8oj_u3bEGgqeonhzr5Q",
    featuredVideoIds: ["xRDHv1CeDOk", "5m7kRLtCq8Q", "J7jwGZc1htA"],
  },
  {
    id: "john-lomacang",
    name: "John Lomacang",
    ministry: "3ABN",
    bio: "Pastor, singer, and Bible teacher at Three Angels Broadcasting Network, blending music ministry with powerful preaching.",
    topics: ["Worship", "Preaching", "Music Ministry"],
    color: "#1ABC9C",
    youtubeChannelId: "UC2oGtEVKfqECfNbUq4eFgsQ",
    featuredVideoIds: ["kJZ-YqHV6KE", "VwGOjNJE3TY"],
  },
  {
    id: "david-asscherick",
    name: "David Asscherick",
    ministry: "ARISE Institute",
    bio: "Former punk musician turned evangelist, co-founder of ARISE, known for clear, compelling presentations on prophecy and apologetics.",
    topics: ["Prophecy", "Apologetics", "Daniel", "Revelation"],
    color: "#2980B9",
    youtubeChannelId: "UC-7c_7El1xpPmWlVceyBcpw",
    featuredVideoIds: ["mFmU1jYzuQE"],
  },
  {
    id: "ivor-myers",
    name: "Ivor Myers",
    ministry: "Power of the Lamb",
    bio: "Former hip-hop artist turned pastor and evangelist, founder of Power of the Lamb Ministries, specializing in Revelation's prophecies.",
    topics: ["Revelation", "Youth Ministry", "Urban Evangelism"],
    color: "#8E44AD",
    youtubeChannelId: "UCIeLxYak5fb5Cqe1P0KGqQg",
    featuredVideoIds: ["bKq9J-9v3k0"],
  },
  {
    id: "randy-skeete",
    name: "Randy Skeete",
    ministry: "Evangelist",
    bio: "International evangelist known for deep, methodical Bible exposition and powerful revival preaching.",
    topics: ["Bible Study", "Revival", "Righteousness by Faith"],
    color: "#D35400",
    youtubeChannelId: "UCZw0F_VXflZ3BwWfnhj9CPA",
    featuredVideoIds: [],
  },
  {
    id: "ca-murray",
    name: "C.A. Murray",
    ministry: "3ABN",
    bio: "Senior pastor and 3ABN presenter, known for warm, insightful expository preaching and pastoral wisdom.",
    topics: ["Preaching", "Pastoral", "Faith"],
    color: "#2C3E50",
    youtubeChannelId: "UC2oGtEVKfqECfNbUq4eFgsQ",
    featuredVideoIds: [],
  },
  {
    id: "wes-peppers",
    name: "Wes Peppers",
    ministry: "Evangelist",
    bio: "Young evangelist and pastor focused on prophecy seminars and reaching the next generation for Christ.",
    topics: ["Prophecy", "Youth", "Evangelism"],
    color: "#16A085",
    youtubeChannelId: "UCLx1AuFKbSCJDfXb_3s6OsA",
    featuredVideoIds: [],
  },
  {
    id: "elizabeth-talbot",
    name: "Elizabeth Talbot",
    ministry: "Voice of Prophecy",
    bio: "Speaker and director for Voice of Prophecy, known for warm, scholarly presentations on theology and devotional topics.",
    topics: ["Devotional", "Theology", "Women's Ministry"],
    color: "#C0392B",
    youtubeChannelId: "UCbRq0CsBuFj63M-VdAPlKEQ",
    featuredVideoIds: [],
  },
  {
    id: "shawn-boonstra",
    name: "Shawn Boonstra",
    ministry: "Voice of Prophecy",
    bio: "Speaker and director of Voice of Prophecy, addressing culture, prophecy, and current events through a biblical lens.",
    topics: ["Prophecy", "Culture", "Current Events"],
    color: "#E67E22",
    youtubeChannelId: "UCbRq0CsBuFj63M-VdAPlKEQ",
    featuredVideoIds: [],
  },
  {
    id: "mark-finley",
    name: "Mark Finley",
    ministry: "It Is Written",
    bio: "Former speaker/director of It Is Written, one of the most experienced evangelists in SDA history with decades of global campaigns.",
    topics: ["Evangelism", "Health", "Prophecy"],
    color: "#1565C0",
    youtubeChannelId: "UCAvh27iVZQ_23kEYV2P4C1g",
    featuredVideoIds: [],
  },
  {
    id: "john-bradshaw",
    name: "John Bradshaw",
    ministry: "It Is Written",
    bio: "Current speaker and director of It Is Written, bringing Bible truth to millions through television, media, and live events.",
    topics: ["Devotional", "Outreach", "Bible Study"],
    color: "#0D47A1",
    youtubeChannelId: "UCAvh27iVZQ_23kEYV2P4C1g",
    featuredVideoIds: [],
  },
  {
    id: "walter-veith",
    name: "Walter Veith",
    ministry: "Amazing Discoveries",
    bio: "Former zoology professor turned evangelist, known for in-depth prophecy and history presentations connecting Scripture to world events.",
    topics: ["Prophecy", "History", "Daniel", "Revelation"],
    color: "#4E342E",
    youtubeChannelId: "UC3kY2iRN0XQkBPWotpPkU4g",
    featuredVideoIds: [],
  },
  {
    id: "stephen-bohr",
    name: "Stephen Bohr",
    ministry: "Secrets Unsealed",
    bio: "Pastor and founder of Secrets Unsealed, specializing in deep verse-by-verse study of Daniel, Revelation, and sanctuary theology.",
    topics: ["Daniel", "Revelation", "Sanctuary", "Prophecy"],
    color: "#1A237E",
    youtubeChannelId: "UCiAQVG0W3HkQwBGvGiS14kg",
    featuredVideoIds: [],
  },
  {
    id: "carlton-byrd",
    name: "Carlton Byrd",
    ministry: "Breath of Life",
    bio: "Speaker and director of Breath of Life Television Ministries, known for passionate, Spirit-filled preaching.",
    topics: ["Preaching", "Revival", "Faith"],
    color: "#6A1B9A",
    youtubeChannelId: "UCUsCnzlCTMfwLn5GRKIyB6A",
    featuredVideoIds: [],
  },
  {
    id: "taj-pacleb",
    name: "Taj Pacleb",
    ministry: "Revelation of Hope",
    bio: "Young evangelist and founder of Revelation of Hope Ministries, known for energetic prophecy-focused evangelism targeting youth.",
    topics: ["Youth Evangelism", "Prophecy", "Revelation"],
    color: "#F57C00",
    youtubeChannelId: "UC3_5kVLUUB7NrV-NnPLzFJg",
    featuredVideoIds: [],
  },
];

export const SERMON_TOPICS = [
  "All",
  "Prophecy",
  "Revelation",
  "Daniel",
  "Evangelism",
  "Devotional",
  "Bible Study",
  "Health",
  "Youth",
  "Revival",
  "Sanctuary",
  "Sabbath",
  "Second Coming",
] as const;

export type SermonTopic = (typeof SERMON_TOPICS)[number];

export function getSpeakerById(id: string): SDASpeaker | undefined {
  return SDA_SPEAKERS.find((s) => s.id === id);
}

export function getSpeakersByTopic(topic: string): SDASpeaker[] {
  if (topic === "All") return SDA_SPEAKERS;
  return SDA_SPEAKERS.filter((s) => s.topics.some((t) => t.toLowerCase() === topic.toLowerCase()));
}
