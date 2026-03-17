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
  prophecyLinkIds: string[];
  relatedJourneyRouteIds: string[];
  relatedKingdomIds: string[];
  relatedTribeIds: string[];
}

export interface BiblicalTribeOverlay {
  id: string;
  name: string;
  regionLabel: string;
  shortDescription: string;
  keyPassages: string[];
  relatedLocationIds: string[];
  color: string;
  centerLatitude: number;
  centerLongitude: number;
  periods: string[];
}

export interface BiblicalKingdomOverlay {
  id: string;
  name: string;
  eraLabel: string;
  shortDescription: string;
  keyPassages: string[];
  relatedLocationIds: string[];
  relatedProphecyLinkIds: string[];
  color: string;
  centerLatitude: number;
  centerLongitude: number;
  mapLabel: string;
  periods: string[];
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

export interface BiblicalProphecyLink {
  id: string;
  title: string;
  theme: string;
  description: string;
  keyPassages: string[];
  relatedLocationIds: string[];
  eras: string[];
}

export interface RouteSegment {
  fromLocationId: string;
  toLocationId: string;
  label?: string;
}

export interface BiblicalJourneyRoute {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  eras: string[];
  keyPassages: string[];
  stopLocationIds: string[];
  routeSegments: RouteSegment[];
}

export type OverlayType = "none" | "people-groups" | "prophecy" | "journey-routes" | "kingdoms" | "tribes";

export const OVERLAY_OPTIONS: { value: OverlayType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "people-groups", label: "People Groups" },
  { value: "prophecy", label: "Prophecy" },
  { value: "journey-routes", label: "Journey Routes" },
  { value: "kingdoms", label: "Kingdoms" },
  { value: "tribes", label: "Tribes of Israel" },
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
    prophecyLinkIds: [],
    relatedJourneyRouteIds: [],
    relatedKingdomIds: ["rome"],
    relatedTribeIds: ["naphtali"],
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
    prophecyLinkIds: [],
    relatedJourneyRouteIds: [],
    relatedKingdomIds: ["rome"],
    relatedTribeIds: ["judah"],
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
    prophecyLinkIds: ["prophecy-jerusalem"],
    relatedJourneyRouteIds: ["paul-journey-2", "paul-journey-3"],
    relatedKingdomIds: ["assyria", "babylon-empire", "medo-persia", "greece", "rome"],
    relatedTribeIds: ["judah", "benjamin", "levi"],
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
    prophecyLinkIds: [],
    relatedJourneyRouteIds: [],
    relatedKingdomIds: ["rome"],
    relatedTribeIds: ["naphtali"],
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
    prophecyLinkIds: ["prophecy-babylon"],
    relatedJourneyRouteIds: [],
    relatedKingdomIds: ["babylon-empire", "medo-persia"],
    relatedTribeIds: [],
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
    prophecyLinkIds: [],
    relatedJourneyRouteIds: [],
    relatedKingdomIds: ["assyria"],
    relatedTribeIds: [],
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
    prophecyLinkIds: ["prophecy-jordan-river"],
    relatedJourneyRouteIds: ["exodus-route"],
    relatedKingdomIds: ["egypt"],
    relatedTribeIds: ["manasseh"],
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
    prophecyLinkIds: ["prophecy-sea-of-galilee"],
    relatedJourneyRouteIds: [],
    relatedKingdomIds: ["rome"],
    relatedTribeIds: ["naphtali"],
  },
  {
    id: "egypt-goshen",
    name: "Goshen (Egypt)",
    modernLocation: "Eastern Nile Delta",
    modernCountry: "Egypt",
    ancientRegion: "Goshen / Land of Egypt",
    latitude: 30.78,
    longitude: 31.82,
    description:
      "The fertile region in the eastern Nile Delta where Jacob's family settled during the famine. Goshen became the home of the Israelites during their centuries in Egypt and the departure point of the Exodus under Moses.",
    keyEvents: [
      "Jacob and his family settle in Goshen at Joseph's invitation (Genesis 47:1-6)",
      "The Israelites multiply greatly in the land (Exodus 1:7)",
      "The first Passover observed before the Exodus (Exodus 12:1-28)",
      "Israel departs Egypt (Exodus 12:37-42)",
    ],
    keyPeople: ["Moses", "Aaron", "Jacob", "Joseph", "Pharaoh"],
    passages: ["Genesis 47:1-6", "Exodus 1:7", "Exodus 12:1-28", "Exodus 12:37-42"],
    nearbyLocations: [],
    eras: ["Patriarchs", "Exodus"],
    timelineEvents: [
      {
        title: "Israel in Egypt",
        dateLabel: "c. 1876\u20131446 BC",
        shortDescription: "The Israelites lived in Goshen for over 400 years before the Exodus.",
      },
    ],
    relatedPeopleGroupIds: [],
    prophecyLinkIds: [],
    relatedJourneyRouteIds: ["exodus-route"],
    relatedKingdomIds: ["egypt"],
    relatedTribeIds: [],
  },
  {
    id: "mount-sinai",
    name: "Mount Sinai",
    modernLocation: "Jebel Musa (traditional)",
    modernCountry: "Egypt (Sinai Peninsula)",
    ancientRegion: "Wilderness of Sinai",
    latitude: 28.5392,
    longitude: 33.9757,
    description:
      "The sacred mountain where God revealed Himself to Moses in the burning bush and later gave the Ten Commandments and the covenant law to Israel. Mount Sinai represents the defining moment of Israel's identity as God's covenant people.",
    keyEvents: [
      "Moses encounters the burning bush (Exodus 3:1-6)",
      "God gives the Ten Commandments (Exodus 20:1-17)",
      "Moses receives the covenant law (Exodus 19\u201324)",
      "The golden calf incident (Exodus 32)",
      "Elijah flees to Horeb / Sinai and hears the still small voice (1 Kings 19:8-12)",
    ],
    keyPeople: ["Moses", "Aaron", "Elijah"],
    passages: ["Exodus 3:1-6", "Exodus 19:16-20", "Exodus 20:1-17", "Exodus 32", "1 Kings 19:8-12"],
    nearbyLocations: [],
    eras: ["Exodus"],
    timelineEvents: [
      {
        title: "The giving of the Law",
        dateLabel: "c. 1446 BC",
        shortDescription: "Israel received the Ten Commandments and the covenant at Sinai.",
      },
    ],
    relatedPeopleGroupIds: [],
    prophecyLinkIds: [],
    relatedJourneyRouteIds: ["exodus-route"],
    relatedKingdomIds: ["egypt"],
    relatedTribeIds: [],
  },
  {
    id: "antioch",
    name: "Antioch",
    modernLocation: "Antakya",
    modernCountry: "Turkey",
    ancientRegion: "Syria",
    latitude: 36.2028,
    longitude: 36.1596,
    description:
      "The great city of Antioch on the Orontes was the third-largest city of the Roman Empire. It became the first major center of Gentile Christianity and the launching point for Paul's missionary journeys. Believers were first called 'Christians' here.",
    keyEvents: [
      "Believers first called Christians in Antioch (Acts 11:26)",
      "Barnabas and Saul minister in Antioch (Acts 11:25-26)",
      "The church commissions Paul and Barnabas for mission (Acts 13:1-3)",
      "The Jerusalem Council decision delivered to Antioch (Acts 15:30-35)",
    ],
    keyPeople: ["Paul", "Barnabas", "Peter", "Luke"],
    passages: ["Acts 11:26", "Acts 13:1-3", "Acts 14:26-28", "Acts 15:30-35"],
    nearbyLocations: ["damascus"],
    eras: ["Early Church"],
    timelineEvents: [
      {
        title: "Antioch church established",
        dateLabel: "c. AD 40\u201347",
        shortDescription: "Antioch became the mission hub of the early Gentile church.",
      },
    ],
    relatedPeopleGroupIds: [],
    prophecyLinkIds: [],
    relatedJourneyRouteIds: ["paul-journey-1", "paul-journey-2", "paul-journey-3"],
    relatedKingdomIds: ["greece", "rome"],
    relatedTribeIds: [],
  },
  {
    id: "cyprus",
    name: "Cyprus",
    modernLocation: "Paphos / Salamis",
    modernCountry: "Cyprus",
    ancientRegion: "Cyprus",
    latitude: 34.7720,
    longitude: 32.4297,
    description:
      "A large Mediterranean island and the homeland of Barnabas. Paul and Barnabas began their first missionary journey here, preaching in the synagogues of Salamis and confronting the sorcerer Bar-Jesus before the proconsul Sergius Paulus at Paphos.",
    keyEvents: [
      "Paul and Barnabas preach in the synagogues of Salamis (Acts 13:5)",
      "Paul confronts Elymas the sorcerer before Sergius Paulus (Acts 13:6-12)",
    ],
    keyPeople: ["Paul", "Barnabas", "Sergius Paulus"],
    passages: ["Acts 13:4-12"],
    nearbyLocations: ["antioch"],
    eras: ["Early Church"],
    timelineEvents: [
      {
        title: "Paul's first missionary stop",
        dateLabel: "c. AD 47",
        shortDescription: "Cyprus was the first destination of Paul and Barnabas on their mission.",
      },
    ],
    relatedPeopleGroupIds: [],
    prophecyLinkIds: [],
    relatedJourneyRouteIds: ["paul-journey-1"],
    relatedKingdomIds: ["rome"],
    relatedTribeIds: [],
  },
  {
    id: "ephesus",
    name: "Ephesus",
    modernLocation: "Near Sel\u00E7uk",
    modernCountry: "Turkey",
    ancientRegion: "Asia Minor (Ionia)",
    latitude: 37.9395,
    longitude: 27.3417,
    description:
      "One of the greatest cities of the ancient world and capital of the Roman province of Asia. Paul spent over two years ministering here during his third journey. Ephesus was home to the Temple of Artemis, one of the Seven Wonders of the Ancient World, and later received one of the letters to the seven churches in Revelation.",
    keyEvents: [
      "Paul establishes a church during a brief visit (Acts 18:19-21)",
      "Paul ministers extensively for over two years (Acts 19:8-10)",
      "The riot of the silversmiths in the theater (Acts 19:23-41)",
      "Paul's farewell to the Ephesian elders at Miletus (Acts 20:17-38)",
    ],
    keyPeople: ["Paul", "Apollos", "Priscilla", "Aquila", "Timothy"],
    passages: ["Acts 19:1-41", "Acts 20:17-38", "Ephesians 1:1", "Revelation 2:1-7"],
    nearbyLocations: [],
    eras: ["Early Church"],
    timelineEvents: [
      {
        title: "Paul's extended Ephesian ministry",
        dateLabel: "c. AD 52\u201355",
        shortDescription: "Paul spent over two years teaching in Ephesus, the gospel spreading throughout Asia.",
      },
    ],
    relatedPeopleGroupIds: [],
    prophecyLinkIds: [],
    relatedJourneyRouteIds: ["paul-journey-2", "paul-journey-3"],
    relatedKingdomIds: ["greece", "rome"],
    relatedTribeIds: [],
  },
  {
    id: "corinth",
    name: "Corinth",
    modernLocation: "Ancient Corinth ruins",
    modernCountry: "Greece",
    ancientRegion: "Achaia (Greece)",
    latitude: 37.9059,
    longitude: 22.8826,
    description:
      "A prosperous and cosmopolitan Roman colony strategically located on the narrow isthmus connecting mainland Greece with the Peloponnese. Paul spent eighteen months here on his second journey, establishing a church and writing letters. The city was known for its commerce, diversity, and moral challenges.",
    keyEvents: [
      "Paul meets Priscilla and Aquila, works as a tentmaker (Acts 18:1-3)",
      "Paul preaches for eighteen months (Acts 18:11)",
      "Paul brought before proconsul Gallio (Acts 18:12-17)",
    ],
    keyPeople: ["Paul", "Priscilla", "Aquila", "Silas", "Timothy"],
    passages: ["Acts 18:1-18", "1 Corinthians 1:1-2", "2 Corinthians 1:1"],
    nearbyLocations: [],
    eras: ["Early Church"],
    timelineEvents: [
      {
        title: "Paul's Corinthian ministry",
        dateLabel: "c. AD 50\u201352",
        shortDescription: "Paul established a significant church in Corinth over eighteen months.",
      },
    ],
    relatedPeopleGroupIds: [],
    prophecyLinkIds: [],
    relatedJourneyRouteIds: ["paul-journey-2", "paul-journey-3"],
    relatedKingdomIds: ["greece", "rome"],
    relatedTribeIds: [],
  },
  {
    id: "philippi",
    name: "Philippi",
    modernLocation: "Krenides ruins",
    modernCountry: "Greece",
    ancientRegion: "Macedonia",
    latitude: 41.0142,
    longitude: 24.2869,
    description:
      "A Roman colony in eastern Macedonia and the site of the first Christian community established on European soil. Paul and Silas were imprisoned here but miraculously freed, leading to the conversion of the Philippian jailer. Paul later wrote his letter of joy to this beloved church.",
    keyEvents: [
      "Lydia converted at the riverside prayer meeting (Acts 16:13-15)",
      "Paul and Silas imprisoned and miraculously freed (Acts 16:25-34)",
      "The Philippian jailer and his household believe and are baptized (Acts 16:33-34)",
    ],
    keyPeople: ["Paul", "Silas", "Lydia", "Timothy", "Luke"],
    passages: ["Acts 16:12-40", "Philippians 1:1", "Philippians 4:15-16"],
    nearbyLocations: ["thessalonica"],
    eras: ["Early Church"],
    timelineEvents: [
      {
        title: "Gospel reaches Europe",
        dateLabel: "c. AD 49\u201350",
        shortDescription: "Philippi became the first European city to receive the gospel through Paul.",
      },
    ],
    relatedPeopleGroupIds: [],
    prophecyLinkIds: [],
    relatedJourneyRouteIds: ["paul-journey-2", "paul-journey-3"],
    relatedKingdomIds: ["greece", "rome"],
    relatedTribeIds: [],
  },
  {
    id: "thessalonica",
    name: "Thessalonica",
    modernLocation: "Thessaloniki",
    modernCountry: "Greece",
    ancientRegion: "Macedonia",
    latitude: 40.6401,
    longitude: 22.9444,
    description:
      "The capital and largest city of the Roman province of Macedonia. Paul preached in the synagogue here for three Sabbaths on his second journey, persuading some Jews and many Greeks. Opposition forced Paul to leave, but the Thessalonian church became known for its faith and endurance.",
    keyEvents: [
      "Paul reasons in the synagogue for three Sabbaths (Acts 17:1-4)",
      "A mob attacks Jason's house seeking Paul (Acts 17:5-9)",
      "Paul and Silas sent away by night to Berea (Acts 17:10)",
    ],
    keyPeople: ["Paul", "Silas", "Jason", "Timothy"],
    passages: ["Acts 17:1-10", "1 Thessalonians 1:1", "2 Thessalonians 1:1"],
    nearbyLocations: ["philippi"],
    eras: ["Early Church"],
    timelineEvents: [
      {
        title: "Paul's Thessalonian ministry",
        dateLabel: "c. AD 50",
        shortDescription: "Paul established a faithful church in Thessalonica despite opposition.",
      },
    ],
    relatedPeopleGroupIds: [],
    prophecyLinkIds: [],
    relatedJourneyRouteIds: ["paul-journey-2"],
    relatedKingdomIds: ["greece", "rome"],
    relatedTribeIds: [],
  },
];

