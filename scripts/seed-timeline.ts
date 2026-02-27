import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";
import {
  timelineEvents,
  eventVerseMaps,
  locations,
  bibleVerses,
  bibleTranslations,
  bibleBooks,
} from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

interface TimelineEventSeed {
  title: string;
  description: string;
  yearApprox: number;
  yearLabel: string;
  period: string;
  category: string;
  locationName: string | null;
  verses: { bookId: number; chapter: number; verse: number }[];
}

const TIMELINE_DATA: TimelineEventSeed[] = [
  {
    title: "Creation",
    description: "God creates the heavens, the earth, and all living things in six days, resting on the seventh. Humanity is formed in the image of God and placed in the Garden of Eden.",
    yearApprox: -4000,
    yearLabel: "c. 4000 BC",
    period: "Creation",
    category: "origin",
    locationName: null,
    verses: [
      { bookId: 1, chapter: 1, verse: 1 },
      { bookId: 1, chapter: 1, verse: 27 },
      { bookId: 1, chapter: 2, verse: 7 },
    ],
  },
  {
    title: "The Fall of Humanity",
    description: "Adam and Eve disobey God by eating from the tree of the knowledge of good and evil, bringing sin and death into the world.",
    yearApprox: -3950,
    yearLabel: "c. 3950 BC",
    period: "Creation",
    category: "origin",
    locationName: null,
    verses: [
      { bookId: 1, chapter: 3, verse: 6 },
      { bookId: 1, chapter: 3, verse: 23 },
    ],
  },
  {
    title: "The Great Flood",
    description: "God sends a worldwide flood to judge humanity's wickedness. Noah and his family are preserved in the ark along with pairs of every kind of animal.",
    yearApprox: -2350,
    yearLabel: "c. 2350 BC",
    period: "Creation",
    category: "judgment",
    locationName: null,
    verses: [
      { bookId: 1, chapter: 6, verse: 17 },
      { bookId: 1, chapter: 7, verse: 11 },
      { bookId: 1, chapter: 8, verse: 4 },
    ],
  },
  {
    title: "Call of Abraham",
    description: "God calls Abram to leave Ur and go to the land of Canaan, promising to make him a great nation and to bless all families of the earth through him.",
    yearApprox: -2091,
    yearLabel: "c. 2091 BC",
    period: "Patriarchs",
    category: "covenant",
    locationName: "Ur",
    verses: [
      { bookId: 1, chapter: 12, verse: 1 },
      { bookId: 1, chapter: 12, verse: 2 },
    ],
  },
  {
    title: "Binding of Isaac",
    description: "God tests Abraham by commanding him to sacrifice his son Isaac on Mount Moriah. At the last moment, God provides a ram as a substitute.",
    yearApprox: -2054,
    yearLabel: "c. 2054 BC",
    period: "Patriarchs",
    category: "faith",
    locationName: "Jerusalem",
    verses: [
      { bookId: 1, chapter: 22, verse: 2 },
      { bookId: 1, chapter: 22, verse: 13 },
    ],
  },
  {
    title: "Jacob's Ladder at Bethel",
    description: "Jacob dreams of a ladder reaching to heaven with angels ascending and descending. God renews the Abrahamic covenant with him.",
    yearApprox: -1928,
    yearLabel: "c. 1928 BC",
    period: "Patriarchs",
    category: "revelation",
    locationName: "Bethel",
    verses: [
      { bookId: 1, chapter: 28, verse: 12 },
      { bookId: 1, chapter: 28, verse: 13 },
    ],
  },
  {
    title: "Joseph Sold into Egypt",
    description: "Joseph, Jacob's favored son, is sold into slavery by his jealous brothers and taken to Egypt, where God would later use him to preserve his family during a severe famine.",
    yearApprox: -1898,
    yearLabel: "c. 1898 BC",
    period: "Patriarchs",
    category: "providence",
    locationName: "Egypt / Goshen",
    verses: [
      { bookId: 1, chapter: 37, verse: 28 },
      { bookId: 1, chapter: 50, verse: 20 },
    ],
  },
  {
    title: "The Exodus from Egypt",
    description: "God delivers the Israelites from 400 years of slavery in Egypt through Moses, with ten devastating plagues culminating in the Passover and the parting of the Red Sea.",
    yearApprox: -1446,
    yearLabel: "c. 1446 BC",
    period: "Exodus & Wilderness",
    category: "deliverance",
    locationName: "Egypt / Goshen",
    verses: [
      { bookId: 2, chapter: 12, verse: 31 },
      { bookId: 2, chapter: 14, verse: 21 },
    ],
  },
  {
    title: "Giving of the Law at Sinai",
    description: "God descends on Mount Sinai in fire and smoke and gives Moses the Ten Commandments and the Law, establishing the covenant with Israel.",
    yearApprox: -1445,
    yearLabel: "c. 1445 BC",
    period: "Exodus & Wilderness",
    category: "covenant",
    locationName: "Mount Sinai",
    verses: [
      { bookId: 2, chapter: 20, verse: 1 },
      { bookId: 2, chapter: 20, verse: 3 },
      { bookId: 2, chapter: 31, verse: 18 },
    ],
  },
  {
    title: "Wilderness Wandering",
    description: "Due to Israel's lack of faith at Kadesh Barnea, God sentences them to wander in the wilderness for 40 years until the faithless generation passes away.",
    yearApprox: -1444,
    yearLabel: "c. 1444 BC",
    period: "Exodus & Wilderness",
    category: "judgment",
    locationName: null,
    verses: [
      { bookId: 4, chapter: 14, verse: 33 },
      { bookId: 4, chapter: 14, verse: 34 },
    ],
  },
  {
    title: "Crossing the Jordan",
    description: "Under Joshua's leadership, Israel miraculously crosses the Jordan River on dry ground into the Promised Land, marking the end of the wilderness period.",
    yearApprox: -1406,
    yearLabel: "c. 1406 BC",
    period: "Conquest & Judges",
    category: "conquest",
    locationName: "Jordan River",
    verses: [
      { bookId: 6, chapter: 3, verse: 17 },
      { bookId: 6, chapter: 4, verse: 7 },
    ],
  },
  {
    title: "Fall of Jericho",
    description: "The walls of Jericho miraculously collapse after Israel marches around the city for seven days, as God commanded through Joshua.",
    yearApprox: -1400,
    yearLabel: "c. 1400 BC",
    period: "Conquest & Judges",
    category: "conquest",
    locationName: "Jericho",
    verses: [
      { bookId: 6, chapter: 6, verse: 20 },
    ],
  },
  {
    title: "Deborah Judges Israel",
    description: "The prophetess Deborah leads Israel to victory over the Canaanite general Sisera, demonstrating God's power through unlikely instruments.",
    yearApprox: -1209,
    yearLabel: "c. 1209 BC",
    period: "Conquest & Judges",
    category: "leadership",
    locationName: null,
    verses: [
      { bookId: 7, chapter: 4, verse: 4 },
      { bookId: 7, chapter: 4, verse: 14 },
    ],
  },
  {
    title: "Gideon's Victory",
    description: "God reduces Gideon's army from 32,000 to 300, then gives them victory over the Midianites, demonstrating that deliverance comes from God alone.",
    yearApprox: -1162,
    yearLabel: "c. 1162 BC",
    period: "Conquest & Judges",
    category: "deliverance",
    locationName: null,
    verses: [
      { bookId: 7, chapter: 7, verse: 7 },
      { bookId: 7, chapter: 7, verse: 22 },
    ],
  },
  {
    title: "Samuel Anoints Saul as King",
    description: "In response to Israel's demand for a king, God directs Samuel to anoint Saul from the tribe of Benjamin as the first king of Israel.",
    yearApprox: -1050,
    yearLabel: "c. 1050 BC",
    period: "United Kingdom",
    category: "kingship",
    locationName: null,
    verses: [
      { bookId: 9, chapter: 10, verse: 1 },
    ],
  },
  {
    title: "David Anointed King",
    description: "The shepherd boy David is anointed by Samuel as God's chosen king over Israel, beginning the Davidic dynasty through which the Messiah would come.",
    yearApprox: -1025,
    yearLabel: "c. 1025 BC",
    period: "United Kingdom",
    category: "kingship",
    locationName: "Hebron",
    verses: [
      { bookId: 9, chapter: 16, verse: 13 },
    ],
  },
  {
    title: "David Conquers Jerusalem",
    description: "David captures the Jebusite stronghold of Jerusalem and makes it his capital, establishing it as the political and spiritual center of Israel.",
    yearApprox: -1003,
    yearLabel: "c. 1003 BC",
    period: "United Kingdom",
    category: "kingship",
    locationName: "Jerusalem",
    verses: [
      { bookId: 10, chapter: 5, verse: 7 },
      { bookId: 10, chapter: 5, verse: 9 },
    ],
  },
  {
    title: "Solomon Builds the Temple",
    description: "King Solomon constructs the magnificent Temple in Jerusalem, fulfilling David's dream. The glory of the Lord fills the completed Temple.",
    yearApprox: -959,
    yearLabel: "c. 959 BC",
    period: "United Kingdom",
    category: "worship",
    locationName: "Jerusalem",
    verses: [
      { bookId: 11, chapter: 6, verse: 1 },
      { bookId: 11, chapter: 8, verse: 10 },
    ],
  },
  {
    title: "Kingdom Divides",
    description: "After Solomon's death, the kingdom splits into the northern kingdom of Israel (10 tribes) under Jeroboam and the southern kingdom of Judah (2 tribes) under Rehoboam.",
    yearApprox: -930,
    yearLabel: "c. 930 BC",
    period: "Divided Kingdom",
    category: "political",
    locationName: null,
    verses: [
      { bookId: 11, chapter: 12, verse: 16 },
      { bookId: 11, chapter: 12, verse: 20 },
    ],
  },
  {
    title: "Elijah on Mount Carmel",
    description: "The prophet Elijah confronts 450 prophets of Baal on Mount Carmel. God answers by fire, consuming the sacrifice and proving He alone is God.",
    yearApprox: -860,
    yearLabel: "c. 860 BC",
    period: "Divided Kingdom",
    category: "prophecy",
    locationName: "Megiddo",
    verses: [
      { bookId: 11, chapter: 18, verse: 38 },
      { bookId: 11, chapter: 18, verse: 39 },
    ],
  },
  {
    title: "Fall of Northern Israel to Assyria",
    description: "The Assyrian Empire conquers the northern kingdom of Israel, deporting the population and resettling foreigners in the land. The ten northern tribes are scattered.",
    yearApprox: -722,
    yearLabel: "722 BC",
    period: "Divided Kingdom",
    category: "judgment",
    locationName: "Samaria",
    verses: [
      { bookId: 12, chapter: 17, verse: 6 },
      { bookId: 12, chapter: 17, verse: 23 },
    ],
  },
  {
    title: "Jonah Preaches to Nineveh",
    description: "After fleeing from God and being swallowed by a great fish, Jonah obeys and preaches repentance to the Assyrian capital of Nineveh, which repents.",
    yearApprox: -760,
    yearLabel: "c. 760 BC",
    period: "Divided Kingdom",
    category: "prophecy",
    locationName: "Nineveh",
    verses: [
      { bookId: 32, chapter: 3, verse: 5 },
      { bookId: 32, chapter: 3, verse: 10 },
    ],
  },
  {
    title: "Fall of Jerusalem & Babylonian Exile",
    description: "Nebuchadnezzar of Babylon destroys Jerusalem and Solomon's Temple. The people of Judah are carried into exile in Babylon, fulfilling the prophets' warnings.",
    yearApprox: -586,
    yearLabel: "586 BC",
    period: "Exile & Return",
    category: "judgment",
    locationName: "Babylon",
    verses: [
      { bookId: 12, chapter: 25, verse: 9 },
      { bookId: 12, chapter: 25, verse: 11 },
    ],
  },
  {
    title: "Daniel in the Lions' Den",
    description: "Daniel, a Jewish exile serving in the Babylonian and Persian courts, is thrown into a den of lions for praying to God. God shuts the lions' mouths and delivers him.",
    yearApprox: -539,
    yearLabel: "c. 539 BC",
    period: "Exile & Return",
    category: "faith",
    locationName: "Babylon",
    verses: [
      { bookId: 27, chapter: 6, verse: 22 },
    ],
  },
  {
    title: "Return from Exile & Temple Rebuilt",
    description: "Under the decree of Cyrus the Great, Jewish exiles return to Jerusalem and rebuild the Temple under Zerubbabel, completing it in 516 BC.",
    yearApprox: -538,
    yearLabel: "538 BC",
    period: "Exile & Return",
    category: "restoration",
    locationName: "Jerusalem",
    verses: [
      { bookId: 15, chapter: 1, verse: 3 },
      { bookId: 15, chapter: 6, verse: 15 },
    ],
  },
  {
    title: "Nehemiah Rebuilds Jerusalem's Walls",
    description: "Nehemiah, cupbearer to the Persian king, leads the effort to rebuild Jerusalem's walls in just 52 days despite fierce opposition.",
    yearApprox: -445,
    yearLabel: "445 BC",
    period: "Exile & Return",
    category: "restoration",
    locationName: "Jerusalem",
    verses: [
      { bookId: 16, chapter: 6, verse: 15 },
    ],
  },
  {
    title: "Birth of Jesus Christ",
    description: "Jesus, the promised Messiah, is born to the virgin Mary in Bethlehem, fulfilling centuries of Old Testament prophecy. Angels announce the good news to shepherds.",
    yearApprox: -4,
    yearLabel: "c. 4 BC",
    period: "Life of Christ",
    category: "incarnation",
    locationName: "Bethlehem",
    verses: [
      { bookId: 42, chapter: 2, verse: 7 },
      { bookId: 42, chapter: 2, verse: 11 },
      { bookId: 40, chapter: 1, verse: 21 },
    ],
  },
  {
    title: "Baptism of Jesus",
    description: "Jesus is baptized by John the Baptist in the Jordan River. The heavens open, the Spirit descends like a dove, and God the Father declares, 'This is my beloved Son.'",
    yearApprox: 27,
    yearLabel: "c. AD 27",
    period: "Life of Christ",
    category: "ministry",
    locationName: "Jordan River",
    verses: [
      { bookId: 40, chapter: 3, verse: 16 },
      { bookId: 40, chapter: 3, verse: 17 },
    ],
  },
  {
    title: "Sermon on the Mount",
    description: "Jesus delivers His most comprehensive teaching, including the Beatitudes, the Lord's Prayer, and radical instructions on love, forgiveness, and kingdom ethics.",
    yearApprox: 28,
    yearLabel: "c. AD 28",
    period: "Life of Christ",
    category: "teaching",
    locationName: "Capernaum",
    verses: [
      { bookId: 40, chapter: 5, verse: 3 },
      { bookId: 40, chapter: 5, verse: 44 },
      { bookId: 40, chapter: 6, verse: 9 },
    ],
  },
  {
    title: "Crucifixion of Jesus",
    description: "Jesus is crucified outside Jerusalem at Golgotha, bearing the sins of the world. The sky darkens, the temple veil tears, and Jesus declares, 'It is finished.'",
    yearApprox: 30,
    yearLabel: "c. AD 30",
    period: "Life of Christ",
    category: "redemption",
    locationName: "Jerusalem",
    verses: [
      { bookId: 43, chapter: 19, verse: 30 },
      { bookId: 40, chapter: 27, verse: 51 },
      { bookId: 42, chapter: 23, verse: 46 },
    ],
  },
  {
    title: "Resurrection of Jesus",
    description: "On the third day, Jesus rises from the dead, appearing first to Mary Magdalene and then to the disciples. The resurrection validates His identity as the Son of God.",
    yearApprox: 30,
    yearLabel: "c. AD 30",
    period: "Life of Christ",
    category: "redemption",
    locationName: "Jerusalem",
    verses: [
      { bookId: 40, chapter: 28, verse: 6 },
      { bookId: 43, chapter: 20, verse: 16 },
    ],
  },
  {
    title: "Day of Pentecost",
    description: "The Holy Spirit descends on the believers in Jerusalem with tongues of fire. Peter preaches and about 3,000 people believe and are baptized, launching the Church.",
    yearApprox: 30,
    yearLabel: "c. AD 30",
    period: "Early Church",
    category: "church",
    locationName: "Jerusalem",
    verses: [
      { bookId: 44, chapter: 2, verse: 4 },
      { bookId: 44, chapter: 2, verse: 41 },
    ],
  },
  {
    title: "Conversion of Paul",
    description: "Saul of Tarsus, a fierce persecutor of Christians, encounters the risen Christ on the road to Damascus and is radically transformed into the apostle Paul.",
    yearApprox: 34,
    yearLabel: "c. AD 34",
    period: "Early Church",
    category: "conversion",
    locationName: "Damascus",
    verses: [
      { bookId: 44, chapter: 9, verse: 3 },
      { bookId: 44, chapter: 9, verse: 15 },
    ],
  },
  {
    title: "Council of Jerusalem",
    description: "The apostles and elders gather in Jerusalem to resolve whether Gentile converts must follow Jewish law. They decide that faith in Christ alone is sufficient for salvation.",
    yearApprox: 49,
    yearLabel: "c. AD 49",
    period: "Early Church",
    category: "church",
    locationName: "Jerusalem",
    verses: [
      { bookId: 44, chapter: 15, verse: 19 },
      { bookId: 44, chapter: 15, verse: 28 },
    ],
  },
  {
    title: "Paul's Mission to Europe",
    description: "Paul receives a vision of a man from Macedonia calling for help. He crosses into Europe, establishing churches in Philippi, Thessalonica, and Corinth.",
    yearApprox: 50,
    yearLabel: "c. AD 50",
    period: "Early Church",
    category: "mission",
    locationName: "Philippi",
    verses: [
      { bookId: 44, chapter: 16, verse: 9 },
      { bookId: 44, chapter: 16, verse: 10 },
    ],
  },
  {
    title: "John's Vision on Patmos",
    description: "The apostle John, exiled on the island of Patmos, receives apocalyptic visions of the end times, the return of Christ, and the new heaven and new earth.",
    yearApprox: 95,
    yearLabel: "c. AD 95",
    period: "Apocalyptic",
    category: "prophecy",
    locationName: "Patmos",
    verses: [
      { bookId: 66, chapter: 1, verse: 9 },
      { bookId: 66, chapter: 21, verse: 1 },
      { bookId: 66, chapter: 21, verse: 4 },
    ],
  },
];

