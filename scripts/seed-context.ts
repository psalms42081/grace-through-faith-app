import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { contextCards, commentators, commentaryEntries } from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const CONTEXT_CARDS = [
  {
    bookId: 1, chapter: 1, title: "The Creation Account",
    content: "Genesis 1 presents the creation narrative, describing God's systematic ordering of the cosmos over six days. The chapter establishes foundational theological truths about God's sovereignty, the goodness of creation, and humanity's unique role as image-bearers.",
    historicalBackground: "Written by Moses during the Israelite wilderness period (c. 1446-1406 BC). The creation account countered the polytheistic creation myths of surrounding cultures, particularly Egyptian and Mesopotamian traditions.",
    culturalNotes: "Ancient Near Eastern creation myths typically depicted creation as the result of conflict between gods. Genesis presents a strikingly different view: one sovereign God creating through speech alone, with no struggle or opposition.",
    authorInfo: "Moses, leader and lawgiver of Israel, traditionally credited as the author of the Pentateuch.",
    dateWritten: "c. 1446-1406 BC",
    audience: "The Israelites during and after the Exodus from Egypt",
    themes: ["Creation", "Sovereignty of God", "Image of God", "Sabbath", "Divine Order"],
  },
  {
    bookId: 1, chapter: 3, title: "The Fall of Humanity",
    content: "Genesis 3 records the pivotal moment when humanity chose to disobey God, introducing sin, death, and separation from God into the world. The chapter also contains the first messianic prophecy (the protoevangelium) in verse 15.",
    historicalBackground: "Set in the Garden of Eden, this narrative explains the origin of human suffering, the broken relationship between God and humanity, and the promise of future redemption.",
    culturalNotes: "The serpent was a significant symbol in ancient Near Eastern cultures, often associated with wisdom and chaos. The curse on the serpent would have been understood as God's authority over all creation.",
    authorInfo: "Moses",
    dateWritten: "c. 1446-1406 BC",
    audience: "The Israelites — explaining why the world is broken and God's plan to restore it",
    themes: ["Sin", "Temptation", "Judgment", "Grace", "Redemption Promise"],
  },
  {
    bookId: 2, chapter: 20, title: "The Ten Commandments",
    content: "Exodus 20 records God's direct revelation of the Ten Commandments at Mount Sinai. These ten words form the foundation of Israel's covenant relationship with God and provide the moral framework for human society.",
    historicalBackground: "Delivered approximately three months after the Exodus from Egypt (c. 1446 BC). The Israelites were camped at Mount Sinai, and God spoke the commandments audibly to the entire nation — a unique event in human history.",
    culturalNotes: "Ancient Near Eastern treaties (suzerainty covenants) followed a specific pattern: preamble, historical prologue, stipulations, and curses/blessings. The Ten Commandments follow this pattern, establishing God as the suzerain and Israel as the vassal.",
    authorInfo: "God spoke directly; Moses recorded the account",
    dateWritten: "c. 1446 BC",
    audience: "The entire nation of Israel assembled at Sinai",
    themes: ["Law", "Covenant", "Worship", "Ethics", "Sabbath"],
  },
  {
    bookId: 19, chapter: 23, title: "The Shepherd Psalm",
    content: "Psalm 23 is perhaps the most beloved passage in all of Scripture. David draws on his personal experience as a shepherd to describe God's tender care, provision, protection, and eternal faithfulness to His people.",
    historicalBackground: "Written by David, who spent his youth as a shepherd in the hills around Bethlehem. His intimate knowledge of a shepherd's duties gives this psalm its vivid, authentic imagery.",
    culturalNotes: "In the ancient Near East, kings were often called 'shepherds' of their people. By calling God his shepherd, David was acknowledging God as the true King and himself as a sheep under divine care.",
    authorInfo: "David, king of Israel, 'a man after God's own heart' (1 Samuel 13:14)",
    dateWritten: "c. 1000 BC",
    audience: "Israel in worship, and all who seek comfort in God's care",
    themes: ["Providence", "Comfort", "Protection", "Abundance", "Eternal Life"],
  },
  {
    bookId: 23, chapter: 53, title: "The Suffering Servant",
    content: "Isaiah 53 is the most detailed messianic prophecy in the Old Testament, describing a servant who would suffer and die as a substitute for the sins of others. Written approximately 700 years before Christ, it provides a remarkably specific preview of the crucifixion.",
    historicalBackground: "Written during the reign of multiple Judean kings (c. 740-680 BC). Isaiah prophesied during a time of political upheaval, with the Assyrian Empire threatening the northern kingdom.",
    culturalNotes: "The concept of substitutionary suffering was counter-cultural in the ancient world. Most cultures expected their heroes and deliverers to be powerful conquerors, not humble sufferers.",
    authorInfo: "Isaiah, prophet of Judah, often called the 'prince of prophets'",
    dateWritten: "c. 700 BC",
    audience: "The people of Judah and all future generations",
    themes: ["Messianic Prophecy", "Substitutionary Atonement", "Suffering", "Redemption", "Grace"],
  },
  {
    bookId: 43, chapter: 1, title: "The Word Made Flesh",
    content: "John 1 opens with one of the most profound theological statements in Scripture, declaring Jesus as the eternal Word (Logos) who was with God and was God from the beginning. The chapter traces from eternity past to the incarnation.",
    historicalBackground: "Written by the Apostle John, likely from Ephesus (c. AD 85-90). John wrote to a largely Greek-speaking audience familiar with the philosophical concept of 'Logos' (reason, word, cosmic principle).",
    culturalNotes: "The Greek concept of 'Logos' was central to Stoic philosophy and Hellenistic Judaism (especially Philo of Alexandria). By identifying Jesus as the Logos, John bridges Jewish and Greek thought, showing that the cosmic principle the philosophers sought is a Person.",
    authorInfo: "John the Apostle, 'the disciple whom Jesus loved,' one of the inner three disciples",
    dateWritten: "c. AD 85-90",
    audience: "Believers and seekers in the Greco-Roman world",
    themes: ["Incarnation", "Deity of Christ", "Light and Darkness", "Witness", "Grace and Truth"],
  },
  {
    bookId: 43, chapter: 3, title: "Born Again — Nicodemus and Jesus",
    content: "John 3 contains Jesus' nighttime conversation with Nicodemus, a Pharisee and member of the Sanhedrin. Jesus teaches about the necessity of spiritual rebirth and God's love for the world, culminating in the most quoted verse in the Bible (3:16).",
    historicalBackground: "Set during the early Judean ministry of Jesus (c. AD 27-28). Nicodemus came at night, likely to avoid public scrutiny from his fellow Pharisees.",
    culturalNotes: "As a Pharisee, Nicodemus would have expected salvation through Torah observance and Jewish heritage. Jesus' teaching about being 'born again' challenged his entire theological framework.",
    authorInfo: "John the Apostle",
    dateWritten: "c. AD 85-90",
    audience: "The early church and all seekers",
    themes: ["New Birth", "Salvation", "God's Love", "Belief", "Eternal Life"],
  },
  {
    bookId: 45, chapter: 8, title: "Life in the Spirit",
    content: "Romans 8 is considered by many scholars to be the greatest chapter in the Bible. Paul moves from the reality of condemnation (Romans 1-3) through justification (Romans 4-5) and sanctification (Romans 6-7) to the triumphant conclusion: no condemnation and no separation from God's love.",
    historicalBackground: "Written by Paul from Corinth (c. AD 57) to the church in Rome, which he had not yet visited. Paul was preparing for his journey to Rome and wanted to present a comprehensive statement of the gospel.",
    culturalNotes: "Rome was the center of the known world, with a diverse church of both Jewish and Gentile believers. Paul's systematic theology addressed tensions between these groups about law, grace, and the Spirit's role.",
    authorInfo: "Paul the Apostle, formerly Saul of Tarsus, 'apostle to the Gentiles'",
    dateWritten: "c. AD 57",
    audience: "The church in Rome — Jewish and Gentile believers",
    themes: ["No Condemnation", "Holy Spirit", "Adoption", "Perseverance", "God's Love"],
  },
  {
    bookId: 66, chapter: 21, title: "The New Heaven and New Earth",
    content: "Revelation 21 presents the glorious culmination of God's redemptive plan: a new heaven and new earth where God dwells with His people. The New Jerusalem descends from heaven, tears are wiped away, and death is no more.",
    historicalBackground: "Written by John during his exile on the island of Patmos (c. AD 95-96), during Emperor Domitian's persecution of Christians. The vision of a restored creation gave hope to suffering believers.",
    culturalNotes: "The imagery of a holy city draws on Old Testament prophecies about a restored Jerusalem. The measurements and precious stones echo the dimensions of the temple, suggesting that all of the new creation becomes God's dwelling place.",
    authorInfo: "John the Apostle, exiled to Patmos for his testimony about Jesus",
    dateWritten: "c. AD 95-96",
    audience: "The seven churches of Asia Minor, and all persecuted believers",
    themes: ["New Creation", "God's Dwelling", "No More Death", "Hope", "Eternal Life"],
  },
];