export const BIBLICAL_PROPHECY_LINKS: BiblicalProphecyLink[] = [
  {
    id: "prophecy-babylon",
    title: "Babylon: Kingdoms and Final Rebellion",
    theme: "Kingdoms and final rebellion",
    description:
      "Babylon stands at the center of biblical prophecy as both a literal empire and a symbol of human rebellion against God. Nebuchadnezzar's dream in Daniel 2 reveals a succession of world kingdoms beginning with Babylon. The prophets foretold Babylon's fall and the exile of Judah, while Revelation uses 'Babylon' as a symbol of end-time opposition to God's people, culminating in its final judgment.",
    keyPassages: ["Daniel 1", "Daniel 2", "Jeremiah 29", "Revelation 17", "Revelation 18"],
    relatedLocationIds: ["babylon"],
    eras: ["Exile", "Kingdom"],
  },
  {
    id: "prophecy-jerusalem",
    title: "Jerusalem: Covenant, Judgment, and Restoration",
    theme: "Covenant center, judgment, restoration",
    description:
      "Jerusalem occupies the prophetic center of Scripture. Isaiah and Jeremiah warned of judgment on a city that had forsaken its covenant with God. Jesus wept over Jerusalem and prophesied its destruction in Matthew 24 and Luke 21. Yet Revelation 21 envisions a New Jerusalem descending from heaven as the eternal home of God's redeemed people, bringing the prophetic arc of Scripture to its climax.",
    keyPassages: ["Isaiah 1", "Jeremiah 7", "Matthew 24", "Luke 21", "Revelation 21"],
    relatedLocationIds: ["jerusalem"],
    eras: ["Kingdom", "Exile", "Life of Christ", "Early Church"],
  },
  {
    id: "prophecy-jordan-river",
    title: "Jordan River: Entry, Transition, and Covenant",
    theme: "Entry, transition, covenant moments",
    description:
      "The Jordan River marks prophetic thresholds in salvation history. Israel's crossing under Joshua signaled the fulfillment of the promise to enter Canaan. Centuries later, John the Baptist proclaimed repentance at the Jordan, and Jesus' baptism there inaugurated the messianic age. The Jordan represents divine transition -- from wilderness to promise, from old covenant to new.",
    keyPassages: ["Joshua 3", "Matthew 3"],
    relatedLocationIds: ["jordan-river"],
    eras: ["Exodus", "Life of Christ"],
  },
  {
    id: "prophecy-sea-of-galilee",
    title: "Sea of Galilee: Kingdom Ministry of Jesus",
    theme: "Kingdom ministry of Jesus",
    description:
      "The Sea of Galilee was the stage for Jesus' proclamation of the Kingdom of God. Isaiah prophesied that 'the people walking in darkness' in the region of Galilee would see a great light. Jesus fulfilled this by calling His first disciples from its shores, teaching the crowds, calming its storms, and performing signs that revealed His messianic identity.",
    keyPassages: ["Matthew 4", "Mark 4", "Luke 5"],
    relatedLocationIds: ["sea-of-galilee"],
    eras: ["Life of Christ"],
  },
];

