import { Ionicons } from "@expo/vector-icons";

export interface MusicItem {
  title: string;
  artist: string;
  description: string;
  url: string;
}

export interface MusicCategory {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  description: string;
  items: MusicItem[];
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {
    title: "Worship & Praise",
    icon: "musical-notes",
    gradient: ["#C9933A", "#A87828"],
    description: "Contemporary worship songs to lift your spirit",
    items: [
      { title: "Goodness of God", artist: "Bethel Music", description: "A powerful declaration of God's faithfulness", url: "https://www.youtube.com/results?search_query=Goodness+of+God+Bethel+Music" },
      { title: "What A Beautiful Name", artist: "Hillsong Worship", description: "Celebrating the name of Jesus", url: "https://www.youtube.com/results?search_query=What+A+Beautiful+Name+Hillsong+Worship" },
      { title: "Way Maker", artist: "Sinach", description: "Declaring God as miracle worker and promise keeper", url: "https://www.youtube.com/results?search_query=Way+Maker+Sinach" },
      { title: "Great Are You Lord", artist: "All Sons & Daughters", description: "A heartfelt prayer of worship", url: "https://www.youtube.com/results?search_query=Great+Are+You+Lord+All+Sons+Daughters" },
      { title: "Build My Life", artist: "Housefires", description: "Surrendering everything to follow Christ", url: "https://www.youtube.com/results?search_query=Build+My+Life+Housefires" },
      { title: "Holy Spirit", artist: "Francesca Battistelli", description: "An invitation for the Holy Spirit to move", url: "https://www.youtube.com/results?search_query=Holy+Spirit+Francesca+Battistelli" },
    ],
  },
  {
    title: "Classic Hymns",
    icon: "book",
    gradient: ["#1A1F3C", "#0D1025"],
    description: "Timeless hymns that have inspired generations",
    items: [
      { title: "Amazing Grace", artist: "John Newton", description: "The most beloved hymn of all time", url: "https://www.youtube.com/results?search_query=Amazing+Grace+hymn" },
      { title: "How Great Thou Art", artist: "Carl Boberg", description: "A majestic declaration of God's greatness", url: "https://www.youtube.com/results?search_query=How+Great+Thou+Art+hymn" },
      { title: "It Is Well With My Soul", artist: "Horatio Spafford", description: "Finding peace through trials and tragedy", url: "https://www.youtube.com/results?search_query=It+Is+Well+With+My+Soul+hymn" },
      { title: "Great Is Thy Faithfulness", artist: "Thomas Chisholm", description: "Celebrating God's unchanging faithfulness", url: "https://www.youtube.com/results?search_query=Great+Is+Thy+Faithfulness+hymn" },
      { title: "Be Thou My Vision", artist: "Dallan Forgaill", description: "An ancient Irish prayer set to music", url: "https://www.youtube.com/results?search_query=Be+Thou+My+Vision+hymn" },
      { title: "Blessed Assurance", artist: "Fanny Crosby", description: "Confidence in our salvation through Christ", url: "https://www.youtube.com/results?search_query=Blessed+Assurance+hymn" },
    ],
  },
  {
    title: "Gospel",
    icon: "mic",
    gradient: ["#8B5CF6", "#6D3BD4"],
    description: "Soulful gospel music full of praise and testimony",
    items: [
      { title: "Total Praise", artist: "Richard Smallwood", description: "A powerful anthem of complete surrender", url: "https://www.youtube.com/results?search_query=Total+Praise+Richard+Smallwood" },
      { title: "Every Praise", artist: "Hezekiah Walker", description: "Every praise is to our God", url: "https://www.youtube.com/results?search_query=Every+Praise+Hezekiah+Walker" },
      { title: "I Smile", artist: "Kirk Franklin", description: "Finding joy in the Lord no matter the circumstances", url: "https://www.youtube.com/results?search_query=I+Smile+Kirk+Franklin" },
      { title: "Break Every Chain", artist: "Tasha Cobbs Leonard", description: "Declaring freedom and deliverance in Jesus", url: "https://www.youtube.com/results?search_query=Break+Every+Chain+Tasha+Cobbs" },
      { title: "Grateful", artist: "Hezekiah Walker", description: "A song of thanksgiving and gratitude", url: "https://www.youtube.com/results?search_query=Grateful+Hezekiah+Walker" },
      { title: "Encourage Yourself", artist: "Donald Lawrence", description: "Strength to push through difficult times", url: "https://www.youtube.com/results?search_query=Encourage+Yourself+Donald+Lawrence" },
    ],
  },
  {
    title: "Instrumental & Prayer",
    icon: "water",
    gradient: ["#00796B", "#4DB6AC"],
    description: "Peaceful instrumentals for prayer and meditation",
    items: [
      { title: "Piano Worship Instrumentals", artist: "Various Artists", description: "Calming piano worship for quiet time", url: "https://www.youtube.com/results?search_query=christian+piano+worship+instrumental" },
      { title: "Soaking Worship Music", artist: "Various Artists", description: "Extended worship music for soaking prayer", url: "https://www.youtube.com/results?search_query=soaking+worship+music+prayer" },
      { title: "Psalm 23 Instrumental", artist: "Various Artists", description: "Peaceful music inspired by the Shepherd's Psalm", url: "https://www.youtube.com/results?search_query=psalm+23+instrumental+music" },
      { title: "Hymns on Guitar", artist: "Various Artists", description: "Classic hymns performed on acoustic guitar", url: "https://www.youtube.com/results?search_query=hymns+acoustic+guitar+instrumental" },
      { title: "Cello Worship", artist: "Various Artists", description: "Beautiful cello renditions of worship songs", url: "https://www.youtube.com/results?search_query=cello+worship+music+christian" },
    ],
  },
  {
    title: "Contemporary Christian",
    icon: "radio",
    gradient: ["#2E7D32", "#1B5E20"],
    description: "Today's biggest Christian artists and hits",
    items: [
      { title: "Graves Into Gardens", artist: "Elevation Worship", description: "God turns impossible situations around", url: "https://www.youtube.com/results?search_query=Graves+Into+Gardens+Elevation+Worship" },
      { title: "Jireh", artist: "Maverick City Music", description: "God will provide everything you need", url: "https://www.youtube.com/results?search_query=Jireh+Maverick+City+Music" },
      { title: "Oceans", artist: "Hillsong UNITED", description: "Stepping out in faith on the deep waters", url: "https://www.youtube.com/results?search_query=Oceans+Hillsong+UNITED" },
      { title: "Living Hope", artist: "Phil Wickham", description: "Christ our living hope, risen and alive", url: "https://www.youtube.com/results?search_query=Living+Hope+Phil+Wickham" },
      { title: "Blessings", artist: "Laura Story", description: "What if blessings come through raindrops and trials?", url: "https://www.youtube.com/results?search_query=Blessings+Laura+Story" },
      { title: "I Can Only Imagine", artist: "MercyMe", description: "Imagining the moment we see Jesus face to face", url: "https://www.youtube.com/results?search_query=I+Can+Only+Imagine+MercyMe" },
    ],
  },
  {
    title: "For Kids",
    icon: "happy",
    gradient: ["#E65100", "#FF8F00"],
    description: "Fun and faith-filled music for children",
    items: [
      { title: "Jesus Loves Me", artist: "Traditional", description: "The classic children's hymn", url: "https://www.youtube.com/results?search_query=Jesus+Loves+Me+kids+worship" },
      { title: "This Little Light of Mine", artist: "Traditional", description: "Let your light shine before others", url: "https://www.youtube.com/results?search_query=This+Little+Light+of+Mine+kids" },
      { title: "He's Got the Whole World", artist: "Traditional", description: "God holds everything in His hands", url: "https://www.youtube.com/results?search_query=Hes+Got+The+Whole+World+kids" },
      { title: "Deep and Wide", artist: "Traditional", description: "God's love is deep and wide", url: "https://www.youtube.com/results?search_query=Deep+and+Wide+kids+worship" },
      { title: "God Is So Good", artist: "Traditional", description: "A simple song of praise for young hearts", url: "https://www.youtube.com/results?search_query=God+Is+So+Good+kids+worship+song" },
    ],
  },
];
