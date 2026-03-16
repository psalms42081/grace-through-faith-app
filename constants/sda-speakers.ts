export interface FeaturedVideo {
  id: string;
  title: string;
}

export interface SDASpeaker {
  id: string;
  name: string;
  ministry: string;
  bio: string;
  topics: string[];
  color: string;
  youtubeChannelId: string;
  featuredVideos: FeaturedVideo[];
}

const SPEAKER_IMAGES: Record<string, any> = {
  "doug-batchelor": require("@/assets/speakers/doug-batchelor.jpg"),
  "john-lomacang": require("@/assets/speakers/john-lomacang.jpg"),
  "david-asscherick": require("@/assets/speakers/david-asscherick.jpg"),
  "ivor-myers": require("@/assets/speakers/ivor-myers.jpg"),
  "randy-skeete": require("@/assets/speakers/randy-skeete.png"),
  "ca-murray": require("@/assets/speakers/ca-murray.jpg"),
  "wes-peppers": require("@/assets/speakers/wes-peppers.jpg"),
  "elizabeth-talbot": require("@/assets/speakers/elizabeth-talbot.jpg"),
  "shawn-boonstra": require("@/assets/speakers/shawn-boonstra.jpg"),
  "mark-finley": require("@/assets/speakers/mark-finley.jpg"),
  "john-bradshaw": require("@/assets/speakers/john-bradshaw.jpg"),
  "stephen-bohr": require("@/assets/speakers/stephen-bohr.png"),
  "carlton-byrd": require("@/assets/speakers/carlton-byrd.png"),
  "taj-pacleb": require("@/assets/speakers/taj-pacleb.webp"),
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
    topics: ["Prophecy", "Evangelism", "Revelation", "Daniel", "Three Angels", "Health"],
    color: "#27AE60",
    youtubeChannelId: "UCEJi8oj_u3bEGgqeonhzr5Q",
    featuredVideos: [
      { id: "jrQs0yBOVDI", title: "Power for Persevering Patience" },
      { id: "dzyMS5eu6pc", title: "The Mystery of the Trinity" },
      { id: "y-7bAJbtZ60", title: "Bible Answers Live" },
    ],
  },
  {
    id: "john-lomacang",
    name: "John Lomacang",
    ministry: "3ABN",
    bio: "Pastor, singer, and Bible teacher at Three Angels Broadcasting Network, blending music ministry with powerful preaching.",
    topics: ["Worship", "Preaching", "Music Ministry"],
    color: "#1ABC9C",
    youtubeChannelId: "UC2oGtEVKfqECfNbUq4eFgsQ",
    featuredVideos: [
      { id: "7qCWkoksGNw", title: "The Power of Deception" },
      { id: "CeNDYBA36n0", title: "Deepen Your Relationship With God Through Prayer" },
    ],
  },
  {
    id: "david-asscherick",
    name: "David Asscherick",
    ministry: "ARISE Institute",
    bio: "Former punk musician turned evangelist, co-founder of ARISE, known for clear, compelling presentations on prophecy and apologetics.",
    topics: ["Prophecy", "Apologetics", "Daniel", "Revelation", "Three Angels"],
    color: "#2980B9",
    youtubeChannelId: "UC-7c_7El1xpPmWlVceyBcpw",
    featuredVideos: [
      { id: "3hzqSMqb4Pw", title: "You Can Understand Bible Prophecy" },
      { id: "5KPcUtPeWU0", title: "Personal Testimony" },
    ],
  },
  {
    id: "ivor-myers",
    name: "Ivor Myers",
    ministry: "Power of the Lamb",
    bio: "Former hip-hop artist turned pastor and evangelist, founder of Power of the Lamb Ministries, specializing in Revelation's prophecies.",
    topics: ["Revelation", "Youth Ministry", "Urban Evangelism", "Three Angels"],
    color: "#8E44AD",
    youtubeChannelId: "UCIeLxYak5fb5Cqe1P0KGqQg",
    featuredVideos: [
      { id: "5LpSFnbSJCE", title: "Is 1844 Really Biblical? The Truth on Daniel 8:14" },
      { id: "52xNFap3uAQ", title: "Back to Basics: The Deadly Wound Healed?" },
    ],
  },
  {
    id: "randy-skeete",
    name: "Randy Skeete",
    ministry: "Evangelist",
    bio: "International evangelist known for deep, methodical Bible exposition and powerful revival preaching.",
    topics: ["Bible Study", "Revival", "Righteousness by Faith"],
    color: "#D35400",
    youtubeChannelId: "UCZw0F_VXflZ3BwWfnhj9CPA",
    featuredVideos: [
      { id: "0YnA9cOtru8", title: "Do Not Marry!" },
      { id: "3BzogVmkC9k", title: "Resolutions - Advice for the New Year" },
    ],
  },
  {
    id: "ca-murray",
    name: "C.A. Murray",
    ministry: "3ABN",
    bio: "Senior pastor and 3ABN presenter, known for warm, insightful expository preaching and pastoral wisdom.",
    topics: ["Preaching", "Pastoral", "Faith"],
    color: "#2C3E50",
    youtubeChannelId: "UC2oGtEVKfqECfNbUq4eFgsQ",
    featuredVideos: [
      { id: "7oyOLBtCLsM", title: "Thoughts on My Bed, Visions in My Head - Daniel" },
      { id: "AdoKEaCgCdY", title: "Jesus, The Way Out" },
    ],
  },
  {
    id: "wes-peppers",
    name: "Wes Peppers",
    ministry: "Evangelist",
    bio: "Young evangelist and pastor focused on prophecy seminars and reaching the next generation for Christ.",
    topics: ["Prophecy", "Youth", "Evangelism"],
    color: "#16A085",
    youtubeChannelId: "UCLx1AuFKbSCJDfXb_3s6OsA",
    featuredVideos: [
      { id: "1T-CLqTbiX4", title: "Overcoming Through Surrendering" },
      { id: "3lwv8R-d_e0", title: "Competitive Christianity" },
    ],
  },
  {
    id: "elizabeth-talbot",
    name: "Elizabeth Talbot",
    ministry: "Voice of Prophecy",
    bio: "Speaker and director for Voice of Prophecy, known for warm, scholarly presentations on theology and devotional topics.",
    topics: ["Devotional", "Theology", "Women's Ministry"],
    color: "#C0392B",
    youtubeChannelId: "UCbRq0CsBuFj63M-VdAPlKEQ",
    featuredVideos: [
      { id: "3RklNWWRx5w", title: "After God's Heart: Chosen" },
      { id: "6BFhRPDhXmQ", title: "The Lord is My Light" },
    ],
  },
  {
    id: "shawn-boonstra",
    name: "Shawn Boonstra",
    ministry: "Voice of Prophecy",
    bio: "Speaker and director of Voice of Prophecy, addressing culture, prophecy, and current events through a biblical lens.",
    topics: ["Prophecy", "Culture", "Current Events"],
    color: "#E67E22",
    youtubeChannelId: "UCbRq0CsBuFj63M-VdAPlKEQ",
    featuredVideos: [
      { id: "4VhSNcvRglY", title: "How Infinity and God Work Together" },
      { id: "8VJBU6OtK4Q", title: "How Science May Be Proving We're Special" },
    ],
  },
  {
    id: "mark-finley",
    name: "Mark Finley",
    ministry: "It Is Written",
    bio: "Former speaker/director of It Is Written, one of the most experienced evangelists in SDA history with decades of global campaigns.",
    topics: ["Evangelism", "Health", "Prophecy", "Three Angels"],
    color: "#1565C0",
    youtubeChannelId: "UCAvh27iVZQ_23kEYV2P4C1g",
    featuredVideos: [
      { id: "2aWQb_9u3Q0", title: "Exact Proof the Bible is Accurate Using Time Prophecy" },
      { id: "aPtsBMusM34", title: "Getting Through Life's Toughest Times" },
    ],
  },
  {
    id: "john-bradshaw",
    name: "John Bradshaw",
    ministry: "It Is Written",
    bio: "Current speaker and director of It Is Written, bringing Bible truth to millions through television, media, and live events.",
    topics: ["Devotional", "Outreach", "Bible Study"],
    color: "#0D47A1",
    youtubeChannelId: "UCAvh27iVZQ_23kEYV2P4C1g",
    featuredVideos: [
      { id: "386ld_V5g64", title: "The Truth About the Investigative Judgment" },
      { id: "6DTJwMiRxHM", title: "Then God Changed Everything" },
    ],
  },
  {
    id: "stephen-bohr",
    name: "Stephen Bohr",
    ministry: "Secrets Unsealed",
    bio: "Pastor and founder of Secrets Unsealed, specializing in deep verse-by-verse study of Daniel, Revelation, and sanctuary theology.",
    topics: ["Daniel", "Revelation", "Sanctuary", "Prophecy", "Three Angels"],
    color: "#1A237E",
    youtubeChannelId: "UCiAQVG0W3HkQwBGvGiS14kg",
    featuredVideos: [
      { id: "67dqMEwAo4M", title: "Decoding the Mysteries of Daniel 11" },
      { id: "4e6Bcq1g5N0", title: "Lambs Among Wolves" },
    ],
  },
  {
    id: "carlton-byrd",
    name: "Carlton Byrd",
    ministry: "Breath of Life",
    bio: "Speaker and director of Breath of Life Television Ministries, known for passionate, Spirit-filled preaching.",
    topics: ["Preaching", "Revival", "Faith"],
    color: "#6A1B9A",
    youtubeChannelId: "UCUsCnzlCTMfwLn5GRKIyB6A",
    featuredVideos: [
      { id: "77xTENXV8TA", title: "John Saw You" },
      { id: "1HmUm6pm2FY", title: "There is Power in the Name" },
    ],
  },
  {
    id: "taj-pacleb",
    name: "Taj Pacleb",
    ministry: "Revelation of Hope",
    bio: "Young evangelist and founder of Revelation of Hope Ministries, known for energetic prophecy-focused evangelism targeting youth.",
    topics: ["Youth Evangelism", "Prophecy", "Revelation", "Three Angels"],
    color: "#F57C00",
    youtubeChannelId: "UC3_5kVLUUB7NrV-NnPLzFJg",
    featuredVideos: [
      { id: "5nZRgZoczR4", title: "The Deeper Message of Hawaii's Green Sands Beach" },
      { id: "755UmHcJrkQ", title: "Walking the Narrow Way to Eternal Joy" },
    ],
  },
];

export const SERMON_TOPICS = [
  "All",
  "Prophecy",
  "Revelation",
  "Daniel",
  "Three Angels",
  "Health",
  "Evangelism",
  "Devotional",
  "Bible Study",
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