export const JOURNEY_ROUTE_COLORS: Record<string, string> = {
  "exodus-route": "#8B5E3C",
  "paul-journey-1": "#3B4F7A",
  "paul-journey-2": "#6B3A3A",
  "paul-journey-3": "#2E5E4E",
};

export const JOURNEY_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "exodus-route", label: "Exodus Route" },
  { value: "paul-journey-1", label: "Paul 1" },
  { value: "paul-journey-2", label: "Paul 2" },
  { value: "paul-journey-3", label: "Paul 3" },
] as const;

export type JourneyFilter = (typeof JOURNEY_FILTER_OPTIONS)[number]["value"];

export const BIBLICAL_JOURNEY_ROUTES: BiblicalJourneyRoute[] = [
  {
    id: "exodus-route",
    title: "Exodus Route",
    category: "Exodus",
    shortDescription: "Israel's journey from Egypt toward Sinai and the promised land.",
    eras: ["Exodus"],
    keyPassages: ["Exodus 12", "Exodus 14", "Exodus 19", "Numbers 14"],
    stopLocationIds: ["egypt-goshen", "mount-sinai", "jordan-river"],
    routeSegments: [
      { fromLocationId: "egypt-goshen", toLocationId: "mount-sinai", label: "Departure from Egypt" },
      { fromLocationId: "mount-sinai", toLocationId: "jordan-river", label: "Wilderness to the Jordan" },
    ],
  },
  {
    id: "paul-journey-1",
    title: "Paul's First Missionary Journey",
    category: "Early Church",
    shortDescription: "Paul and Barnabas travel to proclaim the gospel across Cyprus and Asia Minor.",
    eras: ["Early Church"],
    keyPassages: ["Acts 13", "Acts 14"],
    stopLocationIds: ["antioch", "cyprus"],
    routeSegments: [
      { fromLocationId: "antioch", toLocationId: "cyprus", label: "Sail to Cyprus" },
      { fromLocationId: "cyprus", toLocationId: "antioch", label: "Return to Antioch" },
    ],
  },
  {
    id: "paul-journey-2",
    title: "Paul's Second Missionary Journey",
    category: "Early Church",
    shortDescription: "Paul revisits churches and carries the gospel into Macedonia and Greece.",
    eras: ["Early Church"],
    keyPassages: ["Acts 15", "Acts 16", "Acts 17", "Acts 18"],
    stopLocationIds: ["antioch", "philippi", "thessalonica", "corinth", "ephesus", "jerusalem"],
    routeSegments: [
      { fromLocationId: "antioch", toLocationId: "philippi", label: "Overland to Macedonia" },
      { fromLocationId: "philippi", toLocationId: "thessalonica", label: "Via Egnatia" },
      { fromLocationId: "thessalonica", toLocationId: "corinth", label: "South to Achaia" },
      { fromLocationId: "corinth", toLocationId: "ephesus", label: "Brief stop at Ephesus" },
      { fromLocationId: "ephesus", toLocationId: "jerusalem", label: "Return to Jerusalem" },
    ],
  },
  {
    id: "paul-journey-3",
    title: "Paul's Third Missionary Journey",
    category: "Early Church",
    shortDescription: "Paul strengthens churches and ministers extensively in Ephesus and beyond.",
    eras: ["Early Church"],
    keyPassages: ["Acts 18", "Acts 19", "Acts 20", "Acts 21"],
    stopLocationIds: ["antioch", "ephesus", "corinth", "philippi", "jerusalem"],
    routeSegments: [
      { fromLocationId: "antioch", toLocationId: "ephesus", label: "Ministry in Ephesus" },
      { fromLocationId: "ephesus", toLocationId: "corinth", label: "To Greece" },
      { fromLocationId: "corinth", toLocationId: "philippi", label: "Through Macedonia" },
      { fromLocationId: "philippi", toLocationId: "jerusalem", label: "Return to Jerusalem" },
    ],
  },
];

