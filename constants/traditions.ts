export interface Collection {
  id: string;
  title: string;
  traditionKey: "core" | "adventist" | "baptist" | "reformed" | "catholic" | "methodist" | "orthodox";
  isCore: boolean;
  isEnabled: boolean;
  description: string;
  disclaimer?: string;
  subtitle: string;
  icon: string;
  color: string;
  existingRoute?: string;
  sampleTopics: { title: string; subtitle: string }[];
}

export type TraditionKey = Collection["traditionKey"];

const TRADITION_LABELS: Record<TraditionKey, string> = {
  core: "Core",
  adventist: "Adventist Perspective",
  baptist: "Baptist Perspective",
  reformed: "Reformed Perspective",
  catholic: "Catholic Perspective",
  methodist: "Methodist Perspective",
  orthodox: "Orthodox Perspective",
};

export function getContentLabel(traditionKey: TraditionKey): string {
  return TRADITION_LABELS[traditionKey] ?? traditionKey;
}

export function getDisclaimerText(traditionKey: TraditionKey): string | null {
  if (traditionKey === "core") return null;
  const label = TRADITION_LABELS[traditionKey]?.replace(" Perspective", "") ?? traditionKey;
  return `This collection presents perspectives from the ${label} tradition. Users are encouraged to explore Scripture thoughtfully and compare perspectives within the wider Christian community.`;
}

export const COLLECTIONS: Collection[] = [
  {
    id: "adventist",
    title: "Adventist Studies",
    traditionKey: "adventist",
    isCore: false,
    isEnabled: true,
    description: "Explore the 28 Fundamental Beliefs of the Seventh-day Adventist Church. These doctrinal studies cover core Christian teachings as understood within the Adventist tradition, including the Sabbath, the Second Coming, and holistic living.",
    subtitle: "28 Fundamental Beliefs & Sabbath-centered living",
    icon: "school",
    color: "#7C3AED",
    existingRoute: "/sda-studies",
    sampleTopics: [
      { title: "The Holy Scriptures", subtitle: "Belief #1 \u2014 The Bible as the written Word of God" },
      { title: "The Godhead", subtitle: "Beliefs #2\u20134 \u2014 Father, Son, and Holy Spirit" },
      { title: "The Sabbath", subtitle: "Belief #20 \u2014 The seventh-day rest" },
      { title: "The Second Coming", subtitle: "Belief #25 \u2014 Christ\u2019s return in glory" },
    ],
  },
  {
    id: "baptist",
    title: "Baptist Studies",
    traditionKey: "baptist",
    isCore: false,
    isEnabled: true,
    description: "Study the distinctive teachings and practices of the Baptist tradition. Baptist theology emphasizes believer\u2019s baptism by immersion, the authority of Scripture, the priesthood of all believers, and the autonomy of the local church.",
    subtitle: "Believer\u2019s baptism, soul liberty & congregational governance",
    icon: "water",
    color: "#2563EB",
    sampleTopics: [
      { title: "Believer\u2019s Baptism", subtitle: "Baptism as a conscious profession of faith" },
      { title: "Soul Liberty", subtitle: "Freedom of conscience in matters of faith" },
      { title: "Congregational Governance", subtitle: "The autonomy of the local church" },
      { title: "The Authority of Scripture", subtitle: "The Bible as the sole rule of faith and practice" },
    ],
  },
  {
    id: "reformed",
    title: "Reformed Studies",
    traditionKey: "reformed",
    isCore: false,
    isEnabled: true,
    description: "Explore the Reformed tradition rooted in the 16th-century Protestant Reformation. Reformed theology centers on God\u2019s sovereignty, covenant theology, and the five solas: Scripture alone, faith alone, grace alone, Christ alone, and God\u2019s glory alone.",
    subtitle: "Covenant theology & the five solas of the Reformation",
    icon: "book",
    color: "#0D9488",
    sampleTopics: [
      { title: "The Five Solas", subtitle: "Core principles of the Reformation" },
      { title: "Covenant Theology", subtitle: "God\u2019s covenants as a framework for redemption" },
      { title: "The Sovereignty of God", subtitle: "God\u2019s rule over all creation and salvation" },
      { title: "The Westminster Standards", subtitle: "Historic confessional documents" },
    ],
  },
  {
    id: "catholic",
    title: "Catholic Studies",
    traditionKey: "catholic",
    isCore: false,
    isEnabled: false,
    description: "Explore the teachings of the Catholic tradition, including sacramental theology, Sacred Tradition, and the Magisterium.",
    subtitle: "Sacramental theology, Tradition & Magisterium",
    icon: "fitness",
    color: "#DC2626",
    sampleTopics: [],
  },
  {
    id: "methodist",
    title: "Methodist Studies",
    traditionKey: "methodist",
    isCore: false,
    isEnabled: false,
    description: "Explore the Wesleyan tradition of holiness, prevenient grace, and social witness.",
    subtitle: "Wesleyan holiness, grace & social witness",
    icon: "heart",
    color: "#D97706",
    sampleTopics: [],
  },
  {
    id: "orthodox",
    title: "Orthodox Studies",
    traditionKey: "orthodox",
    isCore: false,
    isEnabled: false,
    description: "Explore the Eastern Orthodox tradition of theosis, liturgical worship, and patristic theology.",
    subtitle: "Theosis, liturgical worship & patristic tradition",
    icon: "star",
    color: "#9333EA",
    sampleTopics: [],
  },
];

export function getCollectionById(id: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}
