export interface BibleProjectVideo {
  id: string;
  title: string;
  youtubeId: string;
  duration: string;
  durationMinutes?: number;
  allowEmbed?: boolean;
  description: string;
  series: string;
}

export interface TopicVideoMapping {
  topicId: string;
  videos: BibleProjectVideo[];
}

export const KNOWN_UNAVAILABLE_YOUTUBE_IDS = new Set([
  "p-dwZ8cPQ7c",
  "Lb4dOM4-FVM",
  "oMhesKPKQPo",
  "s3BXfvCjIkM",
  "XRRbkMa217I",
  "s-b_RbKvGAk",
  "R2ouoMFBBWk",
  "qAqBqxVGQYQ",
  "7wd_GU02Xtg",
  "OPV3qletNEE",
  "cBxOGLO0fco",
  "ry79gV_GJAU",
  "YZPZ3SppxeI",
  "oo8a9tBBX_Q",
  "z6cE06SIAOo",
  "ENGIKIXXhnc",
  "wRFBqo3tB8A",
  "xFHpMOB9jCE",
  "wGcFBfKz5yUQ",
  "kS_P1PpMkOE",
  "aafTwSz_rEk",
]);
export const BIBLE_PROJECT_VIDEOS: Record<string, BibleProjectVideo[]> = {
  abandonment: [],
  addiction: [
    {
      id: "bp-sin",
      title: "Sin",
      youtubeId: "aNOZ7ocLD74",
      duration: "5:48",
      description: "Trace the biblical concept of sin — missing the mark and its power to enslave.",
      series: "Biblical Themes",
    },
  ],
  anger: [
    {
      id: "bp-justice",
      title: "Justice",
      youtubeId: "A14THPoc4-4",
      duration: "5:48",
      description: "Biblical justice isn't about punishment — it's about making things right.",
      series: "Biblical Themes",
    },
  ],
  anxiety: [],
  forgiveness: [
    {
      id: "bp-atonement",
      title: "Atonement",
      youtubeId: "G_OlRWGLdnw",
      duration: "6:15",
      description: "How does atonement work? Explore the surprising biblical imagery of sacrifice and restoration.",
      series: "Biblical Themes",
    },
  ],
  grief: [],
  loneliness: [],
  purpose: [
    {
      id: "bp-image-of-god",
      title: "Image of God",
      youtubeId: "YbipxLDtY8c",
      duration: "5:44",
      description: "What does it mean to be made in God's image? Discover your identity and purpose.",
      series: "Biblical Themes",
    },
    {
      id: "bp-vocation",
      title: "The Book of Ecclesiastes",
      youtubeId: "lrsQ1tc-2wk",
      duration: "6:52",
      description: "Ecclesiastes wrestles with life's meaning and invites us to find purpose in God's gifts.",
      series: "Book Overview",
    },
  ],
  fear: [],
  marriage: [
    {
      id: "bp-song-of-songs",
      title: "Song of Songs",
      youtubeId: "4KC7xE4fgOw",
      duration: "6:46",
      description: "An overview of the Bible's celebration of romantic love and covenant faithfulness.",
      series: "Book Overview",
    },
  ],
  patience: [],
  temptation: [
    {
      id: "bp-sin-theme",
      title: "Sin",
      youtubeId: "aNOZ7ocLD74",
      duration: "5:48",
      description: "Understand the biblical portrait of sin as a crouching predator at the door.",
      series: "Biblical Themes",
    },
  ],
  suffering: [
    {
      id: "bp-job",
      title: "The Book of Job",
      youtubeId: "GswSg2ohqmA",
      duration: "8:05",
      description: "Job wrestles with the deepest question: why do the righteous suffer?",
      series: "Book Overview",
    },
  ],
  gratitude: [
    {
      id: "bp-psalms",
      title: "The Book of Psalms",
      youtubeId: "j9phNEaPrv8",
      duration: "9:15",
      description: "The Psalms are the prayer book of the Bible — including powerful songs of thanksgiving.",
      series: "Book Overview",
    },
    {
      id: "bp-generosity",
      title: "Generosity",
      youtubeId: "62CliEkRCso",
      duration: "5:30",
      description: "The generous heart flows from gratitude — explore how the biblical story shapes giving.",
      series: "Biblical Themes",
    },
  ],
  prayer: [
    {
      id: "bp-prayer-psalms",
      title: "The Book of Psalms",
      youtubeId: "j9phNEaPrv8",
      duration: "9:15",
      description: "The Psalms teach us the full range of prayer — praise, lament, thanksgiving, and trust.",
      series: "Book Overview",
    },
    {
      id: "bp-heaven-and-earth",
      title: "Heaven and Earth",
      youtubeId: "Zy2AQlK6C5k",
      duration: "6:43",
      description: "Prayer connects heaven and earth — the two realms God is bringing together.",
      series: "Biblical Themes",
    },
  ],
  "identity-in-christ": [
    {
      id: "bp-image-of-god-identity",
      title: "Image of God",
      youtubeId: "YbipxLDtY8c",
      duration: "5:44",
      description: "You are made in God's image — discover what that means for your identity and calling.",
      series: "Biblical Themes",
    },
  ],
  contentment: [
    {
      id: "bp-ecclesiastes",
      title: "The Book of Ecclesiastes",
      youtubeId: "lrsQ1tc-2wk",
      duration: "6:52",
      description: "What is truly satisfying in life? Ecclesiastes explores contentment and meaning.",
      series: "Book Overview",
    },
  ],
  integrity: [
    {
      id: "bp-proverbs",
      title: "The Book of Proverbs",
      youtubeId: "Gab04dPs_uA",
      duration: "8:24",
      description: "Proverbs teaches wisdom for living with integrity in every area of life.",
      series: "Book Overview",
    },
    {
      id: "bp-justice-integrity",
      title: "Justice",
      youtubeId: "A14THPoc4-4",
      duration: "5:48",
      description: "Justice and integrity are inseparable — doing what's right even when no one's watching.",
      series: "Biblical Themes",
    },
  ],
  "doubt-and-faith": [],
  generosity: [
    {
      id: "bp-generosity-theme",
      title: "Generosity",
      youtubeId: "62CliEkRCso",
      duration: "5:30",
      description: "Biblical generosity flows from recognizing that everything we have comes from God.",
      series: "Biblical Themes",
    },
  ],
  depression: [
    {
      id: "bp-psalms-lament",
      title: "The Book of Psalms",
      youtubeId: "j9phNEaPrv8",
      duration: "9:15",
      description: "The Psalms give voice to the darkest human emotions — including depression and despair.",
      series: "Book Overview",
    },
  ],
  "trust-in-god": [
    {
      id: "bp-abraham",
      title: "The Book of Genesis (Part 2)",
      youtubeId: "F4isSyennFo",
      duration: "5:44",
      description: "Abraham's journey is the ultimate story of trust — stepping into the unknown with God.",
      series: "Book Overview",
    },
  ],
  humility: [
    {
      id: "bp-philippians",
      title: "The Book of Philippians",
      youtubeId: "oE9qqW1-BkU",
      duration: "7:53",
      description: "Paul paints the ultimate picture of humility: Jesus emptying himself for us.",
      series: "Book Overview",
    },
  ],
  parenting: [
    {
      id: "bp-proverbs-parenting",
      title: "The Book of Proverbs",
      youtubeId: "Gab04dPs_uA",
      duration: "8:24",
      description: "Proverbs is wisdom passed from parent to child — a guide for raising wise hearts.",
      series: "Book Overview",
    },
  ],
  hope: [],
  "sabbath-rest": [
    {
      id: "bp-sabbath",
      title: "Sabbath",
      youtubeId: "PFTLvkB3JLM",
      duration: "5:44",
      description: "The Sabbath is woven into the fabric of creation — a gift of rest and trust in God's provision.",
      series: "Biblical Themes",
    },
    {
      id: "bp-heaven-earth-sabbath",
      title: "Heaven and Earth",
      youtubeId: "Zy2AQlK6C5k",
      duration: "6:43",
      description: "Sabbath is where heaven and earth overlap — a taste of the coming new creation.",
      series: "Biblical Themes",
    },
  ],
  "justice-compassion": [
    {
      id: "bp-justice-theme",
      title: "Justice",
      youtubeId: "A14THPoc4-4",
      duration: "5:48",
      description: "Biblical justice is about restoring what's broken and caring for the vulnerable.",
      series: "Biblical Themes",
    },
  ],
  "work-vocation": [
    {
      id: "bp-image-of-god-work",
      title: "Image of God",
      youtubeId: "YbipxLDtY8c",
      duration: "5:44",
      description: "Humans are made to work alongside God — our vocation is part of bearing His image.",
      series: "Biblical Themes",
    },
    {
      id: "bp-ecclesiastes-work",
      title: "The Book of Ecclesiastes",
      youtubeId: "lrsQ1tc-2wk",
      duration: "6:52",
      durationMinutes: 7,
      description: "Ecclesiastes reframes work — finding meaning in daily labour as a gift from God.",
      series: "Book Overview",
    },
  ],
  "great-controversy": [
    {
      id: "gc-opening-series",
      title: "Opening a New Series With This Powerful Book",
      youtubeId: "LF6pjueQsHI",
      duration: "8:11",
      durationMinutes: 8,
      allowEmbed: false,
      description: "Pastor Ted Wilson introduces Ellen White's The Great Controversy — the cosmic conflict between Christ and Satan that determines earth's final destiny.",
      series: "Seventh-day Adventist Church",
    },
    {
      id: "gc-origin-of-evil",
      title: "The Origin of Evil",
      youtubeId: "fQ93yx7EPyM",
      duration: "8:48",
      durationMinutes: 9,
      allowEmbed: false,
      description: "How did a perfect angel become Satan? This episode traces Lucifer's rebellion in heaven and why God permitted the great controversy to unfold.",
      series: "Seventh-day Adventist Church",
    },
    {
      id: "gc-impending-conflict",
      title: "The Impending Conflict",
      youtubeId: "m7T4zHy0VUw",
      duration: "10:18",
      durationMinutes: 10,
      allowEmbed: false,
      description: "The coming crisis over worship in earth's last days — what the Bible says about the mark of the beast, the seal of God, and standing firm.",
      series: "Seventh-day Adventist Church",
    },
    {
      id: "gc-satans-defeat-christs-triumph",
      title: "Satan's Defeat and Christ's Triumph",
      youtubeId: "G1HCSZveqes",
      duration: "10:18",
      durationMinutes: 10,
      allowEmbed: false,
      description: "The final resolution of the great controversy — sin eradicated, God's character vindicated, and the redeemed united with Christ forever.",
      series: "Seventh-day Adventist Church",
    },
  ],
};

export function assertBibleProjectVideoCatalog(
  catalog: Record<string, BibleProjectVideo[]>
): void {
  for (const [topicId, videos] of Object.entries(catalog)) {
    for (const video of videos) {
      if (KNOWN_UNAVAILABLE_YOUTUBE_IDS.has(video.youtubeId)) {
        throw new Error(
          `Known unavailable YouTube video ${video.youtubeId} is assigned to pastoral topic ${topicId}`
        );
      }
    }
  }
}

assertBibleProjectVideoCatalog(BIBLE_PROJECT_VIDEOS);