const COMMENTATORS = [
  {
    id: "matthew-henry",
    name: "Matthew Henry",
    dates: "1662-1714",
    tradition: "Presbyterian",
    bio: "English Nonconformist minister and author of the comprehensive 'Exposition of the Old and New Testaments,' one of the most widely used commentaries in the English language.",
    isExternal: false,
  },
  {
    id: "john-gill",
    name: "John Gill",
    dates: "1697-1771",
    tradition: "Baptist",
    bio: "English Baptist pastor and biblical scholar known for his thorough exegetical commentary that draws heavily on Jewish and patristic sources.",
    isExternal: false,
  },
  {
    id: "adam-clarke",
    name: "Adam Clarke",
    dates: "1760-1832",
    tradition: "Methodist",
    bio: "British Methodist theologian and biblical scholar. His commentary is noted for its attention to original languages and is one of the most influential Methodist commentaries.",
    isExternal: false,
  },
  {
    id: "jfb",
    name: "Jamieson, Fausset & Brown",
    dates: "1871",
    tradition: "Presbyterian",
    bio: "A collaborative commentary by Robert Jamieson, A.R. Fausset, and David Brown. Known for its concise yet thorough treatment of every verse.",
    isExternal: false,
  },
];

const SAMPLE_COMMENTARY = [
  {
    commentatorId: "matthew-henry",
    bookId: 1, chapter: 1, verseStart: 1, verseEnd: 2,
    title: "The Creation of Heaven and Earth",
    content: "The first verse of the Bible gives us a satisfying and useful account of the origin of the heaven and the earth. The faith of humble Christians understands this better than the fancy of the most learned men. From what we see of heaven and earth, we learn the power of the great Creator.",
  },
  {
    commentatorId: "matthew-henry",
    bookId: 1, chapter: 1, verseStart: 26, verseEnd: 28,
    title: "The Creation of Man",
    content: "Man was made last of all the creatures: this was both an honour and a favour to him. Man was to be a creature different from all that had been hitherto made. Flesh and spirit, heaven and earth, must be put together in him.",
  },
  {
    commentatorId: "john-gill",
    bookId: 19, chapter: 23, verseStart: 1, verseEnd: 3,
    title: "The Lord My Shepherd",
    content: "These words express the faith, experience, and comfort of David. The Lord was his shepherd in a spiritual sense; he fed him in green pastures, led him beside still waters, and restored his soul when he wandered.",
  },
  {
    commentatorId: "matthew-henry",
    bookId: 43, chapter: 3, verseStart: 16, verseEnd: 17,
    title: "God So Loved the World",
    content: "Here is the gospel in miniature: God so loved the world that He gave His only begotten Son. The love of God is the fountain of all grace. The giving of the Son is the channel. Faith is the bucket that draws the water. Everlasting life is the stream that flows.",
  },
  {
    commentatorId: "adam-clarke",
    bookId: 45, chapter: 8, verseStart: 28, verseEnd: 30,
    title: "All Things Work Together for Good",
    content: "All things — whether prosperous or adverse, whether joyful or painful — work together, by the overruling providence of God, for the good of those who love Him. Not one event is left to chance. All are under divine management and direction.",
  },
  {
    commentatorId: "jfb",
    bookId: 45, chapter: 8, verseStart: 38, verseEnd: 39,
    title: "Nothing Shall Separate Us",
    content: "The apostle rises to a magnificent climax. Having shown that God's love is the source of all blessing, he challenges every conceivable force — death, life, angels, principalities, things present or to come — and declares that none can sever the bond between the believer and the love of God in Christ.",
  },
];

async function seed() {
  console.log("Seeding context cards...");
  for (const card of CONTEXT_CARDS) {
    await db.insert(contextCards).values(card).onConflictDoNothing();
  }
  console.log(`  ${CONTEXT_CARDS.length} context cards inserted`);

  console.log("Seeding commentators...");
  for (const c of COMMENTATORS) {
    await db.insert(commentators).values(c).onConflictDoNothing();
  }
  console.log(`  ${COMMENTATORS.length} commentators inserted`);

  console.log("Seeding sample commentary entries...");
  for (const entry of SAMPLE_COMMENTARY) {
    await db.insert(commentaryEntries).values(entry).onConflictDoNothing();
  }
  console.log(`  ${SAMPLE_COMMENTARY.length} commentary entries inserted`);

  console.log("\nContext seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
