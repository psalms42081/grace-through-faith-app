import { eq, count } from "drizzle-orm";
import {
  formationTracks,
  formationModules,
  formationLessons,
  lessonSections,
  formationAssessments,
  assessmentItems,
} from "../shared/schema";

function id(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

export async function seedFormationData(db: any) {
  const [existing] = await db
    .select({ c: count() })
    .from(formationTracks);
  if (existing && existing.c > 0) return;

  console.log("Seeding formation tracks...");

  const trackBeliefs = "track-beliefs";
  const trackNewBeliever = "track-new-believer";
  const trackProphecy = "track-prophecy";

  await db.insert(formationTracks).values([
    {
      id: trackBeliefs,
      title: "28 Beliefs Deep Dive",
      description:
        "A comprehensive 28-week journey through every Fundamental Belief of the Seventh-day Adventist Church. Each week explores one belief with scripture, theology, and practical application.",
      icon: "school",
      color: "#7C3AED",
      category: "beliefs",
      totalModules: 28,
      totalWeeks: 28,
      difficulty: "intermediate",
      isPublished: true,
      sortOrder: 1,
    },
    {
      id: trackNewBeliever,
      title: "New Believer Path",
      description:
        "A gentle 8-week introduction for those new to the Adventist faith. Covers salvation, baptism, the Sabbath, and life in community.",
      icon: "heart",
      color: "#E8456B",
      category: "new-believer",
      totalModules: 4,
      totalWeeks: 8,
      difficulty: "beginner",
      isPublished: true,
      sortOrder: 2,
    },
    {
      id: trackProphecy,
      title: "Prophecy Foundations",
      description:
        "Explore the foundational apocalyptic prophecies of Daniel. Understand Nebuchadnezzar's statue, the four beasts, and the judgment scene through Adventist prophetic interpretation.",
      icon: "telescope",
      color: "#1565C0",
      category: "prophecy",
      totalModules: 2,
      totalWeeks: 4,
      difficulty: "intermediate",
      isPublished: true,
      sortOrder: 3,
    },
  ]);

  const beliefsTitles = [
    { title: "The Holy Scriptures", desc: "The authority, sufficiency, and transformative power of God's Word.", objective: "Articulate the Adventist understanding of biblical inspiration and explain why sola scriptura is foundational to SDA theology." },
    { title: "The Trinity", desc: "One God revealed in three co-eternal Persons: Father, Son, and Holy Spirit.", objective: "Explain the biblical basis for the Trinity using Scripture, and distinguish the Adventist position from both modalism and tritheism." },
    { title: "The Father", desc: "God the eternal Father — Creator, Source, Sustainer, and Sovereign of all creation.", objective: "Describe the character of God the Father as revealed in Scripture and explain how the Great Controversy theme centers on vindicating His character." },
    { title: "The Son", desc: "God the eternal Son became incarnate in Jesus Christ, through whom all things were created and salvation is accomplished.", objective: "Present the biblical evidence for Christ's full divinity and humanity, and explain why the incarnation is essential to the plan of salvation." },
    { title: "The Holy Spirit", desc: "God the eternal Spirit was active with the Father and Son in creation, incarnation, and redemption.", objective: "Identify the personhood and distinct ministry of the Holy Spirit and explain His role in conviction, sanctification, and spiritual gifting." },
    { title: "Creation", desc: "God is the Creator of all things, as revealed in the Genesis account of a literal six-day creation.", objective: "Defend the biblical account of a literal six-day creation and explain its significance for Sabbath, marriage, and human dignity." },
    { title: "The Nature of Humanity", desc: "Humanity was made in the image of God, endowed with individuality, freedom, and the ability to think and act.", objective: "Explain what it means to be created in God's image and how the fall affected every dimension of human nature." },
    { title: "The Great Controversy", desc: "All humanity is involved in a cosmic conflict between Christ and Satan regarding God's character and law.", objective: "Understand and clearly explain the cosmic conflict theme central to Adventist theology — its origin, scope, and resolution." },
    { title: "The Life, Death, and Resurrection of Christ", desc: "In Christ's life of perfect obedience, His suffering, death, and resurrection, God provided the only means of atonement.", objective: "Trace the significance of Christ's life, substitutionary death, and bodily resurrection as the sole basis for human salvation." },
    { title: "The Experience of Salvation", desc: "Through Christ we are justified, sanctified, and glorified by grace through faith.", objective: "Distinguish clearly between justification and sanctification using Scripture, and explain how both operate by grace through faith." },
    { title: "Growing in Christ", desc: "By His death on the cross Jesus triumphed over the forces of evil, and we grow in Him through spiritual disciplines.", objective: "Identify the spiritual disciplines that foster growth in Christ and explain how victory over sin is achieved through the indwelling Spirit." },
    { title: "The Church", desc: "The church is the community of believers who confess Jesus Christ as Lord and Saviour.", objective: "Define the church as both organism and organization, and explain the Adventist understanding of visible and invisible church." },
    { title: "The Remnant and Its Mission", desc: "The universal church is composed of all who truly believe in Christ, with a remnant called to proclaim the three angels' messages.", objective: "Explain the Adventist concept of the remnant and articulate the three angels' messages of Revelation 14 with clarity and conviction." },
    { title: "Unity in the Body of Christ", desc: "We are all equal in Christ and should serve one another with mutual respect and love.", objective: "Demonstrate from Scripture why unity in the body of Christ transcends cultural, ethnic, and social barriers without erasing diversity." },
    { title: "Baptism", desc: "Baptism by immersion symbolizes our death to sin, new birth, and union with Christ.", objective: "Explain the biblical meaning of baptism by immersion as death to sin and resurrection to new life in Christ." },
    { title: "The Lord's Supper", desc: "The Lord's Supper is a participation in the emblems of Christ's body and blood as an expression of faith.", objective: "Describe the theological significance of foot washing and communion as acts of humility, remembrance, and covenant renewal." },
    { title: "Spiritual Gifts and Ministries", desc: "God bestows upon all members spiritual gifts that equip them for service.", objective: "Identify the biblical spiritual gifts and explain how they function for the edification of the church and fulfillment of its mission." },
    { title: "The Gift of Prophecy", desc: "One of the gifts of the Holy Spirit is prophecy, a distinguishing mark of the remnant church.", objective: "Explain the Adventist understanding of the prophetic gift, including the role of Ellen G. White and the biblical tests of a prophet." },
    { title: "The Law of God", desc: "The Ten Commandments are an expression of God's character and will, binding upon all people in every age.", objective: "Articulate the perpetuity and relevance of the Ten Commandments as an expression of God's character, not a means of earning salvation." },
    { title: "The Sabbath", desc: "The seventh-day Sabbath is a day of rest, worship, and ministry in harmony with the teaching of Jesus.", objective: "Articulate the theological meaning of the seventh-day Sabbath as creation memorial, covenant sign, and eschatological identity marker." },
    { title: "Stewardship", desc: "We are God's stewards, entrusted by Him with time, opportunities, abilities, and possessions.", objective: "Explain the biblical principle of stewardship across time, body, talents, and finances — including the Adventist practice of tithe and offerings." },
    { title: "Christian Behavior", desc: "We are called to be a godly people who think, feel, and act in harmony with biblical principles.", objective: "Describe the biblical standard for Christian lifestyle and explain how health, modesty, and media choices reflect sanctification." },
    { title: "Marriage and the Family", desc: "Marriage was divinely established in Eden and affirmed by Jesus as a lifelong union between a man and a woman.", objective: "Present the biblical model for marriage and family as established at creation and affirmed by Jesus." },
    { title: "Christ's Ministry in the Heavenly Sanctuary", desc: "Christ ministers in the heavenly sanctuary, making available the benefits of His atoning sacrifice.", objective: "Explain the Adventist sanctuary doctrine — Christ's two-phase ministry and the significance of the pre-advent investigative judgment." },
    { title: "The Second Coming of Christ", desc: "The second coming of Christ is the blessed hope of the church, the climax of the gospel.", objective: "Articulate the biblical promise of Christ's visible, audible, literal second coming and its implications for daily living and mission urgency." },
    { title: "Death and Resurrection", desc: "The wages of sin is death, but the gift of God is eternal life — the dead await the resurrection.", objective: "Explain the Adventist understanding of death as unconscious sleep and the resurrection as the Christian's true hope." },
    { title: "The Millennium and the End of Sin", desc: "The millennium is the thousand-year reign of Christ between the first and second resurrections.", objective: "Describe the millennium — its purpose, events, and how it resolves the Great Controversy before the final eradication of sin." },
    { title: "The New Earth", desc: "On the new earth, God will provide an eternal home for the redeemed and a perfect environment for everlasting life.", objective: "Envision the new earth as the fulfillment of God's original purpose and the eternal home of the redeemed." },
  ];

  const beliefsModules: any[] = [];
  for (let i = 0; i < beliefsTitles.length; i++) {
    beliefsModules.push({
      id: id("bmod", i + 1),
      trackId: trackBeliefs,
      title: beliefsTitles[i].title,
      description: beliefsTitles[i].desc,
      learningObjective: beliefsTitles[i].objective,
      moduleOrder: i + 1,
      totalLessons: i < 3 ? 1 : 0,
    });
  }
  await db.insert(formationModules).values(beliefsModules);

  const beliefsLessons = [
    {
      id: "bl-001",
      moduleId: id("bmod", 1),
      title: "The Authority of Scripture",
      description: "Exploring the Adventist understanding of biblical inspiration, authority, and the sola scriptura principle.",
      lessonOrder: 1,
      anchorText: "2 Timothy 3:16-17",
      anchorBookId: 55,
      anchorChapter: 3,
      anchorVerseStart: 16,
      anchorVerseEnd: 17,
      estimatedMinutes: 35,
    },
    {
      id: "bl-002",
      moduleId: id("bmod", 2),
      title: "One God, Three Persons",
      description: "Understanding the biblical basis for the Trinity and its significance for Adventist faith.",
      lessonOrder: 1,
      anchorText: "Matthew 28:19; Deuteronomy 6:4",
      anchorBookId: 40,
      anchorChapter: 28,
      anchorVerseStart: 19,
      anchorVerseEnd: 19,
      estimatedMinutes: 35,
    },
    {
      id: "bl-003",
      moduleId: id("bmod", 3),
      title: "Our Loving Father",
      description: "Discovering the character of God the Father as revealed in Scripture — Creator, Sustainer, and Redeemer.",
      lessonOrder: 1,
      anchorText: "John 3:16; 1 John 4:8",
      anchorBookId: 43,
      anchorChapter: 3,
      anchorVerseStart: 16,
      anchorVerseEnd: 16,
      estimatedMinutes: 30,
    },
  ];
  await db.insert(formationLessons).values(beliefsLessons);

  const beliefsSections = [
    { lessonId: "bl-001", sectionType: "anchor", title: "Anchor Text", content: "\"All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness, that the man of God may be complete, thoroughly equipped for every good work.\" — 2 Timothy 3:16-17 (NKJV)", sortOrder: 1 },
    { lessonId: "bl-001", sectionType: "explain", title: "What Does This Mean?", content: "The Adventist doctrine of Scripture holds that the Bible is the inspired, authoritative, and infallible revelation of God's will. Unlike verbal dictation theories, Adventists affirm \"thought inspiration\" — God guided the thoughts of the biblical writers while allowing their individual personalities and literary styles to shape the text.\n\nThe phrase \"given by inspiration of God\" (theopneustos — literally \"God-breathed\") indicates that Scripture originates from God Himself. It is not merely a human product enhanced by divine assistance, but a divine message delivered through human instruments.\n\nPaul identifies four functions of Scripture: doctrine (teaching truth), reproof (exposing error), correction (restoring what is broken), and instruction in righteousness (training in godly living). Together, these equip believers for \"every good work.\"", sortOrder: 2 },
    { lessonId: "bl-001", sectionType: "integrate", title: "SDA Theological Integration", content: "Seventh-day Adventists hold Scripture as the supreme authority in all matters of faith and practice (sola scriptura). This principle shapes how Adventists approach every doctrine:\n\n1. **The Bible is self-interpreting** — Scripture interprets Scripture. We compare text with text rather than imposing external philosophical frameworks.\n\n2. **The historicist method of prophetic interpretation** flows from this commitment. Daniel and Revelation are read as spanning history from the prophet's day to the end of time.\n\n3. **Ellen G. White's writings** are understood as a \"lesser light\" pointing to the \"greater light\" of Scripture. Her prophetic gift is tested by and subordinate to biblical authority.\n\n4. **Present truth** — Adventists believe the Holy Spirit continues to unfold deeper understanding of Scripture as we approach the second coming, always building on and never contradicting the biblical foundation.\n\nFor further study on Ellen White's understanding of inspiration, visit egwwritings.org.", sortOrder: 3 },
    { lessonId: "bl-001", sectionType: "practice", title: "Daily Practice", content: "This week, commit to a deeper engagement with Scripture using the Adventist method of Bible study:\n\n1. **Read the passage in context** — Read the full chapter of 2 Timothy 3 before focusing on verses 16-17.\n2. **Compare translations** — Read the passage in KJV, NKJV, and a modern translation. Note how different renderings illuminate the text.\n3. **Cross-reference** — Look up related passages: 2 Peter 1:20-21, Psalm 119:105, John 17:17.\n4. **Journal your response** — Write down what the Holy Spirit impresses upon your heart.\n5. **Apply one truth** — Choose one practical application from your study and live it out today.", sortOrder: 4 },
    { lessonId: "bl-001", sectionType: "reflection", title: "Personal Reflection", content: "Take a few moments to reflect on these questions. There are no wrong answers — this is between you and God.\n\n1. How has the Bible shaped your understanding of God's character?\n2. In what areas of your life do you find it most challenging to submit to biblical authority?\n3. How does the Adventist understanding of \"thought inspiration\" affect the way you read Scripture?\n4. What practical steps can you take to make Bible study a more central part of your daily routine?", sortOrder: 5 },
    { lessonId: "bl-001", sectionType: "assessment", title: "Knowledge Check", content: "Test your understanding of the Adventist doctrine of Scripture.", sortOrder: 6 },

    { lessonId: "bl-002", sectionType: "anchor", title: "Anchor Text", content: "\"Go therefore and make disciples of all the nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.\" — Matthew 28:19 (NKJV)\n\n\"Hear, O Israel: The LORD our God, the LORD is one!\" — Deuteronomy 6:4 (NKJV)", sortOrder: 1 },
    { lessonId: "bl-002", sectionType: "explain", title: "What Does This Mean?", content: "The Christian doctrine of the Trinity affirms that there is one God who exists eternally in three Persons: Father, Son, and Holy Spirit. Each Person is fully God, co-eternal, and co-equal, yet there is only one God.\n\nThe Shema of Deuteronomy 6:4 uses the Hebrew word 'echad' (one), which can denote a composite unity — the same word used for \"one flesh\" in marriage (Genesis 2:24). This is not a mathematical singularity but a relational oneness.\n\nJesus' baptismal formula in Matthew 28:19 places the three Persons on equal footing — one \"name\" (singular) shared by Father, Son, and Holy Spirit. This trinitarian structure pervades the New Testament: the Father sends the Son, the Son glorifies the Father, and the Spirit proceeds from both to guide believers into all truth.", sortOrder: 2 },
    { lessonId: "bl-002", sectionType: "integrate", title: "SDA Theological Integration", content: "Early Adventist pioneers held diverse views on the Trinity, with some, including James White, initially skeptical. However, through continued Bible study and the influence of Ellen G. White's writings, the church came to affirm the full deity of Christ and the personhood of the Holy Spirit.\n\nThe Adventist understanding of the Trinity is grounded strictly in Scripture rather than in the philosophical categories of the ancient creeds. Key distinctives:\n\n1. **Relational, not speculative** — Adventists focus on how the three Persons relate to one another and to humanity rather than on abstract metaphysics.\n2. **The Great Controversy lens** — The Trinity is understood in the context of the cosmic conflict. The Father, Son, and Spirit work together to vindicate God's character and restore humanity.\n3. **Ellen G. White** affirmed: \"There are three living persons of the heavenly trio\" (Evangelism, p. 615). Visit egwwritings.org for the full context.", sortOrder: 3 },
    { lessonId: "bl-002", sectionType: "practice", title: "Daily Practice", content: "This week, explore the trinitarian shape of your faith:\n\n1. **In prayer**, consciously address each Person of the Godhead — thank the Father for His plan, praise the Son for His sacrifice, invite the Spirit's guidance.\n2. **Study** John 14-16, noting how Jesus describes the relationship between the Father, Son, and Spirit.\n3. **Reflect** on your baptism (or anticipated baptism) — you were baptized into the name of the Triune God.", sortOrder: 4 },
    { lessonId: "bl-002", sectionType: "reflection", title: "Personal Reflection", content: "1. How does understanding God as Trinity affect your prayer life?\n2. Why is it important that the Holy Spirit is a Person, not just a force?\n3. How does the unity within the Godhead serve as a model for unity in the church?", sortOrder: 5 },
    { lessonId: "bl-002", sectionType: "assessment", title: "Knowledge Check", content: "Test your understanding of the Adventist doctrine of the Trinity.", sortOrder: 6 },

    { lessonId: "bl-003", sectionType: "anchor", title: "Anchor Text", content: "\"For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.\" — John 3:16 (NKJV)\n\n\"He who does not love does not know God, for God is love.\" — 1 John 4:8 (NKJV)", sortOrder: 1 },
    { lessonId: "bl-003", sectionType: "explain", title: "What Does This Mean?", content: "John 3:16 is perhaps the most well-known verse in Scripture, and for good reason — it encapsulates the entire gospel. The Father's love is the source of the plan of salvation. He did not wait for humanity to earn His favor; He acted first, giving His most precious gift.\n\n1 John 4:8 makes an even more radical claim: God doesn't merely show love — He IS love. Love is not one attribute among many; it is the very essence of God's character. Everything God does — from creation to judgment — flows from this fundamental reality.\n\nThe Father is revealed throughout Scripture as the source of all blessing, the initiator of the covenant, and the one who relentlessly pursues a relationship with His children.", sortOrder: 2 },
    { lessonId: "bl-003", sectionType: "integrate", title: "SDA Theological Integration", content: "In Adventist theology, the character of God the Father is central to the Great Controversy theme. Satan's accusations are directed primarily at the Father's character — claiming that God is arbitrary, exacting, and unforgiving.\n\nThe Adventist understanding emphasizes:\n\n1. **God's character is on trial** — The Great Controversy is ultimately about vindicating God's character of love before the watching universe.\n2. **The Father suffered with the Son** — Ellen G. White wrote: \"The Father suffers with His Son\" (The Desire of Ages, p. 693). The cross reveals the Father's heart.\n3. **Justice and mercy united** — God does not choose between justice and mercy. At Calvary, \"Mercy and truth have met together; righteousness and peace have kissed\" (Psalm 85:10).\n4. **The Sabbath reveals the Father** — The Sabbath rest is an invitation to trust the Father's provision and character.\n\nFor deeper study of God's character in the Great Controversy, visit egwwritings.org.", sortOrder: 3 },
    { lessonId: "bl-003", sectionType: "practice", title: "Daily Practice", content: "This week, deepen your experience of the Father's love:\n\n1. **Morning meditation** — Begin each day by reading one passage that reveals the Father's character (suggestions: Psalm 103, Isaiah 40, Matthew 6:25-34).\n2. **Character journal** — Each evening, write down one way you experienced the Father's care during the day.\n3. **Share the Father's love** — Perform one act of kindness each day that reflects the Father's generous, initiating love.", sortOrder: 4 },
    { lessonId: "bl-003", sectionType: "reflection", title: "Personal Reflection", content: "1. What is your honest picture of God the Father? Is it shaped more by Scripture or by your experiences with earthly authority figures?\n2. How does the Great Controversy perspective change the way you understand difficult events in your life?\n3. In what ways does Sabbath rest help you trust the Father's character?", sortOrder: 5 },
    { lessonId: "bl-003", sectionType: "assessment", title: "Knowledge Check", content: "Test your understanding of the Adventist belief about God the Father.", sortOrder: 6 },
  ];

  const sectionRows = beliefsSections.map((s, i) => ({
    id: `bls-${s.lessonId}-${i + 1}`,
    ...s,
  }));
  await db.insert(lessonSections).values(sectionRows);

  const beliefsAssessments = [
    { id: "ba-001", lessonId: "bl-001", title: "Scripture Assessment", passingScore: 70 },
    { id: "ba-002", lessonId: "bl-002", title: "Trinity Assessment", passingScore: 70 },
    { id: "ba-003", lessonId: "bl-003", title: "God the Father Assessment", passingScore: 70 },
  ];
  await db.insert(formationAssessments).values(beliefsAssessments);

  await db.insert(assessmentItems).values([
    {
      id: "bai-001",
      assessmentId: "ba-001",
      question: "What does the Greek word 'theopneustos' in 2 Timothy 3:16 literally mean?",
      options: ["God-spoken", "God-breathed", "God-written", "God-revealed"],
      correctIndex: 1,
      explanation: "Theopneustos means 'God-breathed,' indicating that Scripture originates from God Himself.",
    },
    {
      id: "bai-002",
      assessmentId: "ba-001",
      question: "What type of inspiration do Adventists affirm regarding the Bible writers?",
      options: ["Verbal dictation", "Thought inspiration", "Partial inspiration", "Natural inspiration"],
      correctIndex: 1,
      explanation: "Adventists affirm 'thought inspiration' — God guided the thoughts of the writers while allowing their individual personalities and styles.",
    },
    {
      id: "bai-003",
      assessmentId: "ba-001",
      question: "According to 2 Timothy 3:16-17, which of the following is NOT listed as a function of Scripture?",
      options: ["Doctrine", "Reproof", "Entertainment", "Instruction in righteousness"],
      correctIndex: 2,
      explanation: "Paul lists four functions: doctrine, reproof, correction, and instruction in righteousness. Entertainment is not among them.",
    },
    {
      id: "bai-004",
      assessmentId: "ba-002",
      question: "What Hebrew word for 'one' is used in the Shema (Deuteronomy 6:4)?",
      options: ["Yachid", "Echad", "Elohim", "Adonai"],
      correctIndex: 1,
      explanation: "'Echad' can denote a composite unity, as in 'one flesh' (Genesis 2:24), supporting the concept of plurality within unity.",
    },
    {
      id: "bai-005",
      assessmentId: "ba-002",
      question: "In Matthew 28:19, the word 'name' is in what grammatical form?",
      options: ["Plural — names", "Singular — name", "Dual — names of two", "It is not specified"],
      correctIndex: 1,
      explanation: "Jesus used the singular 'name' for all three Persons, indicating their unity as one God.",
    },
    {
      id: "bai-006",
      assessmentId: "ba-002",
      question: "Which early Adventist pioneer was initially skeptical of the Trinity doctrine?",
      options: ["Ellen White", "James White", "John Andrews", "Uriah Smith"],
      correctIndex: 1,
      explanation: "James White and several other pioneers held anti-trinitarian views, but the church later affirmed the Trinity through continued Bible study.",
    },
    {
      id: "bai-007",
      assessmentId: "ba-003",
      question: "According to 1 John 4:8, what is the essential nature of God?",
      options: ["God is power", "God is justice", "God is love", "God is wisdom"],
      correctIndex: 2,
      explanation: "1 John 4:8 declares 'God is love' — love is not just an attribute but the very essence of God's character.",
    },
    {
      id: "bai-008",
      assessmentId: "ba-003",
      question: "In the Great Controversy theme, what is ultimately on trial?",
      options: ["Humanity's obedience", "Satan's power", "God's character", "The church's mission"],
      correctIndex: 2,
      explanation: "The Great Controversy is ultimately about vindicating God's character of love before the watching universe.",
    },
    {
      id: "bai-009",
      assessmentId: "ba-003",
      question: "According to Ellen G. White, how did the Father relate to the Son's suffering on the cross?",
      options: ["The Father turned away", "The Father suffered with His Son", "The Father was indifferent", "The Father could not watch"],
      correctIndex: 1,
      explanation: "Ellen G. White wrote: 'The Father suffers with His Son' (The Desire of Ages, p. 693), showing the Father's deep involvement in the atonement.",
    },
  ]);

  // ── New Believer Path ──────────────────────────────────────────────────────

  const nbModules = [
    { id: "nbmod-001", trackId: trackNewBeliever, title: "Understanding Salvation", description: "Discover what it means to be saved by grace through faith in Jesus Christ.", learningObjective: "Explain in your own words what grace means and why salvation cannot be earned — using Romans 3:23-24 and Ephesians 2:8-9 as anchors.", moduleOrder: 1, totalLessons: 2 },
    { id: "nbmod-002", trackId: trackNewBeliever, title: "Baptism & New Life", description: "Explore the meaning of baptism and the new life it symbolizes.", learningObjective: "Articulate the biblical meaning of baptism by immersion and describe what \"new life in Christ\" looks like practically.", moduleOrder: 2, totalLessons: 2 },
    { id: "nbmod-003", trackId: trackNewBeliever, title: "The Sabbath Gift", description: "Discover the blessing of the seventh-day Sabbath as a gift from God.", learningObjective: "Articulate the theological meaning of Sabbath as covenant and identity, and begin implementing a personal Sabbath rhythm.", moduleOrder: 3, totalLessons: 2 },
    { id: "nbmod-004", trackId: trackNewBeliever, title: "Life in Community", description: "Learn what it means to be part of the body of Christ and the Adventist family.", learningObjective: "Describe your role in the body of Christ and identify at least one way you will actively participate in your local church community.", moduleOrder: 4, totalLessons: 2 },
  ];
  await db.insert(formationModules).values(nbModules);

  const nbLessons = [
    {
      id: "nbl-001",
      moduleId: "nbmod-001",
      title: "The Gift of Grace",
      description: "Understanding that salvation is a free gift, not something we earn.",
      lessonOrder: 1,
      anchorText: "Romans 3:23-24",
      anchorBookId: 45,
      anchorChapter: 3,
      anchorVerseStart: 23,
      anchorVerseEnd: 24,
      estimatedMinutes: 25,
    },
    {
      id: "nbl-002",
      moduleId: "nbmod-001",
      title: "Faith That Saves",
      description: "How faith connects us to God's saving grace.",
      lessonOrder: 2,
      anchorText: "Ephesians 2:8-9",
      anchorBookId: 49,
      anchorChapter: 2,
      anchorVerseStart: 8,
      anchorVerseEnd: 9,
      estimatedMinutes: 25,
    },
    { id: "nbl-003", moduleId: "nbmod-002", title: "Why Baptism Matters", description: "The biblical meaning of baptism by immersion.", lessonOrder: 1, anchorText: "Romans 6:3-4", anchorBookId: 45, anchorChapter: 6, anchorVerseStart: 3, anchorVerseEnd: 4, estimatedMinutes: 25 },
    { id: "nbl-004", moduleId: "nbmod-002", title: "Walking in Newness of Life", description: "Living out the reality of your new identity in Christ.", lessonOrder: 2, anchorText: "2 Corinthians 5:17", anchorBookId: 47, anchorChapter: 5, anchorVerseStart: 17, anchorVerseEnd: 17, estimatedMinutes: 25 },
    { id: "nbl-005", moduleId: "nbmod-003", title: "God's Rest Day", description: "Discovering the Sabbath as a day of rest, worship, and relationship.", lessonOrder: 1, anchorText: "Genesis 2:1-3", anchorBookId: 1, anchorChapter: 2, anchorVerseStart: 1, anchorVerseEnd: 3, estimatedMinutes: 25 },
    { id: "nbl-006", moduleId: "nbmod-003", title: "The Sabbath and Jesus", description: "How Jesus kept and honored the Sabbath.", lessonOrder: 2, anchorText: "Mark 2:27-28", anchorBookId: 41, anchorChapter: 2, anchorVerseStart: 27, anchorVerseEnd: 28, estimatedMinutes: 25 },
    { id: "nbl-007", moduleId: "nbmod-004", title: "The Body of Christ", description: "Understanding your place in the church family.", lessonOrder: 1, anchorText: "1 Corinthians 12:12-14", anchorBookId: 46, anchorChapter: 12, anchorVerseStart: 12, anchorVerseEnd: 14, estimatedMinutes: 25 },
    { id: "nbl-008", moduleId: "nbmod-004", title: "Growing Together", description: "The importance of fellowship, service, and mutual encouragement.", lessonOrder: 2, anchorText: "Hebrews 10:24-25", anchorBookId: 58, anchorChapter: 10, anchorVerseStart: 24, anchorVerseEnd: 25, estimatedMinutes: 25 },
  ];
  await db.insert(formationLessons).values(nbLessons);

  const nbSections = [
    { lessonId: "nbl-001", sectionType: "anchor", title: "Anchor Text", content: "\"For all have sinned and fall short of the glory of God, being justified freely by His grace through the redemption that is in Christ Jesus.\" — Romans 3:23-24 (NKJV)", sortOrder: 1 },
    { lessonId: "nbl-001", sectionType: "explain", title: "What Does This Mean?", content: "Paul paints an honest picture of humanity: every person has sinned and missed God's standard. But the very next breath brings astonishing good news — we are \"justified freely by His grace.\" The word \"freely\" (dorean) means \"as a gift, without cost to the recipient.\"\n\nJustification is a legal term meaning \"declared righteous.\" When God justifies us, He doesn't pretend we haven't sinned. Instead, through Christ's sacrifice, He applies Jesus' perfect righteousness to our account. This is the great exchange — our sin for His righteousness.\n\nThe phrase \"through the redemption that is in Christ Jesus\" points to the price paid: Christ's life and death are the basis of our freedom. Redemption (apolytrosis) literally means \"release through payment of a ransom.\"", sortOrder: 2 },
    { lessonId: "nbl-001", sectionType: "integrate", title: "The Adventist Understanding", content: "Adventists wholeheartedly affirm salvation by grace through faith. Some may wonder whether Adventist emphasis on Sabbath-keeping and health principles means we believe in salvation by works. The answer is an emphatic no.\n\nAdventists understand that:\n1. **Salvation is entirely a gift** — We are saved by grace alone, through faith alone, in Christ alone.\n2. **Obedience is the fruit, not the root** — We keep God's commandments not to earn salvation but because we are saved. Obedience flows from a love relationship with Jesus.\n3. **The Great Controversy perspective** — Satan accuses God of being unfair and accuses believers of being unworthy. Grace answers both charges.\n4. **Sanctification is ongoing** — While justification is instantaneous, sanctification is the work of a lifetime, empowered by the Holy Spirit.", sortOrder: 3 },
    { lessonId: "nbl-001", sectionType: "practice", title: "Try This", content: "1. **Gratitude list** — Write down five specific ways God's grace has touched your life.\n2. **Grace conversation** — Share with someone how you came to understand God's grace.\n3. **Memorize** Romans 3:23-24 this week.", sortOrder: 4 },
    { lessonId: "nbl-001", sectionType: "reflection", title: "Reflect", content: "1. When you hear the word \"grace,\" what feelings come up for you?\n2. Is it easy or difficult for you to accept a gift you haven't earned? Why?\n3. How does knowing you are \"justified freely\" change the way you approach God in prayer?", sortOrder: 5 },
    { lessonId: "nbl-001", sectionType: "assessment", title: "Check Your Understanding", content: "A brief quiz on the key concepts from this lesson.", sortOrder: 6 },

    { lessonId: "nbl-002", sectionType: "anchor", title: "Anchor Text", content: "\"For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, lest anyone should boast.\" — Ephesians 2:8-9 (NKJV)", sortOrder: 1 },
    { lessonId: "nbl-002", sectionType: "explain", title: "What Does This Mean?", content: "Paul reinforces the message of Romans with even greater clarity. Salvation involves two divine gifts: grace (God's unmerited favor) and faith (the means by which we receive it). Even faith itself is described as a \"gift of God\" — it is not something we generate on our own.\n\nThe emphatic \"not of works, lest anyone should boast\" eliminates any possibility of human merit. No one will stand before God saying, \"I earned this.\" Salvation levels the playing field completely — all are equally dependent on God's generosity.\n\nBut notice what comes next in Ephesians 2:10 (read it!): \"For we are His workmanship, created in Christ Jesus for good works.\" Good works are not the cause of salvation but its result. We are saved FOR good works, not BY good works.", sortOrder: 2 },
    { lessonId: "nbl-002", sectionType: "integrate", title: "The Adventist Understanding", content: "This passage is foundational to the Adventist understanding of righteousness by faith. The 1888 General Conference session marked a turning point when E. J. Waggoner and A. T. Jones emphasized righteousness by faith, redirecting the church's focus from legalism to Christ-centered living.\n\nEllen G. White supported this message enthusiastically, writing: \"The Lord in His great mercy sent a most precious message to His people... This message was to bring more prominently before the world the uplifted Saviour\" (Testimonies to Ministers, p. 91-92).\n\nKey Adventist applications:\n1. **Assurance of salvation** — You can KNOW you are saved (1 John 5:13).\n2. **No spiritual anxiety** — Rest in Christ's finished work.\n3. **Freedom to obey** — Freed from the burden of earning favor, we are free to serve joyfully.\n\nVisit egwwritings.org for more on the 1888 message.", sortOrder: 3 },
    { lessonId: "nbl-002", sectionType: "practice", title: "Try This", content: "1. **Read Ephesians 2:1-10** as a complete unit. Journal what strikes you.\n2. **Identify one area** where you may be trying to earn God's favor. Surrender it in prayer.\n3. **Encourage someone** this week by sharing the good news of grace.", sortOrder: 4 },
    { lessonId: "nbl-002", sectionType: "reflection", title: "Reflect", content: "1. If salvation is truly a gift, why do you think so many people (including Christians) still try to earn it?\n2. How does Ephesians 2:10 balance grace and good works? Can you think of a personal example?\n3. What does assurance of salvation mean to you practically?", sortOrder: 5 },
    { lessonId: "nbl-002", sectionType: "assessment", title: "Check Your Understanding", content: "A brief quiz on the key concepts from this lesson.", sortOrder: 6 },
  ];
  const nbSectionRows = nbSections.map((s, i) => ({ id: `nbls-${i + 1}`, ...s }));
  await db.insert(lessonSections).values(nbSectionRows);

  await db.insert(formationAssessments).values([
    { id: "nba-001", lessonId: "nbl-001", title: "Grace Assessment", passingScore: 70 },
    { id: "nba-002", lessonId: "nbl-002", title: "Faith Assessment", passingScore: 70 },
  ]);

  await db.insert(assessmentItems).values([
    { id: "nbai-001", assessmentId: "nba-001", question: "What does the word 'justified' mean in Romans 3:24?", options: ["Made sinless", "Declared righteous", "Given a second chance", "Forgiven temporarily"], correctIndex: 1, explanation: "Justification is a legal term meaning 'declared righteous' — God applies Christ's perfect righteousness to our account." },
    { id: "nbai-002", assessmentId: "nba-001", question: "What does the Greek word 'dorean' (freely) mean?", options: ["After payment", "As a gift", "In exchange for faith", "Conditionally"], correctIndex: 1, explanation: "Dorean means 'as a gift, without cost to the recipient.'" },
    { id: "nbai-003", assessmentId: "nba-002", question: "According to Ephesians 2:8-9, what is the relationship between works and salvation?", options: ["Works earn salvation", "Works maintain salvation", "Works are not the basis of salvation", "Works are irrelevant"], correctIndex: 2, explanation: "Paul states salvation is 'not of works, lest anyone should boast.' Good works are the result of salvation (v.10), not its cause." },
  ]);

  // ── Prophecy Foundations ───────────────────────────────────────────────────

  const propModules = [
    { id: "pmod-001", trackId: trackProphecy, title: "Daniel 2 — The Statue", description: "King Nebuchadnezzar's dream of a great metallic statue and its meaning for world history.", learningObjective: "Explain the historicist interpretation of Daniel 2, identify each metal with its empire, and articulate why the stone \"cut without hands\" points to Christ's second coming.", moduleOrder: 1, totalLessons: 2 },
    { id: "pmod-002", trackId: trackProphecy, title: "Daniel 7 — The Beasts", description: "Daniel's vision of four beasts rising from the sea and the Ancient of Days' judgment.", learningObjective: "Explain the historicist interpretation of Daniel 7, identify each beast, describe the little horn criteria, and articulate the significance of the pre-advent judgment scene.", moduleOrder: 2, totalLessons: 2 },
  ];
  await db.insert(formationModules).values(propModules);

  const propLessons = [
    { id: "pl-001", moduleId: "pmod-001", title: "Nebuchadnezzar's Dream", description: "The king's troubling dream and God's revelation to Daniel.", lessonOrder: 1, anchorText: "Daniel 2:1-30", anchorBookId: 27, anchorChapter: 2, anchorVerseStart: 1, anchorVerseEnd: 30, estimatedMinutes: 35 },
    { id: "pl-002", moduleId: "pmod-001", title: "The Interpretation", description: "The meaning of the statue's metals and the stone that fills the earth.", lessonOrder: 2, anchorText: "Daniel 2:31-45", anchorBookId: 27, anchorChapter: 2, anchorVerseStart: 31, anchorVerseEnd: 45, estimatedMinutes: 35 },
    { id: "pl-003", moduleId: "pmod-002", title: "Four Great Beasts", description: "Daniel's vision of a lion, bear, leopard, and terrifying fourth beast.", lessonOrder: 1, anchorText: "Daniel 7:1-14", anchorBookId: 27, anchorChapter: 7, anchorVerseStart: 1, anchorVerseEnd: 14, estimatedMinutes: 35 },
    { id: "pl-004", moduleId: "pmod-002", title: "The Judgment Scene", description: "The Ancient of Days takes His seat, and the Son of Man receives an everlasting kingdom.", lessonOrder: 2, anchorText: "Daniel 7:15-28", anchorBookId: 27, anchorChapter: 7, anchorVerseStart: 15, anchorVerseEnd: 28, estimatedMinutes: 35 },
  ];
  await db.insert(formationLessons).values(propLessons);

  const propSections = [
    { lessonId: "pl-001", sectionType: "anchor", title: "Anchor Text", content: "Read Daniel 2:1-30. Pay special attention to verses 19-23, where Daniel praises God for revealing the mystery, and verses 27-28, where Daniel credits God before the king.", sortOrder: 1 },
    { lessonId: "pl-001", sectionType: "explain", title: "What Happened?", content: "In the second year of his reign, King Nebuchadnezzar had a dream so disturbing that he could not sleep. When he demanded that his wise men not only interpret the dream but also tell him what it was, they protested that no human could do such a thing. The king ordered their execution.\n\nDaniel, upon hearing of the decree, requested time and gathered his friends Hananiah, Mishael, and Azariah to pray. God revealed the dream and its interpretation to Daniel in a night vision.\n\nNotice Daniel's response — not self-congratulation but worship: \"Blessed be the name of God forever and ever, for wisdom and might are His\" (Daniel 2:20). When brought before the king, Daniel made clear: \"There is a God in heaven who reveals secrets\" (2:28). The entire narrative establishes that prophecy is God's initiative, not human cleverness.", sortOrder: 2 },
    { lessonId: "pl-001", sectionType: "integrate", title: "SDA Prophetic Method", content: "This chapter introduces the Adventist historicist method of prophetic interpretation:\n\n1. **Historicism** — Prophecy unfolds progressively through history, from the prophet's day to the end of time. This contrasts with preterism (all fulfilled in the past) and futurism (all future).\n2. **The Adventist approach** begins with letting the Bible interpret itself. Daniel 2 provides its own interpretation key — the metals represent successive world empires.\n3. **Prophecy builds confidence** — As we see fulfilled prophecy, our trust in God's sovereignty and His ability to guide the future grows.\n4. **The Great Controversy lens** — Behind the rise and fall of empires, a cosmic conflict unfolds. God is not absent from history; He is directing it toward the final triumph of His kingdom.\n\nEllen G. White wrote extensively on Daniel's prophecies. Visit egwwritings.org and search \"Daniel 2\" for her commentary in Prophets and Kings.", sortOrder: 3 },
    { lessonId: "pl-001", sectionType: "practice", title: "Study Exercise", content: "1. **Read Daniel 2:1-30** in a single sitting, noting every instance where God is credited as the source of revelation.\n2. **Map the narrative** — List the key characters, their actions, and their motivations.\n3. **Prayer exercise** — Like Daniel, bring a pressing question to God in prayer this week. Journal anything the Holy Spirit impresses upon your heart.", sortOrder: 4 },
    { lessonId: "pl-001", sectionType: "reflection", title: "Reflect", content: "1. What does Daniel's response to crisis (prayer rather than panic) teach you about facing challenges?\n2. How does knowing that God reveals secrets give you confidence about the future?\n3. Daniel credited God before the king. How can you give God credit in your daily life?", sortOrder: 5 },
    { lessonId: "pl-001", sectionType: "assessment", title: "Knowledge Check", content: "Test your understanding of Daniel 2:1-30.", sortOrder: 6 },

    { lessonId: "pl-002", sectionType: "anchor", title: "Anchor Text", content: "Read Daniel 2:31-45. Focus on the progression of metals (gold, silver, bronze, iron, iron/clay) and the stone \"cut out without hands\" that fills the whole earth.", sortOrder: 1 },
    { lessonId: "pl-002", sectionType: "explain", title: "The Statue Explained", content: "The statue in Nebuchadnezzar's dream represents a panorama of world history:\n\n- **Head of Gold** — Babylon (626-539 BC). Daniel told Nebuchadnezzar directly: \"You are this head of gold\" (2:38).\n- **Chest and Arms of Silver** — Medo-Persia (539-331 BC). The dual arms represent the dual nature of the empire.\n- **Belly and Thighs of Bronze** — Greece (331-168 BC). Alexander the Great conquered the known world.\n- **Legs of Iron** — Rome (168 BC - AD 476). Iron aptly describes Rome's crushing military power.\n- **Feet of Iron and Clay** — Divided Europe (AD 476 - present). The mixture indicates both strength and fragility — nations that \"will not adhere to one another\" (2:43).\n- **The Stone** — God's eternal kingdom. \"Cut out without hands\" signifies its divine origin. It strikes the statue, destroys all earthly kingdoms, and fills the whole earth.\n\nNotice the degradation of value from gold to clay — world empires do not improve; they deteriorate. History moves not toward utopia but toward divine intervention.", sortOrder: 2 },
    { lessonId: "pl-002", sectionType: "integrate", title: "SDA Prophetic Understanding", content: "Adventists have taught this prophecy since the movement's earliest days. Key theological points:\n\n1. **We are living in the feet** — The divided state of Europe, despite every attempt at reunification (Charlemagne, Napoleon, Kaiser Wilhelm, Hitler, the EU), confirms the prophecy: \"they will not adhere to one another.\"\n2. **The stone is yet to come** — The stone represents Christ's second coming and the establishment of God's eternal kingdom. It has not yet struck the statue.\n3. **No fifth empire** — After Rome's division, no single power will unite the world again before Christ returns. This is a powerful test of the prophecy.\n4. **Historicist confirmation** — Each metal was fulfilled in exact historical sequence, validating the historicist method and building confidence in unfulfilled prophecy.\n\nEllen G. White called Daniel 2 one of the most important prophecies for establishing confidence in God's sovereignty over history.", sortOrder: 3 },
    { lessonId: "pl-002", sectionType: "practice", title: "Study Exercise", content: "1. **Create a chart** matching each metal/material to its empire, with approximate dates.\n2. **Historical research** — Identify one specific attempt to reunite Europe that fulfilled \"they will not adhere to one another.\"\n3. **Share** the statue prophecy with someone this week using your chart as a visual aid.", sortOrder: 4 },
    { lessonId: "pl-002", sectionType: "reflection", title: "Reflect", content: "1. How does the fulfilled accuracy of Daniel 2 affect your confidence in biblical prophecy?\n2. What does it mean to you personally that we are living in the \"feet\" of the statue — near the end of human history?\n3. How does the stone \"cut out without hands\" give you hope?", sortOrder: 5 },
    { lessonId: "pl-002", sectionType: "assessment", title: "Knowledge Check", content: "Test your understanding of Daniel 2:31-45.", sortOrder: 6 },

    { lessonId: "pl-003", sectionType: "anchor", title: "Anchor Text", content: "Read Daniel 7:1-14. Note the parallels with Daniel 2: four kingdoms followed by God's eternal kingdom. But Daniel 7 adds new detail — especially the \"little horn\" and the heavenly judgment scene.", sortOrder: 1 },
    { lessonId: "pl-003", sectionType: "explain", title: "The Four Beasts", content: "Daniel's vision in chapter 7 covers the same historical ground as Daniel 2 but from heaven's perspective — what kings see as glorious metals, God sees as ravenous beasts:\n\n- **Lion with Eagle's Wings** — Babylon. The lion was Babylon's national symbol. Wings plucked = Nebuchadnezzar's humiliation (Daniel 4). Given a man's heart = his restoration.\n- **Bear Raised on One Side** — Medo-Persia. One side higher = Persia dominant over Media. Three ribs in its mouth = three major conquests (Lydia, Babylon, Egypt).\n- **Leopard with Four Wings and Four Heads** — Greece. Four wings = supernatural speed of Alexander's conquests. Four heads = the empire's division after his death into four kingdoms (Cassander, Lysimachus, Seleucus, Ptolemy).\n- **Terrifying Fourth Beast** — Rome. Iron teeth (matching Daniel 2's iron legs). Ten horns = the divisions of Western Rome.\n- **The Little Horn** — Rises among the ten, uproots three, speaks great words against the Most High, persecutes the saints, thinks to change times and laws. Given dominion for \"a time, times, and half a time\" (3.5 prophetic years = 1,260 years).\n- **The Ancient of Days** — God takes His seat in judgment. The books are opened. The Son of Man receives an everlasting kingdom.", sortOrder: 2 },
    { lessonId: "pl-003", sectionType: "integrate", title: "SDA Identification", content: "Adventist prophetic interpretation identifies the little horn as the papal system (not individual Catholics). This identification rests on multiple criteria given in the text itself:\n\n1. **Rises among the ten horns** — The papacy rose to power among the divided nations of Western Europe.\n2. **Uproots three horns** — Three Arian kingdoms (Heruli, Vandals, Ostrogoths) were destroyed, clearing the way for papal supremacy.\n3. **Speaks against the Most High** — Claims divine prerogatives (titles like \"Vicar of Christ\").\n4. **Persecutes the saints** — The historical record of religious persecution during the Middle Ages.\n5. **Thinks to change times and laws** — The change of the Sabbath from the seventh day to Sunday, and alteration of the second commandment.\n6. **1,260 years** — AD 538 (Justinian's decree) to 1798 (Napoleon's general arrested the pope).\n\nThis is a system-level identification, not a judgment on individuals. Many sincere Christians worship within this tradition. The focus is on prophetic fulfillment and God's sovereignty.\n\nFor Ellen G. White's extended commentary, visit egwwritings.org and search The Great Controversy, chapters 1-3.", sortOrder: 3 },
    { lessonId: "pl-003", sectionType: "practice", title: "Study Exercise", content: "1. **Side-by-side comparison** — Create a chart matching Daniel 2's metals to Daniel 7's beasts.\n2. **Study Daniel 7:9-10** carefully — Note the details of the judgment scene (thrones placed, Ancient of Days, fiery stream, books opened).\n3. **Cross-reference** — Read Revelation 13 and note the parallels with Daniel 7's beasts.", sortOrder: 4 },
    { lessonId: "pl-003", sectionType: "reflection", title: "Reflect", content: "1. What strikes you about seeing the same empires as beasts rather than metals? What does this say about God's perspective on human power?\n2. How does the judgment scene in Daniel 7:9-14 give you confidence about justice?\n3. What does the phrase \"the saints of the Most High shall receive the kingdom\" (7:18) mean to you personally?", sortOrder: 5 },
    { lessonId: "pl-003", sectionType: "assessment", title: "Knowledge Check", content: "Test your understanding of Daniel 7:1-14.", sortOrder: 6 },

    { lessonId: "pl-004", sectionType: "anchor", title: "Anchor Text", content: "Read Daniel 7:15-28. Focus on the angel's interpretation, especially the identity of the little horn, the judgment, and the final outcome for God's people.", sortOrder: 1 },
    { lessonId: "pl-004", sectionType: "explain", title: "The Interpretation", content: "Daniel was troubled by the vision and asked for explanation. The heavenly interpreter provided key details:\n\n- The four beasts are four kingdoms that arise from the earth (v.17)\n- But the saints of the Most High will receive the kingdom forever (v.18)\n- The fourth beast is the fourth kingdom, different from all others (v.23)\n- The ten horns are ten kings from this kingdom (v.24)\n- Another king rises after them, different, subduing three (v.24)\n- This king speaks against the Most High, wears out the saints, attempts to change times and laws (v.25)\n- His dominion lasts \"a time, times, and half a time\" — then the court sits in judgment (v.25-26)\n- The kingdom, dominion, and greatness of all kingdoms shall be given to the saints (v.27)\n\nThe climax of Daniel 7 is not the little horn's persecution but the judgment and the saints' vindication. God has the final word.", sortOrder: 2 },
    { lessonId: "pl-004", sectionType: "integrate", title: "The Pre-Advent Judgment", content: "Daniel 7 is foundational to the distinctive Adventist doctrine of the pre-advent (investigative) judgment:\n\n1. **The judgment precedes the kingdom** — In Daniel 7, the court sits (v.26) BEFORE the Son of Man receives the kingdom (v.14). This means a judgment occurs before Christ returns.\n2. **Books are opened** — This judgment involves a review of records (v.10). Adventists connect this to the Day of Atonement imagery in Leviticus 16 and Daniel 8:14.\n3. **The judgment vindicates God's people** — The purpose is not to condemn but to confirm: who has accepted Christ's sacrifice? Who belongs to His kingdom?\n4. **1844 connection** — Adventists believe this judgment phase began in 1844, based on the 2,300-day prophecy of Daniel 8:14 (studied in depth in later modules).\n5. **Practical significance** — The pre-advent judgment is good news: God takes seriously every act of injustice, and every faithful believer will be vindicated.\n\nThis doctrine is unique to Adventism and gives cosmic significance to our daily walk with Christ.", sortOrder: 3 },
    { lessonId: "pl-004", sectionType: "practice", title: "Study Exercise", content: "1. **Outline Daniel 7** from beginning to end, noting: the four beasts, the little horn, the judgment scene, and the final kingdom.\n2. **Compare** Daniel 7:13-14 with Matthew 24:30 and Revelation 1:7. How do these passages relate?\n3. **Memorize** Daniel 7:27 — the promise that the kingdom will belong to God's people.", sortOrder: 4 },
    { lessonId: "pl-004", sectionType: "reflection", title: "Reflect", content: "1. How does the concept of a pre-advent judgment make you feel? Does it bring anxiety or assurance? Why?\n2. What comfort do you find in knowing that God's judgment vindicates the faithful?\n3. How does the promise of an everlasting kingdom shape your priorities today?", sortOrder: 5 },
    { lessonId: "pl-004", sectionType: "assessment", title: "Knowledge Check", content: "Test your understanding of Daniel 7:15-28 and the pre-advent judgment.", sortOrder: 6 },
  ];
  const propSectionRows = propSections.map((s, i) => ({ id: `pls-${i + 1}`, ...s }));
  await db.insert(lessonSections).values(propSectionRows);

  await db.insert(formationAssessments).values([
    { id: "pa-001", lessonId: "pl-001", title: "Daniel 2 Context Assessment", passingScore: 70 },
    { id: "pa-002", lessonId: "pl-002", title: "Daniel 2 Interpretation Assessment", passingScore: 70 },
    { id: "pa-003", lessonId: "pl-003", title: "Daniel 7 Beasts Assessment", passingScore: 70 },
    { id: "pa-004", lessonId: "pl-004", title: "Daniel 7 Judgment Assessment", passingScore: 70 },
  ]);

  await db.insert(assessmentItems).values([
    { id: "pai-001", assessmentId: "pa-001", question: "Why couldn't the wise men of Babylon interpret the king's dream?", options: ["They were not educated enough", "The king couldn't remember it", "The king demanded they tell him both the dream AND its interpretation", "They refused to try"], correctIndex: 2, explanation: "Nebuchadnezzar demanded his wise men tell him the dream itself, not just interpret it — an impossible task without divine help." },
    { id: "pai-002", assessmentId: "pa-001", question: "What did Daniel do when he heard about the death decree?", options: ["He fled the city", "He confronted the king", "He gathered friends to pray", "He consulted wise men"], correctIndex: 2, explanation: "Daniel gathered Hananiah, Mishael, and Azariah to pray, and God revealed the dream in a night vision." },

    { id: "pai-003", assessmentId: "pa-002", question: "What does the head of gold in Nebuchadnezzar's statue represent?", options: ["Egypt", "Babylon", "Assyria", "Persia"], correctIndex: 1, explanation: "Daniel told Nebuchadnezzar directly: 'You are this head of gold' (Daniel 2:38), identifying Babylon." },
    { id: "pai-004", assessmentId: "pa-002", question: "What does the stone 'cut out without hands' represent?", options: ["A human revolution", "God's eternal kingdom", "A natural disaster", "A new empire"], correctIndex: 1, explanation: "The stone represents God's kingdom — 'cut out without hands' means it is of divine, not human, origin." },
    { id: "pai-005", assessmentId: "pa-002", question: "What does the mixture of iron and clay in the feet signify?", options: ["A strong united empire", "Divided nations that will not permanently unite", "A wealthy empire", "A religious empire"], correctIndex: 1, explanation: "Iron mixed with clay represents division — 'they will not adhere to one another' (Daniel 2:43). Europe has remained divided despite many attempts at reunification." },

    { id: "pai-006", assessmentId: "pa-003", question: "In Daniel 7, what does the leopard with four heads represent?", options: ["Babylon", "Medo-Persia", "Greece (divided into four kingdoms)", "Rome"], correctIndex: 2, explanation: "The leopard = Greece. Four heads = the four divisions of Alexander's empire after his death." },
    { id: "pai-007", assessmentId: "pa-003", question: "The 'little horn' of Daniel 7 has characteristics that Adventists identify with which power?", options: ["Babylon", "Greece", "The papal system", "Modern Israel"], correctIndex: 2, explanation: "Based on the text's criteria (rises among the ten, uproots three, speaks against God, persecutes saints, changes times and laws, 1,260-year period), Adventists identify the little horn as the papal system." },

    { id: "pai-008", assessmentId: "pa-004", question: "In Daniel 7, when does the judgment occur relative to Christ receiving the kingdom?", options: ["After Christ receives the kingdom", "At the same time", "Before Christ receives the kingdom", "The text doesn't specify"], correctIndex: 2, explanation: "In Daniel 7:26-27, the court sits in judgment BEFORE the kingdom is given to the Son of Man and the saints. This supports the Adventist teaching of a pre-advent judgment." },
    { id: "pai-009", assessmentId: "pa-004", question: "What is the ultimate outcome of the judgment scene in Daniel 7?", options: ["The beasts gain more power", "The saints receive an everlasting kingdom", "The earth is destroyed", "History repeats"], correctIndex: 1, explanation: "Daniel 7:27 promises: 'The kingdom and dominion... shall be given to the people, the saints of the Most High. His kingdom is an everlasting kingdom.'" },
  ]);

  console.log("Formation tracks seeded successfully.");
}
