import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";
import { locations, locationVerseMaps, bibleVerses, bibleTranslations } from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const LOCATIONS = [
  {
    name: "Jerusalem",
    modernName: "Jerusalem, Israel",
    latitude: "31.7683",
    longitude: "35.2137",
    description: "The holy city and capital of ancient Israel, site of Solomon's Temple and the crucifixion and resurrection of Jesus Christ. Central to Jewish, Christian, and Islamic faith.",
    locationType: "city",
    era: "Patriarchs to Early Church",
  },
  {
    name: "Bethlehem",
    modernName: "Bethlehem, Palestinian Territories",
    latitude: "31.7054",
    longitude: "35.2024",
    description: "Birthplace of King David and Jesus Christ. A small town south of Jerusalem with profound significance in messianic prophecy.",
    locationType: "city",
    era: "United Kingdom to Life of Christ",
  },
  {
    name: "Nazareth",
    modernName: "Nazareth, Israel",
    latitude: "32.6996",
    longitude: "35.3035",
    description: "Childhood home of Jesus in lower Galilee. A small, obscure village in the first century from which few expected anything significant to emerge.",
    locationType: "city",
    era: "Life of Christ",
  },
  {
    name: "Capernaum",
    modernName: "Kfar Nahum, Israel",
    latitude: "32.8814",
    longitude: "35.5753",
    description: "A fishing village on the northern shore of the Sea of Galilee. Jesus made it the center of His Galilean ministry, performing many miracles there.",
    locationType: "city",
    era: "Life of Christ",
  },
  {
    name: "Jericho",
    modernName: "Ariha (Jericho), Palestinian Territories",
    latitude: "31.8611",
    longitude: "35.4597",
    description: "One of the oldest continuously inhabited cities in the world. Famous for its walls falling under Joshua and as the setting for Jesus' encounter with Zacchaeus.",
    locationType: "city",
    era: "Conquest & Judges to Life of Christ",
  },
  {
    name: "Babylon",
    modernName: "Hillah, Iraq",
    latitude: "32.5421",
    longitude: "44.4210",
    description: "Capital of the Neo-Babylonian Empire under Nebuchadnezzar II. The Israelites were exiled here in 586 BC. Symbolizes human pride and opposition to God throughout Scripture.",
    locationType: "city",
    era: "Exile & Return",
  },
  {
    name: "Egypt (Goshen)",
    modernName: "Eastern Nile Delta, Egypt",
    latitude: "30.8569",
    longitude: "31.9003",
    description: "The region in the eastern Nile Delta where the Israelites settled during Joseph's time and were later enslaved. The setting of the Exodus narrative.",
    locationType: "region",
    era: "Patriarchs to Exodus",
  },
  {
    name: "Mount Sinai",
    modernName: "Jebel Musa, Sinai Peninsula, Egypt",
    latitude: "28.5394",
    longitude: "33.9753",
    description: "The mountain where God gave Moses the Ten Commandments and established the Mosaic covenant with Israel. Also called Horeb.",
    locationType: "mountain",
    era: "Exodus & Wilderness",
  },
  {
    name: "Damascus",
    modernName: "Damascus, Syria",
    latitude: "33.5138",
    longitude: "36.2765",
    description: "One of the oldest continuously inhabited cities. Site of Saul's dramatic conversion on the road to Damascus, transforming him into the apostle Paul.",
    locationType: "city",
    era: "Patriarchs to Early Church",
  },
  {
    name: "Antioch",
    modernName: "Antakya, Turkey",
    latitude: "36.2021",
    longitude: "36.1602",
    description: "The city where followers of Jesus were first called Christians. A major center for early Gentile Christianity and the launching point for Paul's missionary journeys.",
    locationType: "city",
    era: "Early Church",
  },
  {
    name: "Corinth",
    modernName: "Korinthos, Greece",
    latitude: "37.9060",
    longitude: "22.8806",
    description: "A prosperous and morally diverse Greek city where Paul established a church and wrote two major epistles. Known for its commerce and pagan temples.",
    locationType: "city",
    era: "Early Church",
  },
  {
    name: "Ephesus",
    modernName: "Selcuk, Turkey",
    latitude: "37.9414",
    longitude: "27.3418",
    description: "A major city in Roman Asia Minor, home to the Temple of Artemis. Paul spent over two years here, and the church received one of the seven letters in Revelation.",
    locationType: "city",
    era: "Early Church",
  },
  {
    name: "Rome",
    modernName: "Rome, Italy",
    latitude: "41.9028",
    longitude: "12.4964",
    description: "Capital of the Roman Empire. Paul wrote his epistle to believers there and was eventually martyred in the city. Central to the spread of early Christianity.",
    locationType: "city",
    era: "Early Church",
  },
  {
    name: "Sea of Galilee",
    modernName: "Lake Kinneret, Israel",
    latitude: "32.8231",
    longitude: "35.5831",
    description: "A freshwater lake in northern Israel where Jesus called His first disciples, walked on water, calmed a storm, and performed many miracles along its shores.",
    locationType: "body_of_water",
    era: "Life of Christ",
  },
  {
    name: "Jordan River",
    modernName: "Jordan River, Israel/Jordan",
    latitude: "31.8364",
    longitude: "35.5504",
    description: "The major river flowing from the Sea of Galilee to the Dead Sea. Israel crossed it to enter the Promised Land, and Jesus was baptized in its waters by John.",
    locationType: "body_of_water",
    era: "Conquest & Judges to Life of Christ",
  },
  {
    name: "Bethany",
    modernName: "Al-Eizariya, Palestinian Territories",
    latitude: "31.7700",
    longitude: "35.2580",
    description: "A village on the eastern slope of the Mount of Olives, home of Mary, Martha, and Lazarus. Jesus raised Lazarus from the dead here and often lodged in this village.",
    locationType: "city",
    era: "Life of Christ",
  },
  {
    name: "Samaria",
    modernName: "Sebastia, Palestinian Territories",
    latitude: "32.2769",
    longitude: "35.1927",
    description: "Capital of the northern kingdom of Israel. The region between Judea and Galilee, home to the Samaritans with whom Jews had deep-seated tensions. Jesus broke social barriers by ministering here.",
    locationType: "region",
    era: "Divided Kingdom to Life of Christ",
  },
  {
    name: "Nineveh",
    modernName: "Mosul, Iraq",
    latitude: "36.3600",
    longitude: "43.1500",
    description: "Capital of the Assyrian Empire and the city to which God sent the prophet Jonah. Its dramatic repentance in response to Jonah's preaching is one of Scripture's most surprising narratives.",
    locationType: "city",
    era: "Divided Kingdom",
  },
  {
    name: "Ur",
    modernName: "Tell el-Muqayyar, Iraq",
    latitude: "30.9627",
    longitude: "46.1031",
    description: "An ancient Sumerian city in Mesopotamia. The original home of Abraham before God called him to leave and journey to the Promised Land.",
    locationType: "city",
    era: "Patriarchs",
  },
  {
    name: "Hebron",
    modernName: "Hebron, Palestinian Territories",
    latitude: "31.5326",
    longitude: "35.0998",
    description: "One of the oldest cities in the world and the burial place of Abraham, Isaac, and Jacob. David's first capital before he moved to Jerusalem.",
    locationType: "city",
    era: "Patriarchs to United Kingdom",
  },
  {
    name: "Megiddo",
    modernName: "Tel Megiddo, Israel",
    latitude: "32.5847",
    longitude: "35.1847",
    description: "An ancient fortified city overlooking the Jezreel Valley. The prophesied site of the final battle of Armageddon (Har Megiddo). Strategically vital throughout biblical history.",
    locationType: "city",
    era: "Conquest & Judges to Apocalyptic",
  },
  {
    name: "Philippi",
    modernName: "Filippoi, Greece",
    latitude: "41.0145",
    longitude: "24.2862",
    description: "A Roman colony in Macedonia where Paul established the first European church. Lydia's conversion and Paul's imprisonment and miraculous release took place here.",
    locationType: "city",
    era: "Early Church",
  },
  {
    name: "Thessalonica",
    modernName: "Thessaloniki, Greece",
    latitude: "40.6401",
    longitude: "22.9444",
    description: "A major port city in Macedonia where Paul founded a church. He wrote two epistles to the Thessalonians addressing Christ's return and faithful living.",
    locationType: "city",
    era: "Early Church",
  },
  {
    name: "Patmos",
    modernName: "Patmos, Greece",
    latitude: "37.3125",
    longitude: "26.5489",
    description: "A small island in the Aegean Sea where the apostle John was exiled and received the visions recorded in the book of Revelation.",
    locationType: "region",
    era: "Early Church",
  },
  {
    name: "Garden of Eden Region",
    modernName: "Mesopotamia (modern Iraq/Turkey border region)",
    latitude: "33.0000",
    longitude: "44.0000",
    description: "The paradisiacal garden where God placed Adam and Eve. Its exact location is unknown, but biblical clues point to the Tigris-Euphrates river region in Mesopotamia.",
    locationType: "region",
    era: "Creation",
  },
  {
    name: "Mount Ararat",
    modernName: "Agri Dagi, Turkey",
    latitude: "39.7019",
    longitude: "44.2991",
    description: "The mountain range where Noah's ark came to rest after the great flood. Located in eastern Turkey near the Armenian border.",
    locationType: "mountain",
    era: "Patriarchs",
  },
  {
    name: "Mount Carmel",
    modernName: "Haifa, Israel",
    latitude: "32.7413",
    longitude: "35.0180",
    description: "The mountain where the prophet Elijah challenged the prophets of Baal to a dramatic contest of fire, demonstrating the power of the true God.",
    locationType: "mountain",
    era: "Divided Kingdom",
  },
  {
    name: "Tarsus",
    modernName: "Tarsus, Turkey",
    latitude: "36.9175",
    longitude: "34.8957",
    description: "Birthplace of the apostle Paul. A prosperous city in Cilicia known for its university and intellectual culture, contributing to Paul's dual identity as Jew and Roman citizen.",
    locationType: "city",
    era: "Early Church",
  },
];

