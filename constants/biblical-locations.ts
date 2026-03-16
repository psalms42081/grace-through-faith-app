export interface LocationTimelineEvent {
  title: string;
  dateLabel: string;
  shortDescription: string;
}

export interface BiblicalPeopleGroup {
  id: string;
  name: string;
  regionLabel: string;
  description: string;
  keyPassages: string[];
  relatedLocationIds: string[];
  eras: string[];
}

export interface BiblicalLocation {
  id: string;
  name: string;
  modernLocation: string;
  modernCountry: string;
  ancientRegion: string;
  latitude: number;
  longitude: number;
  description: string;
  keyEvents: string[];
  keyPeople: string[];
  passages: string[];
  nearbyLocations: string[];
  eras: string[];
  timelineEvents: LocationTimelineEvent[];
  relatedPeopleGroupIds: string[];
}

export const ERA_OPTIONS = [
  "All",
  "Patriarchs",
  "Exodus",
  "Kingdom",
  "Exile",
  "Life of Christ",
  "Early Church",
] as const;

export type EraFilter = (typeof ERA_OPTIONS)[number];

export type OverlayType = "none" | "people-groups";

export const OVERLAY_OPTIONS: { value: OverlayType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "people-groups", label: "People Groups" },
];

export const BIBLICAL_PEOPLE_GROUPS: BiblicalPeopleGroup[] = [
  {
    id: "philistines",
    name: "Philistines",
    regionLabel: "Coastal Plain (Gaza, Ashkelon, Ekron)",
    description:
      "A sea-faring people who settled along the southern coastal plain of Canaan. The Philistines were persistent adversaries of Israel from the period of the Judges through the early monarchy, most famously through the champion warrior Goliath.",
    keyPassages: [
      "Judges 14-16",
      "1 Samuel 4-6",
      "1 Samuel 17",
      "2 Samuel 5:17-25",
    ],
    relatedLocationIds: ["jerusalem"],
    eras: ["Exodus", "Kingdom"],
  },
  {
    id: "moabites",
    name: "Moabites",
    regionLabel: "East of the Dead Sea (Transjordan)",
    description:
      "Descendants of Lot who inhabited the plateau east of the Dead Sea. Though often in conflict with Israel, the Moabite Ruth became an ancestor of King David and, ultimately, of Jesus Christ.",
    keyPassages: [
      "Genesis 19:36-37",
      "Numbers 22-24",
      "Ruth 1:1-4",
      "2 Kings 3",
    ],
    relatedLocationIds: ["jordan-river", "bethlehem"],
    eras: ["Patriarchs", "Exodus", "Kingdom"],
  },
  {
    id: "edomites",
    name: "Edomites",
    regionLabel: "South of the Dead Sea (Seir)",
    description:
      "Descendants of Esau, Jacob's brother, who settled in the mountainous region of Seir south of the Dead Sea. Their relationship with Israel was marked by rivalry rooted in the conflict between the twin brothers.",
    keyPassages: [
      "Genesis 25:30",
      "Genesis 36:1-8",
      "Numbers 20:14-21",
      "Obadiah 1",
    ],
    relatedLocationIds: ["jerusalem"],
    eras: ["Patriarchs", "Exodus", "Kingdom"],
  },
  {
    id: "cushites",
    name: "Cushites",
    regionLabel: "Upper Nile (ancient Nubia / Ethiopia)",
    description:
      "People from the land of Cush, located south of Egypt in the upper Nile region. Cush is mentioned prominently in the Table of Nations and appears throughout Scripture in both military and prophetic contexts.",
    keyPassages: [
      "Genesis 10:6-8",
      "2 Chronicles 14:9-15",
      "Jeremiah 13:23",
      "Zephaniah 3:10",
    ],
    relatedLocationIds: [],
    eras: ["Patriarchs", "Kingdom"],
  },
  {
    id: "hittites",
    name: "Hittites",
    regionLabel: "Anatolia and northern Canaan",
    description:
      "A powerful ancient people centered in Anatolia (modern Turkey) who also had settlements in Canaan. In Scripture, Hittites appear as Canaan's inhabitants during the patriarchal era and as individuals in David's inner circle, including Uriah the Hittite.",
    keyPassages: [
      "Genesis 23:1-20",
      "Exodus 3:8",
      "2 Samuel 11:3",
      "1 Kings 10:29",
    ],
    relatedLocationIds: ["jerusalem"],
    eras: ["Patriarchs", "Kingdom"],
  },
  {
    id: "amorites",
    name: "Amorites",
    regionLabel: "Hill country of Canaan and Transjordan",
    description:
      "One of the major Canaanite peoples who occupied the hill country on both sides of the Jordan River. The defeat of the Amorite kings Sihon and Og was a defining event in Israel's conquest of the Promised Land.",
    keyPassages: [
      "Genesis 15:16",
      "Numbers 21:21-35",
      "Deuteronomy 3:1-11",
      "Joshua 10:1-27",
    ],
    relatedLocationIds: ["jordan-river", "jerusalem"],
    eras: ["Patriarchs", "Exodus"],
  },
  {
    id: "canaanites",
    name: "Canaanites",
    regionLabel: "Land of Canaan (broadly)",
    description:
      "The collective term for the various peoples inhabiting the land of Canaan before and during Israel's settlement. Their religious practices, centered on Baal worship, became a persistent source of spiritual conflict for Israel throughout the Old Testament.",
    keyPassages: [
      "Genesis 12:6",
      "Exodus 3:8",
      "Joshua 3:10",
      "Judges 1:27-33",
    ],
    relatedLocationIds: ["jerusalem", "jordan-river"],
    eras: ["Patriarchs", "Exodus", "Kingdom"],
  },
];

