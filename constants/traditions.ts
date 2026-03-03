export interface Collection {
  id: string;
  title: string;
  description: string;
  subtitle: string;
  icon: string;
  color: string;
  existingRoute?: string;
  sampleTopics: { title: string; subtitle: string }[];
}

export const SDA_COLLECTION: Collection = {
  id: "adventist",
  title: "Adventist Studies",
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
};

export function getCollectionById(id: string): Collection | undefined {
  if (id === "adventist") return SDA_COLLECTION;
  return undefined;
}