interface VerseRef {
  bookId: number;
  chapter: number;
  verse: number;
  note: string;
}

const LOCATION_VERSE_REFS: Record<string, VerseRef[]> = {
  "Jerusalem": [
    { bookId: 19, chapter: 122, verse: 6, note: "Pray for the peace of Jerusalem" },
    { bookId: 40, chapter: 23, verse: 37, note: "Jesus laments over Jerusalem" },
    { bookId: 44, chapter: 2, verse: 1, note: "Pentecost in Jerusalem" },
  ],
  "Bethlehem": [
    { bookId: 33, chapter: 5, verse: 2, note: "Prophecy of the Messiah's birthplace" },
    { bookId: 42, chapter: 2, verse: 4, note: "Joseph travels to Bethlehem" },
  ],
  "Nazareth": [
    { bookId: 42, chapter: 1, verse: 26, note: "Angel Gabriel sent to Nazareth" },
    { bookId: 43, chapter: 1, verse: 46, note: "Can anything good come from Nazareth?" },
  ],
  "Capernaum": [
    { bookId: 40, chapter: 4, verse: 13, note: "Jesus settles in Capernaum" },
    { bookId: 41, chapter: 2, verse: 1, note: "Jesus teaches and heals in Capernaum" },
  ],
  "Jericho": [
    { bookId: 6, chapter: 6, verse: 20, note: "The walls of Jericho fall" },
    { bookId: 42, chapter: 19, verse: 1, note: "Jesus meets Zacchaeus in Jericho" },
  ],
  "Babylon": [
    { bookId: 19, chapter: 137, verse: 1, note: "By the rivers of Babylon we wept" },
    { bookId: 27, chapter: 1, verse: 1, note: "Daniel taken captive to Babylon" },
  ],
  "Egypt (Goshen)": [
    { bookId: 1, chapter: 47, verse: 6, note: "Pharaoh gives Goshen to Jacob's family" },
    { bookId: 2, chapter: 1, verse: 11, note: "Israel enslaved in Egypt" },
  ],
  "Mount Sinai": [
    { bookId: 2, chapter: 19, verse: 20, note: "The Lord descends on Sinai" },
    { bookId: 2, chapter: 20, verse: 1, note: "God speaks the Ten Commandments" },
  ],
  "Damascus": [
    { bookId: 44, chapter: 9, verse: 3, note: "Saul's conversion on the road to Damascus" },
    { bookId: 44, chapter: 9, verse: 19, note: "Saul begins preaching in Damascus" },
  ],
  "Antioch": [
    { bookId: 44, chapter: 11, verse: 26, note: "Disciples first called Christians at Antioch" },
    { bookId: 44, chapter: 13, verse: 1, note: "Paul and Barnabas sent from Antioch" },
  ],
  "Corinth": [
    { bookId: 44, chapter: 18, verse: 1, note: "Paul arrives in Corinth" },
    { bookId: 46, chapter: 1, verse: 2, note: "Paul writes to the church at Corinth" },
  ],
  "Ephesus": [
    { bookId: 44, chapter: 19, verse: 1, note: "Paul ministers in Ephesus" },
    { bookId: 66, chapter: 2, verse: 1, note: "Letter to the church in Ephesus" },
  ],
  "Rome": [
    { bookId: 45, chapter: 1, verse: 7, note: "Paul's letter to the Romans" },
    { bookId: 44, chapter: 28, verse: 16, note: "Paul arrives in Rome" },
  ],
  "Sea of Galilee": [
    { bookId: 40, chapter: 14, verse: 25, note: "Jesus walks on the Sea of Galilee" },
    { bookId: 41, chapter: 4, verse: 39, note: "Jesus calms the storm" },
  ],
  "Jordan River": [
    { bookId: 6, chapter: 3, verse: 17, note: "Israel crosses the Jordan" },
    { bookId: 40, chapter: 3, verse: 13, note: "Jesus baptized in the Jordan" },
  ],
  "Bethany": [
    { bookId: 43, chapter: 11, verse: 43, note: "Jesus raises Lazarus at Bethany" },
    { bookId: 42, chapter: 24, verse: 50, note: "Jesus ascends near Bethany" },
  ],
  "Samaria": [
    { bookId: 43, chapter: 4, verse: 7, note: "Jesus speaks with the Samaritan woman" },
    { bookId: 44, chapter: 8, verse: 5, note: "Philip preaches in Samaria" },
  ],
  "Nineveh": [
    { bookId: 32, chapter: 1, verse: 2, note: "God sends Jonah to Nineveh" },
    { bookId: 32, chapter: 3, verse: 5, note: "Nineveh repents at Jonah's preaching" },
  ],
  "Ur": [
    { bookId: 1, chapter: 11, verse: 31, note: "Terah takes Abram out of Ur" },
    { bookId: 1, chapter: 12, verse: 1, note: "God calls Abram to leave his homeland" },
  ],
  "Hebron": [
    { bookId: 1, chapter: 23, verse: 19, note: "Abraham buries Sarah at Hebron" },
    { bookId: 10, chapter: 2, verse: 11, note: "David reigns in Hebron" },
  ],
  "Megiddo": [
    { bookId: 12, chapter: 23, verse: 29, note: "King Josiah killed at Megiddo" },
    { bookId: 66, chapter: 16, verse: 16, note: "Armageddon (Har-Megiddo)" },
  ],
  "Philippi": [
    { bookId: 44, chapter: 16, verse: 12, note: "Paul arrives in Philippi" },
    { bookId: 50, chapter: 1, verse: 1, note: "Paul writes to the Philippians" },
  ],
  "Thessalonica": [
    { bookId: 44, chapter: 17, verse: 1, note: "Paul preaches in Thessalonica" },
    { bookId: 52, chapter: 1, verse: 1, note: "Paul writes to the Thessalonians" },
  ],
  "Patmos": [
    { bookId: 66, chapter: 1, verse: 9, note: "John exiled on Patmos receives vision" },
  ],
  "Garden of Eden Region": [
    { bookId: 1, chapter: 2, verse: 8, note: "God plants a garden eastward in Eden" },
    { bookId: 1, chapter: 3, verse: 23, note: "Adam and Eve expelled from Eden" },
  ],
  "Mount Ararat": [
    { bookId: 1, chapter: 8, verse: 4, note: "The ark rests on the mountains of Ararat" },
  ],
  "Mount Carmel": [
    { bookId: 11, chapter: 18, verse: 19, note: "Elijah challenges Baal's prophets on Carmel" },
    { bookId: 11, chapter: 18, verse: 38, note: "Fire of the Lord falls on Carmel" },
  ],
  "Tarsus": [
    { bookId: 44, chapter: 9, verse: 11, note: "Saul of Tarsus" },
    { bookId: 44, chapter: 21, verse: 39, note: "Paul identifies himself as from Tarsus" },
  ],
};