export const BIBLICAL_KINGDOM_OVERLAYS: BiblicalKingdomOverlay[] = [
  {
    id: "egypt",
    name: "Egypt",
    eraLabel: "Patriarchs / Exodus",
    shortDescription: "Egypt is central to Israel's early story, including Joseph, Moses, and the Exodus.",
    keyPassages: ["Genesis 41", "Exodus 1", "Exodus 12", "Exodus 14"],
    relatedLocationIds: ["egypt-goshen", "mount-sinai", "jordan-river"],
    relatedProphecyLinkIds: [],
    color: "#D97706",
    centerLatitude: 30.0444,
    centerLongitude: 31.2357,
    mapLabel: "EGYPT",
    periods: ["Old Kingdom", "Middle Kingdom", "New Kingdom"],
  },
  {
    id: "assyria",
    name: "Assyria",
    eraLabel: "Divided Kingdom",
    shortDescription: "Assyria dominated the ancient Near East and conquered the northern kingdom of Israel.",
    keyPassages: ["2 Kings 17", "Isaiah 10", "Jonah 1", "Nahum 1"],
    relatedLocationIds: ["jerusalem", "damascus"],
    relatedProphecyLinkIds: [],
    color: "#DC2626",
    centerLatitude: 36.34,
    centerLongitude: 43.13,
    mapLabel: "ASSYRIA",
    periods: ["Neo-Assyrian Empire"],
  },
  {
    id: "babylon-empire",
    name: "Babylon",
    eraLabel: "Exile",
    shortDescription: "Babylon carried Judah into exile and became a major prophetic symbol in Scripture.",
    keyPassages: ["2 Kings 24", "Daniel 1", "Daniel 2", "Jeremiah 29", "Revelation 17", "Revelation 18"],
    relatedLocationIds: ["babylon", "jerusalem"],
    relatedProphecyLinkIds: ["prophecy-babylon"],
    color: "#7C3AED",
    centerLatitude: 32.5,
    centerLongitude: 44.42,
    mapLabel: "BABYLON",
    periods: ["Neo-Babylonian Empire"],
  },
  {
    id: "medo-persia",
    name: "Medo-Persia",
    eraLabel: "Exile / Restoration",
    shortDescription: "Medo-Persia succeeded Babylon and played a major role in Israel's restoration and prophetic history.",
    keyPassages: ["Daniel 5", "Daniel 6", "Ezra 1", "Isaiah 45"],
    relatedLocationIds: ["babylon", "jerusalem"],
    relatedProphecyLinkIds: ["prophecy-babylon"],
    color: "#0891B2",
    centerLatitude: 32.65,
    centerLongitude: 51.68,
    mapLabel: "MEDO-PERSIA",
    periods: ["Achaemenid Empire"],
  },
  {
    id: "greece",
    name: "Greece",
    eraLabel: "Intertestamental / Prophetic",
    shortDescription: "Greece shaped the world after Persia and is central in the prophetic sequence of Daniel.",
    keyPassages: ["Daniel 8", "Daniel 11"],
    relatedLocationIds: ["corinth", "ephesus", "philippi", "thessalonica", "antioch", "jerusalem"],
    relatedProphecyLinkIds: [],
    color: "#2563EB",
    centerLatitude: 37.98,
    centerLongitude: 23.73,
    mapLabel: "GREECE",
    periods: ["Macedonian Empire", "Hellenistic Kingdoms"],
  },
  {
    id: "rome",
    name: "Rome",
    eraLabel: "New Testament / Early Church",
    shortDescription: "Rome dominated the world of Jesus and the apostles and is central in New Testament history.",
    keyPassages: ["Luke 2", "John 19", "Acts 28", "Daniel 7", "Revelation 13"],
    relatedLocationIds: ["jerusalem", "nazareth", "bethlehem", "capernaum", "sea-of-galilee", "corinth", "ephesus", "philippi", "thessalonica", "antioch", "cyprus"],
    relatedProphecyLinkIds: [],
    color: "#BE185D",
    centerLatitude: 41.9,
    centerLongitude: 12.5,
    mapLabel: "ROME",
    periods: ["Roman Republic", "Roman Empire"],
  },
];