async function seed() {
  console.log("Seeding timeline events...");

  const translationRecord = await db
    .select()
    .from(bibleTranslations)
    .where(eq(bibleTranslations.abbreviation, "KJV"))
    .limit(1);

  if (!translationRecord.length) {
    console.error("KJV translation not found. Run translation seeds first.");
    await pool.end();
    process.exit(1);
  }

  const translationId = translationRecord[0].id;

  const allLocations = await db.select().from(locations);
  const locationMap = new Map<string, string>();
  for (const loc of allLocations) {
    locationMap.set(loc.name, loc.id);
  }

  let eventsSeeded = 0;
  let verseMapsSeeded = 0;

  for (const event of TIMELINE_DATA) {
    const locationId = event.locationName
      ? locationMap.get(event.locationName) ?? null
      : null;

    if (event.locationName && !locationId) {
      console.warn(`Location not found: "${event.locationName}" — skipping link for event "${event.title}"`);
    }

    const inserted = await db
      .insert(timelineEvents)
      .values({
        title: event.title,
        description: event.description,
        yearApprox: event.yearApprox,
        yearLabel: event.yearLabel,
        period: event.period,
        category: event.category,
        locationId,
      })
      .returning();

    const eventId = inserted[0].id;
    eventsSeeded++;

    for (const ref of event.verses) {
      const verse = await db
        .select()
        .from(bibleVerses)
        .where(
          and(
            eq(bibleVerses.translationId, translationId),
            eq(bibleVerses.bookId, ref.bookId),
            eq(bibleVerses.chapter, ref.chapter),
            eq(bibleVerses.verse, ref.verse)
          )
        )
        .limit(1);

      if (verse.length) {
        await db
          .insert(eventVerseMaps)
          .values({ eventId, verseId: verse[0].id })
          .onConflictDoNothing();
        verseMapsSeeded++;
      } else {
        const book = await db
          .select()
          .from(bibleBooks)
          .where(eq(bibleBooks.id, ref.bookId))
          .limit(1);
        const bookName = book.length ? book[0].name : `Book ${ref.bookId}`;
        console.warn(`Verse not found: ${bookName} ${ref.chapter}:${ref.verse}`);
      }
    }
  }

  console.log(`Seeded ${eventsSeeded} timeline events.`);
  console.log(`Seeded ${verseMapsSeeded} event-verse mappings.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