export const BIBLICAL_LOCATIONS: BiblicalLocation[] = [
  {
    id: "nazareth",
    name: "Nazareth",
    modernLocation: "Nazareth",
    modernCountry: "Israel",
    ancientRegion: "Lower Galilee",
    latitude: 32.6996,
    longitude: 35.3035,
    description:
      "A small, obscure village in lower Galilee where Jesus grew up. In the first century, Nazareth was an insignificant town of perhaps 400 people, yet it became central to the story of salvation as the childhood home of the Messiah.",
    keyEvents: [
      "Angel Gabriel announces to Mary that she will bear the Son of God (Luke 1:26-38)",
      "Jesus grows up here with Joseph and Mary (Luke 2:39-40, 51-52)",
      "Jesus rejected by His hometown synagogue (Luke 4:16-30)",
      "Nathanael asks 'Can anything good come from Nazareth?' (John 1:46)",
    ],
    keyPeople: ["Jesus", "Mary", "Joseph"],
    passages: [
      "Luke 1:26-38",
      "Luke 2:39-40",
      "Luke 4:16-30",
      "John 1:45-46",
      "Matthew 2:23",
    ],
    nearbyLocations: ["capernaum", "sea-of-galilee"],
    eras: ["Life of Christ"],
    timelineEvents: [
      {
        title: "Jesus raised in Nazareth",
        dateLabel: "c. 4 BC\u2013AD 30",
        shortDescription:
          "Nazareth was the hometown of Jesus during His early life and ministry.",
      },
    ],
    relatedPeopleGroupIds: [],
  },
  {
    id: "bethlehem",
    name: "Bethlehem",
    modernLocation: "Bethlehem",
    modernCountry: "Palestinian Territories",
    ancientRegion: "Judah",
    latitude: 31.7054,
    longitude: 35.2024,
    description:
      "A small town five miles south of Jerusalem, Bethlehem means 'House of Bread.' It was the ancestral home of King David and the prophesied birthplace of the Messiah. Rachel was buried nearby, and Ruth gleaned in its fields.",
    keyEvents: [
      "Rachel dies and is buried near Bethlehem (Genesis 35:19)",
      "Ruth gleans in the fields of Boaz (Ruth 2:1-4)",
      "David anointed king by Samuel (1 Samuel 16:1-13)",
      "Jesus born in a manger (Luke 2:4-7)",
      "Wise men visit the child Jesus (Matthew 2:1-12)",
      "Herod orders the massacre of infants (Matthew 2:16-18)",
    ],
    keyPeople: ["Jesus", "David", "Ruth", "Boaz", "Rachel", "Samuel"],
    passages: [
      "Micah 5:2",
      "Luke 2:4-7",
      "Matthew 2:1-12",
      "1 Samuel 16:1-13",
      "Ruth 2:1-4",
    ],
    nearbyLocations: ["jerusalem"],
    eras: ["Kingdom", "Life of Christ"],
    timelineEvents: [
      {
        title: "David's hometown",
        dateLabel: "c. 1000 BC",
        shortDescription:
          "Bethlehem was closely tied to the rise of King David.",
      },
      {
        title: "Birth of Jesus",
        dateLabel: "c. 4 BC",
        shortDescription:
          "Bethlehem is the birthplace of Jesus and also the city of David.",
      },
    ],
    relatedPeopleGroupIds: ["moabites"],
  },
  {
    id: "jerusalem",
    name: "Jerusalem",
    modernLocation: "Jerusalem",
    modernCountry: "Israel",
    ancientRegion: "Judah",
    latitude: 31.7683,
    longitude: 35.2137,
    description:
      "The holy city and capital of ancient Israel, set on a hilltop plateau in the Judean mountains. Jerusalem has been the spiritual center of Judaism and Christianity for over 3,000 years. Site of Solomon's Temple, the crucifixion, resurrection, and the birth of the early church at Pentecost.",
    keyEvents: [
      "Abraham offers Isaac on Mount Moriah (Genesis 22:1-14)",
      "David captures the city from the Jebusites (2 Samuel 5:6-9)",
      "Solomon builds the First Temple (1 Kings 6)",
      "Nebuchadnezzar destroys the Temple, beginning the Exile (2 Kings 25)",
      "Jesus weeps over the city (Luke 19:41-44)",
      "The crucifixion and resurrection (Matthew 27-28)",
      "The Holy Spirit poured out at Pentecost (Acts 2)",
    ],
    keyPeople: [
      "David",
      "Solomon",
      "Jesus",
      "Peter",
      "Paul",
      "Nehemiah",
      "Isaiah",
    ],
    passages: [
      "Psalm 122:6",
      "Matthew 23:37",
      "Acts 2:1-4",
      "Luke 19:41-44",
      "2 Samuel 5:6-9",
      "1 Kings 6:1",
    ],
    nearbyLocations: ["bethlehem"],
    eras: ["Kingdom", "Exile", "Life of Christ", "Early Church"],
    timelineEvents: [
      {
        title: "Temple worship under the kings",
        dateLabel: "c. 1000\u2013586 BC",
        shortDescription:
          "Jerusalem became the political and spiritual center of Judah.",
      },
      {
        title: "Fall of Jerusalem",
        dateLabel: "586 BC",
        shortDescription:
          "Babylon destroyed Jerusalem and the temple.",
      },
      {
        title: "Crucifixion and resurrection era",
        dateLabel: "c. AD 30",
        shortDescription:
          "Jerusalem is central to the final week, crucifixion, and resurrection of Jesus.",
      },
      {
        title: "Pentecost and early church",
        dateLabel: "c. AD 30+",
        shortDescription:
          "The early church began its public witness in Jerusalem.",
      },
    ],
    relatedPeopleGroupIds: ["canaanites", "hittites", "philistines", "amorites"],
  },
  {
    id: "capernaum",
    name: "Capernaum",
    modernLocation: "Kfar Nahum",
    modernCountry: "Israel",
    ancientRegion: "Galilee",
    latitude: 32.8814,
    longitude: 35.5753,
    description:
      "A fishing village on the northern shore of the Sea of Galilee that Jesus made the center of His Galilean ministry. Often called 'His own city' (Matthew 9:1), Capernaum was home to Peter, Andrew, James, and John. Many of Jesus' most significant miracles occurred here.",
    keyEvents: [
      "Jesus settles in Capernaum, fulfilling Isaiah's prophecy (Matthew 4:13-16)",
      "Healing of the centurion's servant (Matthew 8:5-13)",
      "Healing of the paralytic lowered through the roof (Mark 2:1-12)",
      "Jesus teaches in the synagogue about the Bread of Life (John 6:24-59)",
      "Jesus calls Matthew the tax collector (Matthew 9:9)",
      "Jesus denounces the city for unbelief (Matthew 11:23-24)",
    ],
    keyPeople: ["Jesus", "Peter", "Andrew", "James", "John", "Matthew"],
    passages: [
      "Matthew 4:13-16",
      "Mark 2:1-12",
      "Matthew 8:5-13",
      "John 6:24-59",
      "Matthew 9:9",
    ],
    nearbyLocations: ["sea-of-galilee", "nazareth"],
    eras: ["Life of Christ"],
    timelineEvents: [
      {
        title: "Jesus' Galilean ministry base",
        dateLabel: "c. AD 27\u201330",
        shortDescription:
          "Many miracles and teachings of Jesus took place in and around Capernaum.",
      },
    ],
    relatedPeopleGroupIds: [],
  },
  {
    id: "babylon",
    name: "Babylon",
    modernLocation: "Hillah",
    modernCountry: "Iraq",
    ancientRegion: "Mesopotamia (Shinar)",
    latitude: 32.5421,
    longitude: 44.421,
    description:
      "Capital of the Neo-Babylonian Empire under Nebuchadnezzar II, known for its massive walls, Hanging Gardens, and the Ishtar Gate. The Israelites were exiled here in 586 BC after the destruction of Solomon's Temple. Throughout Scripture, Babylon symbolizes human pride, idolatry, and opposition to God.",
    keyEvents: [
      "The Tower of Babel built on the plain of Shinar (Genesis 11:1-9)",
      "Nebuchadnezzar destroys Jerusalem and deports the Israelites (2 Kings 25)",
      "Daniel and his companions taken captive to Babylon (Daniel 1)",
      "Shadrach, Meshach, and Abednego in the fiery furnace (Daniel 3)",
      "The writing on the wall at Belshazzar's feast (Daniel 5)",
      "Daniel in the lion's den (Daniel 6)",
    ],
    keyPeople: [
      "Daniel",
      "Nebuchadnezzar",
      "Shadrach",
      "Meshach",
      "Abednego",
      "Ezekiel",
      "Jeremiah",
    ],
    passages: [
      "Psalm 137:1",
      "Daniel 1:1-6",
      "Daniel 3",
      "Jeremiah 29:10",
      "2 Kings 25:1-11",
      "Revelation 17-18",
    ],
    nearbyLocations: [],
    eras: ["Exile"],
    timelineEvents: [
      {
        title: "Judah taken into exile",
        dateLabel: "605\u2013586 BC",
        shortDescription:
          "Babylon became the destination of Judah's exile and the setting of Daniel's early life.",
      },
    ],
    relatedPeopleGroupIds: [],
  },
  {
    id: "damascus",
    name: "Damascus",
    modernLocation: "Damascus",
    modernCountry: "Syria",
    ancientRegion: "Aram (Syria)",
    latitude: 33.5138,
    longitude: 36.2765,
    description:
      "One of the oldest continuously inhabited cities in the world, Damascus was the capital of ancient Aram (Syria). It appears in Scripture from the time of Abraham through the early church. Most famously, it is the city near which Saul of Tarsus was dramatically converted to become the apostle Paul.",
    keyEvents: [
      "Abraham's servant Eliezer is from Damascus (Genesis 15:2)",
      "David garrisons Damascus after defeating the Arameans (2 Samuel 8:5-6)",
      "Naaman the Syrian comes from Damascus seeking healing (2 Kings 5)",
      "Saul's dramatic conversion on the road to Damascus (Acts 9:1-19)",
      "Paul escapes Damascus in a basket through the wall (Acts 9:23-25)",
    ],
    keyPeople: ["Paul (Saul)", "Ananias", "Naaman", "Eliezer", "David"],
    passages: [
      "Acts 9:1-19",
      "Acts 9:23-25",
      "2 Kings 5:1-14",
      "Genesis 15:2",
      "2 Corinthians 11:32-33",
    ],
    nearbyLocations: ["jerusalem"],
    eras: ["Kingdom", "Early Church"],
    timelineEvents: [
      {
        title: "Aramean capital",
        dateLabel: "Old Testament period",
        shortDescription:
          "Damascus was a major regional center in Old Testament history.",
      },
      {
        title: "Saul's conversion route",
        dateLabel: "c. AD 34",
        shortDescription:
          "Damascus is linked with Saul's conversion and early Christian mission.",
      },
    ],
    relatedPeopleGroupIds: ["hittites"],
  },
  {
    id: "jordan-river",
    name: "Jordan River",
    modernLocation: "Jordan River",
    modernCountry: "Israel / Jordan",
    ancientRegion: "Biblical Israel / Transjordan",
    latitude: 31.8364,
    longitude: 35.5504,
    description:
      "The major river flowing 156 miles from the slopes of Mount Hermon through the Sea of Galilee to the Dead Sea. The Jordan marks the boundary Israel crossed to enter the Promised Land and the place where Jesus was baptized by John, launching His public ministry.",
    keyEvents: [
      "Israel crosses the Jordan on dry ground to enter the Promised Land (Joshua 3:14-17)",
      "Elijah and Elisha cross the Jordan before Elijah's ascension (2 Kings 2:7-8)",
      "Naaman healed of leprosy by washing in the Jordan (2 Kings 5:10-14)",
      "John the Baptist baptizes at the Jordan (Matthew 3:1-6)",
      "Jesus is baptized by John in the Jordan (Matthew 3:13-17)",
    ],
    keyPeople: [
      "Joshua",
      "Elijah",
      "Elisha",
      "Naaman",
      "John the Baptist",
      "Jesus",
    ],
    passages: [
      "Joshua 3:14-17",
      "Matthew 3:13-17",
      "2 Kings 5:10-14",
      "2 Kings 2:7-8",
      "Mark 1:9-11",
    ],
    nearbyLocations: ["sea-of-galilee"],
    eras: ["Exodus", "Life of Christ"],
    timelineEvents: [
      {
        title: "Israel crosses into the land",
        dateLabel: "c. 1400 BC",
        shortDescription:
          "The Jordan River marked Israel's entry into the promised land.",
      },
      {
        title: "Baptism of Jesus",
        dateLabel: "c. AD 27",
        shortDescription:
          "Jesus was baptized in the Jordan, marking the beginning of His public ministry.",
      },
    ],
    relatedPeopleGroupIds: ["moabites", "canaanites", "amorites"],
  },
  {
    id: "sea-of-galilee",
    name: "Sea of Galilee",
    modernLocation: "Lake Kinneret",
    modernCountry: "Israel",
    ancientRegion: "Galilee",
    latitude: 32.8231,
    longitude: 35.5831,
    description:
      "A freshwater lake 13 miles long and 8 miles wide in northern Israel, also called the Sea of Tiberias and Lake Gennesaret. Jesus called His first disciples from its fishing villages and performed many miracles on and around its waters. It was the center of His Galilean ministry.",
    keyEvents: [
      "Jesus calls Peter, Andrew, James, and John from their fishing boats (Matthew 4:18-22)",
      "Jesus calms a violent storm (Mark 4:35-41)",
      "Jesus walks on water (Matthew 14:22-33)",
      "Miraculous catch of fish (Luke 5:1-11)",
      "The feeding of the 5,000 on its shores (John 6:1-14)",
      "Jesus appears to disciples after resurrection at the shore (John 21:1-14)",
    ],
    keyPeople: ["Jesus", "Peter", "Andrew", "James", "John"],
    passages: [
      "Matthew 4:18-22",
      "Mark 4:35-41",
      "Matthew 14:22-33",
      "John 6:1-14",
      "John 21:1-14",
    ],
    nearbyLocations: ["capernaum", "nazareth", "jordan-river"],
    eras: ["Life of Christ"],
    timelineEvents: [
      {
        title: "Ministry around the lake",
        dateLabel: "c. AD 27\u201330",
        shortDescription:
          "Jesus taught, called disciples, and performed miracles around the Sea of Galilee.",
      },
    ],
    relatedPeopleGroupIds: [],
  },
];

export function getLocationById(id: string): BiblicalLocation | undefined {
  return BIBLICAL_LOCATIONS.find((loc) => loc.id === id);
}

export function getLocationByName(name: string): BiblicalLocation | undefined {
  return BIBLICAL_LOCATIONS.find(
    (loc) => loc.name.toLowerCase() === name.toLowerCase(),
  );
}

export function getLocationsByEra(era: EraFilter): BiblicalLocation[] {
  if (era === "All") return BIBLICAL_LOCATIONS;
  return BIBLICAL_LOCATIONS.filter((loc) => loc.eras.includes(era));
}

export function getPeopleGroupById(id: string): BiblicalPeopleGroup | undefined {
  return BIBLICAL_PEOPLE_GROUPS.find((pg) => pg.id === id);
}

export function getPeopleGroupsForLocation(locationId: string): BiblicalPeopleGroup[] {
  const location = getLocationById(locationId);
  if (!location) return [];
  return location.relatedPeopleGroupIds
    .map((pgId) => getPeopleGroupById(pgId))
    .filter((pg): pg is BiblicalPeopleGroup => !!pg);
}