export function getKingdomById(id: string): BiblicalKingdomOverlay | undefined {
  return BIBLICAL_KINGDOM_OVERLAYS.find((k) => k.id === id);
}

export function getKingdomsForLocation(locationId: string): BiblicalKingdomOverlay[] {
  const location = getLocationById(locationId);
  if (!location) return [];
  return location.relatedKingdomIds
    .map((kid) => getKingdomById(kid))
    .filter((k): k is BiblicalKingdomOverlay => !!k);
}

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

export function getProphecyLinkById(id: string): BiblicalProphecyLink | undefined {
  return BIBLICAL_PROPHECY_LINKS.find((pl) => pl.id === id);
}

export function getProphecyLinksForLocation(locationId: string): BiblicalProphecyLink[] {
  const location = getLocationById(locationId);
  if (!location) return [];
  return location.prophecyLinkIds
    .map((plId) => getProphecyLinkById(plId))
    .filter((pl): pl is BiblicalProphecyLink => !!pl);
}

export function getJourneyRouteById(id: string): BiblicalJourneyRoute | undefined {
  return BIBLICAL_JOURNEY_ROUTES.find((jr) => jr.id === id);
}

export function getJourneyRoutesForLocation(locationId: string): BiblicalJourneyRoute[] {
  const location = getLocationById(locationId);
  if (!location) return [];
  return location.relatedJourneyRouteIds
    .map((jrId) => getJourneyRouteById(jrId))
    .filter((jr): jr is BiblicalJourneyRoute => !!jr);
}

