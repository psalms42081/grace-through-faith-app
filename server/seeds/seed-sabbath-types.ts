import { db } from "../db";
import { sabbathTypes, sabbathScriptures } from "../../shared/schema";

const SABBATH_TYPES = [
  {
    name: "The Weekly Sabbath",
    hebrewName: "Shabbat",
    type: "weekly",
    anchorScripture: "Genesis 2:2-3",
    description: "God rested on the seventh day and set it apart — what that means for us today and why it still matters.",
    historicalContext: "Rooted in creation itself — God worked six days and rested on the seventh, blessing and sanctifying it. Israel was commanded to observe it at Sinai as the fourth commandment. It became the defining mark of covenant faithfulness throughout the Old Testament.",
    propheticSignificance: "Points to the rest found in Christ — Hebrews 4 describes a coming Sabbath rest for the people of God. Jesus declared himself Lord of the Sabbath.",
    frequencyDescription: "Every seventh day, from Friday sunset to Saturday night",
    orderIndex: 1,
    scriptures: [
      { bookId: 1, chapter: 2, verseStart: 2, verseEnd: 3, label: "The Foundation", orderIndex: 1 },
      { bookId: 2, chapter: 20, verseStart: 8, verseEnd: 11, label: "The Fourth Commandment", orderIndex: 2 },
      { bookId: 23, chapter: 58, verseStart: 13, verseEnd: 14, label: "The Delight", orderIndex: 3 },
      { bookId: 58, chapter: 4, verseStart: 9, verseEnd: 10, label: "The Fulfilment", orderIndex: 4 },
      { bookId: 41, chapter: 2, verseStart: 27, verseEnd: 28, label: "Lord of the Sabbath", orderIndex: 5 },
    ],
  },
  {
    name: "The Sabbath of Sabbaths — Yom Kippur",
    hebrewName: "Yom Kippur",
    type: "annual",
    anchorScripture: "Leviticus 23:27-28",
    description: "The holiest day in the biblical calendar — a day of atonement, rest, and drawing near to God.",
    historicalContext: "The most solemn day of the biblical calendar. The High Priest entered the Holy of Holies once a year to make atonement for all Israel. The scapegoat carried the sins of the nation into the wilderness. All work ceased and the people fasted.",
    propheticSignificance: "The most direct Old Testament picture of Christ's atoning work. The book of Hebrews unpacks Yom Kippur as the shadow of which Christ's sacrifice is the substance.",
    frequencyDescription: "Once per year, on the tenth day of the seventh month",
    orderIndex: 2,
    scriptures: [
      { bookId: 3, chapter: 16, verseStart: 1, verseEnd: 34, label: "The Day of Atonement", orderIndex: 1 },
      { bookId: 3, chapter: 23, verseStart: 27, verseEnd: 32, label: "The Command", orderIndex: 2 },
      { bookId: 58, chapter: 9, verseStart: 7, verseEnd: 12, label: "The Fulfilment in Christ", orderIndex: 3 },
      { bookId: 58, chapter: 10, verseStart: 19, verseEnd: 22, label: "The Way Now Open", orderIndex: 4 },
    ],
  },
  {
    name: "Passover and the Feast of Unleavened Bread",
    hebrewName: "Pesach",
    type: "annual",
    anchorScripture: "Exodus 12:14",
    description: "The night God delivered Israel from Egypt through the blood of a spotless lamb — the most explicit messianic shadow in all of Scripture.",
    historicalContext: "Instituted on the night Israel was delivered from Egypt. The blood of a spotless lamb was placed on the doorposts and the destroyer passed over. The seven days of unleavened bread followed, symbolising the removal of sin from the household.",
    propheticSignificance: "The most explicit messianic shadow in the entire Old Testament. Paul writes that Christ our Passover lamb has been sacrificed. The timing of the crucifixion on Passover was not coincidental.",
    frequencyDescription: "First and seventh days of Passover week, in the first month",
    orderIndex: 3,
    scriptures: [
      { bookId: 2, chapter: 12, verseStart: 1, verseEnd: 14, label: "The First Passover", orderIndex: 1 },
      { bookId: 3, chapter: 23, verseStart: 5, verseEnd: 8, label: "The Annual Command", orderIndex: 2 },
      { bookId: 46, chapter: 5, verseStart: 7, verseEnd: 7, label: "Christ Our Passover", orderIndex: 3 },
      { bookId: 43, chapter: 1, verseStart: 29, verseEnd: 29, label: "The Lamb of God", orderIndex: 4 },
    ],
  },
  {
    name: "The Feast of Weeks — Pentecost",
    hebrewName: "Shavuot",
    type: "annual",
    anchorScripture: "Leviticus 23:15-16",
    description: "A harvest festival celebrating the firstfruits of the wheat harvest — fulfilled dramatically when the Holy Spirit was poured out on the church.",
    historicalContext: "A harvest festival celebrating the firstfruits of the wheat harvest. Traditionally also associated with the giving of the Torah at Sinai. Observed by bringing two loaves of leavened bread as an offering — the only offering in the Mosaic system that used leaven, representing redeemed humanity.",
    propheticSignificance: "Fulfilled dramatically in Acts 2 when the Holy Spirit was poured out exactly on this day. The firstfruits of the harvest became the firstfruits of the church.",
    frequencyDescription: "Fifty days after Passover",
    orderIndex: 4,
    scriptures: [
      { bookId: 3, chapter: 23, verseStart: 15, verseEnd: 22, label: "The Command", orderIndex: 1 },
      { bookId: 2, chapter: 19, verseStart: 1, verseEnd: 1, label: "The Giving of the Law", orderIndex: 2 },
      { bookId: 44, chapter: 2, verseStart: 1, verseEnd: 4, label: "The Day of Pentecost", orderIndex: 3 },
      { bookId: 44, chapter: 2, verseStart: 41, verseEnd: 41, label: "Three Thousand Added", orderIndex: 4 },
    ],
  },
  {
    name: "The Sabbatical Year — Shemitah",
    hebrewName: "Shemitah",
    type: "sabbatical",
    anchorScripture: "Leviticus 25:1-7",
    description: "Every seventh year the land rests. What God's rhythm of release and renewal reveals about trust, provision, and letting go.",
    historicalContext: "The land of Israel was commanded to rest every seventh year — no sowing, pruning, or harvesting. Whatever grew on its own was available to all including the poor and the animals. Debts were also released at the end of the seventh year. Israel repeatedly failed to observe the Shemitah and the seventy years of Babylonian captivity were directly connected to this neglect — the land receiving its missed Sabbaths.",
    propheticSignificance: "Points to God as the true owner of the land and provider of all sustenance. The release of debts foreshadows the forgiveness of sins in Christ.",
    frequencyDescription: "Every seventh year",
    orderIndex: 5,
    scriptures: [
      { bookId: 3, chapter: 25, verseStart: 1, verseEnd: 7, label: "The Land Sabbath", orderIndex: 1 },
      { bookId: 5, chapter: 15, verseStart: 1, verseEnd: 2, label: "The Debt Release", orderIndex: 2 },
      { bookId: 14, chapter: 36, verseStart: 21, verseEnd: 21, label: "The Captivity and the Land's Sabbaths", orderIndex: 3 },
      { bookId: 16, chapter: 10, verseStart: 31, verseEnd: 31, label: "The Renewed Commitment", orderIndex: 4 },
    ],
  },
  {
    name: "The Jubilee Year",
    hebrewName: "Yovel",
    type: "jubilee",
    anchorScripture: "Leviticus 25:8-12",
    description: "Every fifty years debts cancelled, slaves freed, land returned. The most radical economic reset in human history — and what it points to in Christ.",
    historicalContext: "The most radical social and economic reset in the ancient world. Every fiftieth year all land returned to its original family owners, all Israelite slaves were freed, and all debts cancelled. The trumpet — the shofar — was blown on Yom Kippur of the forty-ninth year to announce the coming Jubilee. There is significant scholarly debate about whether the Jubilee was ever fully observed in Israel's history.",
    propheticSignificance: "Jesus opened his ministry in Nazareth by reading Isaiah 61 — the Jubilee passage — and declaring it fulfilled in their hearing. The Jubilee is the economic and social expression of the gospel — liberation, restoration, and return.",
    frequencyDescription: "Every fiftieth year, after seven cycles of Shemitah",
    orderIndex: 6,
    scriptures: [
      { bookId: 3, chapter: 25, verseStart: 8, verseEnd: 17, label: "The Jubilee Command", orderIndex: 1 },
      { bookId: 23, chapter: 61, verseStart: 1, verseEnd: 2, label: "The Jubilee Prophecy", orderIndex: 2 },
      { bookId: 42, chapter: 4, verseStart: 16, verseEnd: 21, label: "Jesus Declares Jubilee", orderIndex: 3 },
      { bookId: 45, chapter: 8, verseStart: 21, verseEnd: 21, label: "Creation's Jubilee", orderIndex: 4 },
    ],
  },
];

export async function seedSabbathTypes(database: typeof db) {
  console.log("[seed] Seeding sabbath types...");

  for (const st of SABBATH_TYPES) {
    const { scriptures, ...typeData } = st;

    const [inserted] = await database
      .insert(sabbathTypes)
      .values(typeData)
      .onConflictDoNothing()
      .returning({ id: sabbathTypes.id });

    if (inserted) {
      const scriptureRows = scriptures.map((s) => ({
        ...s,
        sabbathTypeId: inserted.id,
      }));
      await database.insert(sabbathScriptures).values(scriptureRows).onConflictDoNothing();
      console.log(`[seed] Inserted sabbath type: ${st.name} with ${scriptures.length} scriptures`);
    } else {
      console.log(`[seed] Sabbath type already exists: ${st.name}`);
    }
  }

  console.log("[seed] Sabbath types seeding complete.");
}