async function seed() {
  console.log("Seeding locations...");

  const translationRecord = await db
    .select()
    .from(bibleTranslations)
    .where(eq(bibleTranslations.abbreviation, "KJV"))
    .limit(1);

  if (!translationRecord.length) {
    console.error("KJV translation not found. Please seed translations first.");
    await pool.end();
    process.exit(1);
  }

  const translationId = translationRecord[0].id;

  const locationIdMap: Record<string, string> = {};

  for (const loc of LOCATIONS) {
    const existing = await db
      .select()
      .from(locations)
      .where(eq(locations.name, loc.name))
      .limit(1);

    if (existing.length) {
      locationIdMap[loc.name] = existing[0].id;
      console.log(`  Location "${loc.name}" already exists, skipping.`);
      continue;
    }

    const inserted = await db
      .insert(locations)
      .values(loc)
      .returning();

    locationIdMap[loc.name] = inserted[0].id;
    console.log(`  Inserted location: ${loc.name}`);
  }

  console.log(`\nSeeded ${LOCATIONS.length} locations.`);
  console.log("Seeding location-verse mappings...");

  let mappingCount = 0;

  for (const [locationName, refs] of Object.entries(LOCATION_VERSE_REFS)) {
    const locationId = locationIdMap[locationName];
    if (!locationId) {
      console.warn(`  No location ID found for "${locationName}", skipping verse refs.`);
      continue;
    }

    for (const ref of refs) {
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

      if (!verse.length) {
        console.warn(`  Verse not found: book=${ref.bookId} ch=${ref.chapter} v=${ref.verse}, skipping.`);
        continue;
      }

      await db
        .insert(locationVerseMaps)
        .values({
          locationId,
          verseId: verse[0].id,
          note: ref.note,
        })
        .onConflictDoNothing();

      mappingCount++;
    }
  }

  console.log(`Seeded ${mappingCount} location-verse mappings.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