export function getRouteCoordinates(route: BiblicalJourneyRoute): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  for (const seg of route.routeSegments) {
    const fromLoc = getLocationById(seg.fromLocationId);
    const toLoc = getLocationById(seg.toLocationId);
    if (fromLoc && coords.length === 0) {
      coords.push({ latitude: fromLoc.latitude, longitude: fromLoc.longitude });
    }
    if (toLoc) {
      coords.push({ latitude: toLoc.latitude, longitude: toLoc.longitude });
    }
  }
  return coords;
}

export const BIBLICAL_TRIBE_OVERLAYS: BiblicalTribeOverlay[] = [
  {
    id: "judah",
    name: "Judah",
    regionLabel: "Southern hill country and Jerusalem region",
    shortDescription: "Judah became the leading southern tribe and the line of David.",
    keyPassages: ["Joshua 15", "1 Samuel 17", "2 Samuel 5", "Micah 5"],
    relatedLocationIds: ["jerusalem", "bethlehem"],
    color: "#D97706",
    centerLatitude: 31.55,
    centerLongitude: 35.09,
    periods: ["Conquest", "United Monarchy", "Divided Kingdom", "Post-Exile"],
  },
  {
    id: "benjamin",
    name: "Benjamin",
    regionLabel: "Central hill country between Judah and Ephraim",
    shortDescription: "Benjamin occupied a strategic region near Jerusalem and produced Israel's first king.",
    keyPassages: ["Joshua 18", "1 Samuel 9", "Philippians 3"],
    relatedLocationIds: ["jerusalem"],
    color: "#DC2626",
    centerLatitude: 31.85,
    centerLongitude: 35.22,
    periods: ["Conquest", "United Monarchy", "Divided Kingdom"],
  },
  {
    id: "ephraim",
    name: "Ephraim",
    regionLabel: "Central highlands north of Benjamin",
    shortDescription: "Ephraim became one of the strongest northern tribes and a major center of Israel's history.",
    keyPassages: ["Joshua 16", "Judges 8", "Hosea 4"],
    relatedLocationIds: [],
    color: "#2563EB",
    centerLatitude: 32.1,
    centerLongitude: 35.25,
    periods: ["Conquest", "Judges", "Divided Kingdom"],
  },
  {
    id: "manasseh",
    name: "Manasseh",
    regionLabel: "Central region with western and transjordan branches",
    shortDescription: "Manasseh was a large tribe with inheritance on both sides of the Jordan.",
    keyPassages: ["Joshua 17", "Numbers 32"],
    relatedLocationIds: ["jordan-river"],
    color: "#7C3AED",
    centerLatitude: 32.4,
    centerLongitude: 35.45,
    periods: ["Conquest", "Judges", "Divided Kingdom"],
  },
  {
    id: "dan",
    name: "Dan",
    regionLabel: "Coastal lowlands and later northern migration",
    shortDescription: "Dan's inheritance shifted, and the tribe became known for migration and later idolatry.",
    keyPassages: ["Joshua 19", "Judges 18"],
    relatedLocationIds: [],
    color: "#0891B2",
    centerLatitude: 33.25,
    centerLongitude: 35.65,
    periods: ["Conquest", "Judges"],
  },
  {
    id: "naphtali",
    name: "Naphtali",
    regionLabel: "Northern Galilee",
    shortDescription: "Naphtali occupied the northern region later associated with Galilean ministry.",
    keyPassages: ["Joshua 19", "Isaiah 9", "Matthew 4"],
    relatedLocationIds: ["nazareth", "sea-of-galilee", "capernaum"],
    color: "#059669",
    centerLatitude: 32.85,
    centerLongitude: 35.5,
    periods: ["Conquest", "Judges", "Life of Christ"],
  },
  {
    id: "levi",
    name: "Levi",
    regionLabel: "Scattered priestly cities throughout Israel",
    shortDescription: "Levi had no single tribal territory but was distributed in priestly service across the land.",
    keyPassages: ["Numbers 18", "Joshua 21", "Malachi 2"],
    relatedLocationIds: ["jerusalem"],
    color: "#BE185D",
    centerLatitude: 31.78,
    centerLongitude: 35.2,
    periods: ["Wilderness", "Conquest", "United Monarchy", "Second Temple"],
  },
];

export function getTribeById(id: string): BiblicalTribeOverlay | undefined {
  return BIBLICAL_TRIBE_OVERLAYS.find((t) => t.id === id);
}

export function getTribesForLocation(locationId: string): BiblicalTribeOverlay[] {
  const location = getLocationById(locationId);
  if (!location) return [];
  return location.relatedTribeIds
    .map((tid) => getTribeById(tid))
    .filter((t): t is BiblicalTribeOverlay => !!t);
}
