import { db } from "../server/db";
import { devotionalPlans, devotionalDays } from "../shared/schema";

const BOOK_IDS: Record<string, number> = {
  Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5,
  Nehemiah: 16, Psalms: 19, Proverbs: 20, Ecclesiastes: 21,
  Isaiah: 23, Jeremiah: 24, Ezekiel: 26, Daniel: 27, Hosea: 28, Joel: 29, Amos: 30, Malachi: 39,
  Matthew: 40, Mark: 41, Luke: 42, John: 43, Acts: 44, Romans: 45,
  "1 Corinthians": 46, "2 Corinthians": 47, Galatians: 48, Ephesians: 49,
  Colossians: 51, "1 Thessalonians": 52, "2 Thessalonians": 53,
  "1 Timothy": 54, "2 Timothy": 55, Hebrews: 58, James: 59,
  "1 Peter": 60, "2 Peter": 61, "1 John": 62, Revelation: 66,
};

async function seed() {
  const allTitles = await db.select({ title: devotionalPlans.title }).from(devotionalPlans);
  const existingPlans = new Set(allTitles.map(r => r.title));
  console.log("Seeding SDA-focused devotional plans...");

  // ==================== PLAN 1: THE SABBATH REST ====================
  if (existingPlans.has("The Sabbath Rest")) { console.log('  Plan "The Sabbath Rest" already exists, skipping.'); } else {
  const [sabbathPlan] = await db.insert(devotionalPlans).values({
    title: "The Sabbath Rest",
    description: "Trace the Sabbath from creation through the New Testament and beyond. Discover why God set apart the seventh day, how Jesus honoured it, and what it means for believers today. Each day explores Scripture's testimony to this sacred gift of rest, worship, and fellowship with the Creator.",
    totalDays: 7,
    estimatedMinutesPerDay: 14,
    isPublished: false,
    provenance: "legacy_unclassified",
  }).returning();

  await db.insert(devotionalDays).values([
    {
      planId: sabbathPlan.id, dayNumber: 1,
      title: "In the Beginning — God Rested",
      bookId: BOOK_IDS.Genesis, chapter: 2, verseStart: 1, verseEnd: 3,
      passageLabel: "Genesis 2:1–3",
      contextNote: "Before sin, before the law, before Israel — God rested on the seventh day and made it holy. The Sabbath is woven into creation itself, a memorial of God's finished work and an invitation to delight in His presence.",
      reflectionQuestions: [
        "Why did God rest when He never grows weary (Isaiah 40:28)?",
        "What does God 'blessing' and 'sanctifying' a day tell us about His intentions for time itself?",
        "How does knowing the Sabbath predates the law change how you think about it?"
      ],
      prayerPrompt: "Lord, You made the Sabbath for me before I ever existed. Teach me to receive it not as a burden but as a gift — a weekly reminder that You finish what You begin.",
      thenContext: "In the ancient Near East, rest signified sovereignty and completed victory. God resting on the seventh day declared His creation complete and very good.",
      nowApplication: "The Sabbath invites us to stop striving and trust that God's work is sufficient. In a culture of constant productivity, choosing rest is an act of faith.",
    },
    {
      planId: sabbathPlan.id, dayNumber: 2,
      title: "Remember — The Fourth Commandment",
      bookId: BOOK_IDS.Exodus, chapter: 20, verseStart: 8, verseEnd: 11,
      passageLabel: "Exodus 20:8–11",
      contextNote: "God does not say 'begin keeping the Sabbath' but 'remember' — pointing back to something already established. The command anchors the Sabbath in creation and links rest to the character of the Creator.",
      reflectionQuestions: [
        "Why does the commandment begin with 'Remember'? What might Israel have been in danger of forgetting?",
        "The Sabbath extends to servants, strangers, and even animals. What does this reveal about God's justice?",
        "How can you structure your week so the Sabbath is genuinely restful?"
      ],
      prayerPrompt: "Father, help me remember what You have asked me to remember. May the seventh day be a sign between us — a weekly confession that You are my Creator and Redeemer.",
      thenContext: "Israel had been slaves in Egypt with no rest. The Sabbath commandment was a declaration of freedom — they now belonged to a God who valued their rest.",
      nowApplication: "Keeping the Sabbath is a radical act of trust: we stop earning and let God provide. It also calls us to ensure others can rest too.",
    },
    {
      planId: sabbathPlan.id, dayNumber: 3,
      title: "A Delight, Not a Burden",
      bookId: BOOK_IDS.Isaiah, chapter: 58, verseStart: 13, verseEnd: 14,
      passageLabel: "Isaiah 58:13–14",
      contextNote: "Isaiah reframes the Sabbath from obligation to joy. When God's people call the Sabbath a 'delight' and honour Him in it, He promises to raise them up and feed them the heritage of Jacob.",
      reflectionQuestions: [
        "What is the difference between legalistic Sabbath-keeping and calling the Sabbath a 'delight'?",
        "How can your Sabbath practices move from rule-following toward genuine enjoyment of God?",
        "What activities bring you closest to God's presence and could enrich your Sabbath?"
      ],
      prayerPrompt: "God of rest, reshape my Sabbath from duty to delight. Let me find my joy in You and discover that Your commandments are not grievous but life-giving.",
      thenContext: "Isaiah 58 critiques empty religious ritual. True worship includes justice, mercy, and wholehearted Sabbath-keeping — not performative piety.",
      nowApplication: "The Sabbath is meant to be the best day of the week — time for worship, nature, fellowship, and renewal. When it feels like a burden, something has gone wrong.",
    },
    {
      planId: sabbathPlan.id, dayNumber: 4,
      title: "Jesus, Lord of the Sabbath",
      bookId: BOOK_IDS.Mark, chapter: 2, verseStart: 23, verseEnd: 28,
      passageLabel: "Mark 2:23–28",
      contextNote: "When the Pharisees criticized His disciples for plucking grain on the Sabbath, Jesus reminded them that the Sabbath was made for man — not man for the Sabbath. He did not abolish the Sabbath; He reclaimed its purpose.",
      reflectionQuestions: [
        "What did Jesus mean by saying 'The Sabbath was made for man'?",
        "How had the Pharisees turned God's gift into a burden?",
        "Jesus healed on the Sabbath (Mark 3:1–5). How does this show the Sabbath's true purpose?"
      ],
      prayerPrompt: "Lord Jesus, You are the Lord of the Sabbath. Free me from any legalism that obscures the beauty of rest. Help me follow Your example of using the Sabbath for restoration and mercy.",
      thenContext: "By Jesus' day, rabbinic tradition had added hundreds of rules to the Sabbath. Jesus cut through the additions to recover the original intent: a day that serves human flourishing.",
      nowApplication: "Jesus' Sabbath-keeping was marked by worship, healing, teaching, and fellowship. That pattern guides how we approach the day today.",
    },
    {
      planId: sabbathPlan.id, dayNumber: 5,
      title: "A Sabbath Rest Remains",
      bookId: BOOK_IDS.Hebrews, chapter: 4, verseStart: 1, verseEnd: 11,
      passageLabel: "Hebrews 4:1–11",
      contextNote: "The writer of Hebrews declares that a 'sabbatismos' — a Sabbath-rest — remains for the people of God. This rest is both present reality and future hope, grounded in Christ's finished work.",
      reflectionQuestions: [
        "Hebrews uses the Greek word 'sabbatismos' (Sabbath-keeping) rather than 'katapausis' (general rest). Why is this distinction significant?",
        "How does entering God's rest connect to faith (verse 3)?",
        "What does it mean to 'cease from your own works as God did from His' (verse 10)?"
      ],
      prayerPrompt: "Heavenly Father, thank You that the Sabbath rest was not abolished but remains for Your people. Teach me to enter that rest by faith, ceasing from my own striving and trusting in Christ's completed work.",
      thenContext: "The Hebrew Christians were under pressure to revert to Judaism or abandon their faith. Hebrews encourages them that the full Sabbath promise — including its eschatological fulfilment — still stands.",
      nowApplication: "The weekly Sabbath is a foretaste of eternal rest. Every seventh day we rehearse the truth that salvation is God's work, not ours.",
    },
    {
      planId: sabbathPlan.id, dayNumber: 6,
      title: "The Sabbath in the New Earth",
      bookId: BOOK_IDS.Isaiah, chapter: 66, verseStart: 22, verseEnd: 23,
      passageLabel: "Isaiah 66:22–23",
      contextNote: "Isaiah's vision of the new heavens and new earth includes Sabbath worship: 'from one Sabbath to another, shall all flesh come to worship before me.' The Sabbath stretches from Eden past into eternity future.",
      reflectionQuestions: [
        "If the Sabbath will be kept in the new earth, what does this imply about its permanence?",
        "How does this future vision shape your Sabbath-keeping today?",
        "What would it feel like to worship God with 'all flesh' in the restored creation?"
      ],
      prayerPrompt: "Creator God, from Eden to the new earth, the Sabbath is Your gift. Let my weekly worship be a rehearsal for eternity, a taste of the world to come.",
      thenContext: "Isaiah's prophecy bridges the gap between present suffering and future glory. The Sabbath endures because it is rooted in God's character, not in any temporary dispensation.",
      nowApplication: "Sabbath-keeping connects us to the past (creation), the present (salvation by grace), and the future (eternal rest). It is a thread running through the entire biblical story.",
    },
    {
      planId: sabbathPlan.id, dayNumber: 7,
      title: "Sign of Sanctification",
      bookId: BOOK_IDS.Ezekiel, chapter: 20, verseStart: 12, verseEnd: 20,
      passageLabel: "Ezekiel 20:12, 20",
      contextNote: "God calls the Sabbath a sign between Himself and His people — a marker of the relationship and a reminder that 'I am the Lord that doth sanctify you.' The Sabbath is not merely about rest but about identity.",
      reflectionQuestions: [
        "What does it mean that the Sabbath is a 'sign' between God and His people?",
        "How is sanctification connected to Sabbath-keeping?",
        "In what ways does honouring the Sabbath shape your identity as a child of God?"
      ],
      prayerPrompt: "Lord, let the Sabbath be a sign that I belong to You. Sanctify me through this day of rest and worship, setting me apart for Your purposes in a restless world.",
      thenContext: "Ezekiel spoke to Israel in exile — a people who had neglected God's Sabbaths. The call to honour the Sabbath was a call to return to covenant faithfulness.",
      nowApplication: "In a world that defines us by what we produce, the Sabbath defines us by Whose we are. Keeping it is a visible declaration of faith.",
    },
  ]);
  console.log("  Created: The Sabbath Rest (7 days)");
  }

  // ==================== PLAN 2: DANIEL'S PROPHECIES — END-TIME VISIONS ====================
  if (existingPlans.has("Daniel's Prophecies — End-Time Visions")) { console.log('  Plan "Daniel\'s Prophecies" already exists, skipping.'); } else {
  const [danielPlan] = await db.insert(devotionalPlans).values({
    title: "Daniel's Prophecies — End-Time Visions",
    description: "Walk through the great prophetic visions of Daniel — from Nebuchadnezzar's image to the beasts of chapter 7, the 2,300-day prophecy, and the time of the end. Discover how God reveals the sweep of history and His ultimate triumph over earthly powers.",
    totalDays: 7,
    estimatedMinutesPerDay: 16,
    isPublished: false,
    provenance: "legacy_unclassified",
  }).returning();

  await db.insert(devotionalDays).values([
    {
      planId: danielPlan.id, dayNumber: 1,
      title: "The Great Image — Kingdoms Rise and Fall",
      bookId: BOOK_IDS.Daniel, chapter: 2, verseStart: 31, verseEnd: 45,
      passageLabel: "Daniel 2:31–45",
      contextNote: "Nebuchadnezzar's dream reveals the succession of world empires — Babylon, Medo-Persia, Greece, and Rome — and a final kingdom set up by God that shall never be destroyed. The stone cut without hands is Christ's eternal kingdom.",
      reflectionQuestions: [
        "Why did God choose to reveal future history to a pagan king?",
        "What confidence does fulfilled prophecy give you about promises still unfulfilled?",
        "How does knowing that earthly kingdoms are temporary affect how you view current events?"
      ],
      prayerPrompt: "Sovereign God, You hold the rise and fall of nations in Your hand. Help me place my hope not in earthly powers but in the kingdom that shall stand forever.",
      thenContext: "Daniel interpreted this dream around 603 BC. History has confirmed the succession of Babylon, Medo-Persia, Greece, and Rome — exactly as foretold.",
      nowApplication: "We live in the 'toes' of the image — a divided world awaiting the stone kingdom. Prophecy invites us to watch, prepare, and trust.",
    },
    {
      planId: danielPlan.id, dayNumber: 2,
      title: "Four Beasts and the Son of Man",
      bookId: BOOK_IDS.Daniel, chapter: 7, verseStart: 1, verseEnd: 14,
      passageLabel: "Daniel 7:1–14",
      contextNote: "Daniel's vision of four beasts parallels Daniel 2 but adds detail — especially the little horn power that speaks great words against the Most High and persecutes God's people. The vision climaxes with the Son of Man receiving an everlasting dominion.",
      reflectionQuestions: [
        "Why does God repeat and expand His prophetic outline across multiple visions?",
        "What comfort does verse 14 offer — 'His dominion is an everlasting dominion'?",
        "How does the Son of Man's triumph assure you when worldly powers seem overwhelming?"
      ],
      prayerPrompt: "Ancient of Days, You sit enthroned above all earthly chaos. When the beasts rage, remind me that the final kingdom belongs to the Son of Man — and to His saints.",
      thenContext: "Daniel received this vision around 553 BC. The four beasts correspond to the same empires as Daniel 2: Babylon (lion), Medo-Persia (bear), Greece (leopard), and Rome (dreadful beast).",
      nowApplication: "The little horn's attack on God's law and people has been fulfilled in history. Knowing the script gives confidence that the final scenes will also unfold as God has declared.",
    },
    {
      planId: danielPlan.id, dayNumber: 3,
      title: "The Judgment Scene",
      bookId: BOOK_IDS.Daniel, chapter: 7, verseStart: 9, verseEnd: 14,
      passageLabel: "Daniel 7:9–14, 26–27",
      contextNote: "Thrones are set, books are opened, and the Ancient of Days presides over a heavenly court. This pre-advent judgment vindicates God's people and strips the little horn of its power before the Son of Man receives the kingdom.",
      reflectionQuestions: [
        "What does it mean that 'the books were opened' (verse 10)?",
        "How does the heavenly judgment vindicate both God's character and His people?",
        "Does the idea of judgment fill you with fear or hope? Why?"
      ],
      prayerPrompt: "Righteous Judge, I trust that Your judgment is fair, thorough, and full of mercy. Thank You that in Christ, my Advocate, the verdict is already in my favour.",
      thenContext: "The judgment scene takes place before the second coming — it is an investigative judgment that determines the destiny of those who have professed faith.",
      nowApplication: "The pre-advent judgment assures us that God does not act arbitrarily. Every case is examined, every question answered, before Christ returns.",
    },
    {
      planId: danielPlan.id, dayNumber: 4,
      title: "The 2,300 Days and the Sanctuary",
      bookId: BOOK_IDS.Daniel, chapter: 8, verseStart: 13, verseEnd: 14,
      passageLabel: "Daniel 8:13–14, 9:24–27",
      contextNote: "The 2,300-day prophecy points to 1844 and the beginning of the heavenly sanctuary's cleansing — the antitypical Day of Atonement. The 70 weeks of Daniel 9 are 'cut off' from this larger time period, anchoring the prophecy to the Messiah's coming.",
      reflectionQuestions: [
        "How does the year-day principle help us understand long-range Bible prophecy?",
        "What is the significance of the sanctuary being 'cleansed' or 'vindicated'?",
        "How does the 70-week prophecy confirm Jesus as the Messiah?"
      ],
      prayerPrompt: "God of precision, Your prophetic timeline points unmistakably to Jesus. Strengthen my confidence that Your word is sure and that the cleansing of the sanctuary is underway.",
      thenContext: "The 2,300 days (years) begin in 457 BC with the decree to restore Jerusalem. The 70 weeks (490 years) reach to the Messiah's baptism (AD 27), His death (AD 31), and the gospel going to the Gentiles (AD 34).",
      nowApplication: "Since 1844, we live in the antitypical Day of Atonement — a time of judgment and preparation. This is not a reason for fear but for earnest, joyful readiness.",
    },
    {
      planId: danielPlan.id, dayNumber: 5,
      title: "The Time of the End",
      bookId: BOOK_IDS.Daniel, chapter: 12, verseStart: 1, verseEnd: 4,
      passageLabel: "Daniel 12:1–4",
      contextNote: "Daniel's final chapter describes the time of trouble, the deliverance of God's people, the resurrection, and the sealing of the prophecy until the 'time of the end' when knowledge shall increase.",
      reflectionQuestions: [
        "Who is Michael (verse 1) and what does His 'standing up' signify?",
        "How does the promise of resurrection in verse 2 shape your view of death?",
        "What does it mean that 'knowledge shall be increased' in the time of the end?"
      ],
      prayerPrompt: "Prince Michael, stand up for Your people. In the time of trouble, be our deliverer. Give us courage to endure and faith to trust Your promises.",
      thenContext: "Michael is identified elsewhere in Scripture as Christ (Jude 9, Revelation 12:7). His 'standing up' marks the close of probation and the beginning of final events.",
      nowApplication: "We live in the time when the sealed prophecies are being unsealed. Understanding Daniel is not optional — it is preparation for what lies ahead.",
    },
    {
      planId: danielPlan.id, dayNumber: 6,
      title: "The Three Angels' Messages",
      bookId: BOOK_IDS.Revelation, chapter: 14, verseStart: 6, verseEnd: 12,
      passageLabel: "Revelation 14:6–12",
      contextNote: "Three angels carry God's final messages to the world: fear God and worship the Creator, Babylon is fallen, and do not receive the mark of the beast. These messages call the world to decision before Christ returns.",
      reflectionQuestions: [
        "The first angel calls us to worship the Creator using Sabbath language (cf. Exodus 20:11). Why is creation worship central to the end times?",
        "What is 'Babylon' and what does its fall mean for God's people?",
        "How do the three angels' messages shape your sense of mission?"
      ],
      prayerPrompt: "Lord of the harvest, give me a heart that carries Your final messages with urgency, compassion, and faithfulness. Let my life be a living proclamation of the everlasting gospel.",
      thenContext: "Revelation 14 follows the description of the beast and its image in chapter 13. The three angels' messages are God's counter-message — a global call to worship the Creator rather than the creature.",
      nowApplication: "These messages are not abstractions — they define the mission of God's end-time people. Sharing the everlasting gospel in the context of the judgment hour is our calling.",
    },
    {
      planId: danielPlan.id, dayNumber: 7,
      title: "The Blessed Hope — Christ Returns",
      bookId: BOOK_IDS.Revelation, chapter: 22, verseStart: 12, verseEnd: 20,
      passageLabel: "Revelation 22:12–20",
      contextNote: "All of Daniel's prophecies and Revelation's visions converge on one event: the visible, glorious return of Jesus Christ. 'Surely I come quickly,' He promises — and every heart that loves Him replies, 'Even so, come, Lord Jesus.'",
      reflectionQuestions: [
        "How does studying prophecy deepen your longing for Christ's return?",
        "What does it mean to be 'ready' for the second coming?",
        "How can you live with urgency and peace at the same time?"
      ],
      prayerPrompt: "Come, Lord Jesus. You have shown me in Daniel and Revelation that history is moving toward Your triumph. Let me live each day in the light of that blessed hope.",
      thenContext: "Revelation closes the canon with the same hope that fills Daniel: God wins. The kingdoms of this world become the kingdom of our Lord and of His Christ.",
      nowApplication: "Prophecy is not given to satisfy curiosity but to prepare a people. The right response to every prophetic truth is worship, readiness, and mission.",
    },
  ]);
  console.log("  Created: Daniel's Prophecies (7 days)");
  }

  // ==================== PLAN 3: HEALTH & DIETARY PRINCIPLES ====================
  if (existingPlans.has("God's Health Blueprint")) { console.log('  Plan "God\'s Health Blueprint" already exists, skipping.'); } else {
  const [healthPlan] = await db.insert(devotionalPlans).values({
    title: "God's Health Blueprint",
    description: "Explore what Scripture teaches about caring for the body as God's temple. From the original diet in Eden to Daniel's pulse test and Paul's temple metaphor, discover how physical health is inseparable from spiritual faithfulness. Each day examines a biblical health principle with practical application.",
    totalDays: 7,
    estimatedMinutesPerDay: 13,
    isPublished: false,
    provenance: "legacy_unclassified",
  }).returning();

  await db.insert(devotionalDays).values([
    {
      planId: healthPlan.id, dayNumber: 1,
      title: "The Original Diet — Eden's Table",
      bookId: BOOK_IDS.Genesis, chapter: 1, verseStart: 29, verseEnd: 31,
      passageLabel: "Genesis 1:29–31",
      contextNote: "Before sin entered the world, God prescribed a plant-based diet: fruits, grains, nuts, and vegetables. This was the Creator's ideal for human nourishment — designed for optimal health in a perfect world.",
      reflectionQuestions: [
        "Why would God begin with a plant-based diet rather than immediately permitting meat?",
        "How does the original diet reflect God's care for both humans and animals?",
        "What practical steps could move your eating closer to Eden's model?"
      ],
      prayerPrompt: "Creator, You designed my body and know what nourishes it best. Give me wisdom and discipline to honour You in my food choices, drawing closer to Your original plan.",
      thenContext: "The Hebrew word translated 'food' in Genesis 1:29 encompasses seeds, fruits, and green plants. Meat was not permitted until after the Flood (Genesis 9:3).",
      nowApplication: "While we live in a fallen world, the Eden diet points toward the ideal. Increasing plant-based foods in our diet aligns with the Creator's original design.",
    },
    {
      planId: healthPlan.id, dayNumber: 2,
      title: "Clean and Unclean — God's Distinctions",
      bookId: BOOK_IDS.Leviticus, chapter: 11, verseStart: 1, verseEnd: 8,
      passageLabel: "Leviticus 11:1–8, 44–47",
      contextNote: "God categorized animals as clean or unclean — a distinction that predates the Mosaic law (Genesis 7:2). These guidelines were given for health and holiness, reflecting God's care for His people's physical wellbeing.",
      reflectionQuestions: [
        "The clean/unclean distinction existed before Sinai (Noah knew it). What does this tell us about its purpose?",
        "Verse 44 connects dietary choices to holiness. How are the two related?",
        "How do you balance cultural food traditions with biblical dietary guidance?"
      ],
      prayerPrompt: "Holy God, You care about every aspect of my life — including what I eat. Help me honour You with choices that reflect Your wisdom, not just my appetite.",
      thenContext: "Modern science has confirmed that many animals classified as unclean (pigs, shellfish, scavengers) carry higher parasite and toxin loads. God's ancient wisdom anticipated what we now understand.",
      nowApplication: "The dietary laws are not arbitrary rules but expressions of a loving Creator's concern for our health. They remain relevant because human physiology has not changed.",
    },
    {
      planId: healthPlan.id, dayNumber: 3,
      title: "Daniel's Health Test",
      bookId: BOOK_IDS.Daniel, chapter: 1, verseStart: 8, verseEnd: 20,
      passageLabel: "Daniel 1:8–20",
      contextNote: "In Babylon, Daniel purposed not to defile himself with the king's meat and wine. After ten days on a plant-based diet, he and his friends were healthier and sharper than all who ate from the royal table.",
      reflectionQuestions: [
        "What motivated Daniel's refusal — legalism or loyalty to God?",
        "How does Daniel's example show that faithfulness in 'small' things like diet has larger consequences?",
        "What 'Babylon's table' temptations do you face with food and drink?"
      ],
      prayerPrompt: "Lord, give me Daniel's resolve. When the culture offers its rich table, help me purpose in my heart to honour You — trusting that Your way leads to true flourishing.",
      thenContext: "The king's food likely included unclean meats and wine offered to idols. Daniel's refusal was both a health decision and a spiritual stand.",
      nowApplication: "Daniel shows us that dietary faithfulness is not legalism but loyalty. What we eat affects our clarity of mind, our energy, and our capacity to serve God.",
    },
    {
      planId: healthPlan.id, dayNumber: 4,
      title: "Your Body Is a Temple",
      bookId: BOOK_IDS["1 Corinthians"], chapter: 6, verseStart: 19, verseEnd: 20,
      passageLabel: "1 Corinthians 6:19–20; 10:31",
      contextNote: "Paul declares that the believer's body is the temple of the Holy Spirit. Whatever we eat or drink should be done to the glory of God. This elevates health from personal preference to spiritual stewardship.",
      reflectionQuestions: [
        "What does it mean practically that your body is a temple of the Holy Spirit?",
        "How does 'whether ye eat or drink, do all to the glory of God' (10:31) apply to daily food choices?",
        "What habits might you change if you truly saw your body as God's dwelling place?"
      ],
      prayerPrompt: "Holy Spirit, You dwell in me. Let me treat my body as Your temple — nourishing it with care, protecting it from harm, and using it for Your glory.",
      thenContext: "In Corinth, the body was viewed as unimportant compared to the soul. Paul corrects this Greek dualism: the body matters because God inhabits it.",
      nowApplication: "Health reform is not about earning salvation but about honouring the One who lives within us. Diet, exercise, rest, and temperance are acts of worship.",
    },
    {
      planId: healthPlan.id, dayNumber: 5,
      title: "Temperance — The Balanced Life",
      bookId: BOOK_IDS.Proverbs, chapter: 23, verseStart: 20, verseEnd: 21,
      passageLabel: "Proverbs 23:20–21, 29–35",
      contextNote: "Scripture consistently warns against excess — particularly with wine and strong drink. Temperance (self-control) is a fruit of the Spirit and a foundation of clear-minded discipleship.",
      reflectionQuestions: [
        "Why does the Bible give such strong warnings about alcohol?",
        "Temperance extends beyond drink to food, media, work, and rest. Where do you need more balance?",
        "How does a clear mind contribute to spiritual discernment?"
      ],
      prayerPrompt: "God of balance, give me the fruit of temperance. Free me from any appetite or habit that dulls my mind or diminishes my witness. Let self-control be my strength.",
      thenContext: "The Hebrew word for 'drunkard' (sobe) describes one who is saturated, overwhelmed. Proverbs warns that excess in any area leads to poverty — physical, mental, and spiritual.",
      nowApplication: "In a world of excess, temperance is countercultural. Clear thinking, moderation, and self-control equip us to hear God's voice and respond to His leading.",
    },
    {
      planId: healthPlan.id, dayNumber: 6,
      title: "Rest, Water, and Sunshine — Creation's Medicine",
      bookId: BOOK_IDS.Psalms, chapter: 104, verseStart: 10, verseEnd: 15,
      passageLabel: "Psalm 104:10–15; Genesis 2:10, 15",
      contextNote: "God's health plan includes more than diet. He provided water, fresh air, sunshine, physical labour (gardening), and rest. These natural remedies are embedded in the creation account and confirmed by modern health science.",
      reflectionQuestions: [
        "How does the creation account model a healthy lifestyle (work, rest, nature, community)?",
        "Which of the natural health principles (water, sunshine, fresh air, exercise, rest, trust in God) do you most neglect?",
        "How can you build more of God's natural remedies into your daily routine?"
      ],
      prayerPrompt: "Great Physician, You have surrounded me with healing — in water, sunlight, air, and rest. Help me receive these gifts daily and trust Your design for wholeness.",
      thenContext: "The eight natural remedies (nutrition, exercise, water, sunlight, temperance, air, rest, trust in God) are drawn from principles embedded throughout Scripture.",
      nowApplication: "Health is holistic. A faithful diet paired with sedentary living and sleep deprivation is incomplete stewardship. God's blueprint addresses the whole person.",
    },
    {
      planId: healthPlan.id, dayNumber: 7,
      title: "Wholeness — Spirit, Mind, and Body",
      bookId: BOOK_IDS["1 Thessalonians"], chapter: 5, verseStart: 23, verseEnd: 23,
      passageLabel: "1 Thessalonians 5:23; 3 John 1:2",
      contextNote: "Paul prays for the whole person — spirit, soul, and body — to be preserved blameless. John wishes above all things that we may prosper and be in health. God's plan for His people is comprehensive wholeness.",
      reflectionQuestions: [
        "Why does God care about the body as well as the soul?",
        "How does physical health affect your spiritual life and vice versa?",
        "What one health commitment will you make as a result of this study?"
      ],
      prayerPrompt: "Lord, sanctify me wholly — spirit, soul, and body. Let every dimension of my life be surrendered to You, that I may serve You with full vigour and clarity until You come.",
      thenContext: "The Greek word 'holoteleis' (wholly/completely) emphasises that sanctification touches every part of our being. No dimension is excluded from God's restorative work.",
      nowApplication: "True health reform is not a salvation issue but a sanctification issue. As we grow in grace, we grow in stewardship of the body God has entrusted to us.",
    },
  ]);
  console.log("  Created: God's Health Blueprint (7 days)");
  }

  // ==================== PLAN 4: THE HEAVENLY SANCTUARY ====================
  if (existingPlans.has("The Heavenly Sanctuary")) { console.log('  Plan "The Heavenly Sanctuary" already exists, skipping.'); } else {
  const [sanctuaryPlan] = await db.insert(devotionalPlans).values({
    title: "The Heavenly Sanctuary",
    description: "Journey from the earthly tabernacle to the heavenly sanctuary where Christ ministers as our High Priest. Understand the Day of Atonement, the meaning of the Most Holy Place, and what Christ's intercession means for you today. Each day unfolds another layer of this central biblical teaching.",
    totalDays: 7,
    estimatedMinutesPerDay: 15,
    isPublished: false,
    provenance: "legacy_unclassified",
  }).returning();

  await db.insert(devotionalDays).values([
    {
      planId: sanctuaryPlan.id, dayNumber: 1,
      title: "The Pattern on the Mountain",
      bookId: BOOK_IDS.Exodus, chapter: 25, verseStart: 8, verseEnd: 9,
      passageLabel: "Exodus 25:8–9, 40; Hebrews 8:1–5",
      contextNote: "God told Moses to build a sanctuary 'according to the pattern' shown on the mountain. The earthly tabernacle was a copy — the real sanctuary is in heaven, where Christ now ministers.",
      reflectionQuestions: [
        "Why did God want to 'dwell among' His people (verse 8)?",
        "What does the heavenly original tell us about the importance of the sanctuary teaching?",
        "How does knowing there is a real sanctuary in heaven affect your prayer life?"
      ],
      prayerPrompt: "God who dwells among Your people, thank You for the sanctuary — a window into heaven's reality. Help me understand what Christ is doing for me right now in the Most Holy Place.",
      thenContext: "The Hebrew word 'tavnit' (pattern) implies a detailed blueprint. Moses did not design the tabernacle — God showed him the heavenly original.",
      nowApplication: "The earthly sanctuary was an object lesson, a teaching tool pointing to Christ's heavenly ministry. Understanding it unlocks the meaning of the cross, intercession, and judgment.",
    },
    {
      planId: sanctuaryPlan.id, dayNumber: 2,
      title: "The Daily Sacrifice — The Lamb of God",
      bookId: BOOK_IDS.Exodus, chapter: 29, verseStart: 38, verseEnd: 42,
      passageLabel: "Exodus 29:38–42; John 1:29",
      contextNote: "Every morning and evening, a lamb was sacrificed on the altar of burnt offering. This daily sacrifice pointed to Christ, 'the Lamb of God, which taketh away the sin of the world.'",
      reflectionQuestions: [
        "What did the daily repetition of sacrifice teach Israel about the seriousness of sin?",
        "How does John the Baptist's declaration (John 1:29) connect the Old Testament type to Jesus?",
        "What does it mean to you personally that Christ is your daily sacrifice?"
      ],
      prayerPrompt: "Lamb of God, You took away my sin — once for all. Let me never take for granted the price You paid or the access to God that Your blood provides.",
      thenContext: "The daily (tamid) sacrifice was the heartbeat of the sanctuary service. It assured Israel that atonement was ongoing and God's presence was accessible.",
      nowApplication: "Christ's sacrifice was offered once, but its benefits are applied daily. Every morning we can come boldly to the throne of grace because the Lamb has been slain.",
    },
    {
      planId: sanctuaryPlan.id, dayNumber: 3,
      title: "The Holy Place — Intercession and Light",
      bookId: BOOK_IDS.Hebrews, chapter: 9, verseStart: 1, verseEnd: 7,
      passageLabel: "Hebrews 9:1–7; Exodus 30:7–8",
      contextNote: "The Holy Place contained three items: the table of showbread (Christ, the Bread of Life), the lampstand (Christ, the Light of the World), and the altar of incense (Christ's intercession). The priests ministered here daily.",
      reflectionQuestions: [
        "How do the three articles of furniture in the Holy Place represent Christ's ministry?",
        "The incense rising with the prayers of God's people (Revelation 8:3–4) — how does this picture encourage your prayer life?",
        "What does it mean that Christ is continually interceding for you?"
      ],
      prayerPrompt: "Great High Priest, You stand in the Holy Place on my behalf. Thank You for the bread of Your Word, the light of Your presence, and the sweet incense of Your prayers for me.",
      thenContext: "Only priests could enter the Holy Place. The furniture represented God's provision (bread), guidance (light), and the access to His presence through prayer (incense).",
      nowApplication: "In Christ, every believer has access to the Holy Place. We feed on His Word, walk in His light, and know that our prayers rise with His intercession.",
    },
    {
      planId: sanctuaryPlan.id, dayNumber: 4,
      title: "The Day of Atonement — Yom Kippur",
      bookId: BOOK_IDS.Leviticus, chapter: 16, verseStart: 29, verseEnd: 34,
      passageLabel: "Leviticus 16:29–34; 23:27–32",
      contextNote: "Once a year, on the tenth day of the seventh month, the high priest entered the Most Holy Place with blood. The sanctuary was cleansed, sins were transferred to the scapegoat, and the people 'afflicted their souls.' This was Israel's Day of Judgment.",
      reflectionQuestions: [
        "Why could the sanctuary become 'defiled' and need cleansing?",
        "What does it mean to 'afflict your soul' on the Day of Atonement?",
        "How does this day foreshadow the pre-advent judgment in Daniel 7 and 8?"
      ],
      prayerPrompt: "Judge of all the earth, the Day of Atonement points to Your heavenly work of judgment. Search my heart, cleanse me from every hidden sin, and prepare me to stand in that great day.",
      thenContext: "The Day of Atonement was the most solemn day of the Jewish year. It combined deep self-examination with the assurance that God provided the means of cleansing.",
      nowApplication: "The antitypical Day of Atonement began in 1844. We live in the time of investigative judgment — a time for serious self-examination, confession, and confidence in Christ's blood.",
    },
    {
      planId: sanctuaryPlan.id, dayNumber: 5,
      title: "Christ in the Most Holy Place",
      bookId: BOOK_IDS.Hebrews, chapter: 9, verseStart: 11, verseEnd: 14,
      passageLabel: "Hebrews 9:11–14, 23–24",
      contextNote: "Christ entered the heavenly sanctuary with His own blood — not the blood of goats and calves. He obtained eternal redemption and now cleanses the heavenly sanctuary itself. His ministry is real, present, and personal.",
      reflectionQuestions: [
        "What makes Christ's blood superior to the blood of animals (verses 13–14)?",
        "Why does the heavenly sanctuary need cleansing (verse 23)?",
        "How does Christ's high priestly ministry give you assurance of salvation?"
      ],
      prayerPrompt: "Jesus, my High Priest, You entered heaven itself to appear in the presence of God for me. I rest in the power of Your eternal blood and the certainty of Your intercession.",
      thenContext: "The heavenly sanctuary is cleansed from the record of confessed sins that have been, as it were, transferred there by faith. This cleansing vindicates God's mercy and justice.",
      nowApplication: "Christ is not idle in heaven. He is actively ministering, interceding, and completing the work of atonement. This is not a distant theological concept — it is happening right now for you.",
    },
    {
      planId: sanctuaryPlan.id, dayNumber: 6,
      title: "The Ark, the Law, and God's Character",
      bookId: BOOK_IDS.Exodus, chapter: 25, verseStart: 21, verseEnd: 22,
      passageLabel: "Exodus 25:21–22; Revelation 11:19",
      contextNote: "Inside the Most Holy Place, the ark of the covenant contained the Ten Commandments — covered by the mercy seat, where God's presence dwelt. The law and mercy meet at the ark. Revelation reveals that the ark exists in the heavenly temple.",
      reflectionQuestions: [
        "What does it mean that God's throne rests upon His law?",
        "How do the mercy seat and the law together reveal God's character?",
        "Revelation 11:19 shows the ark in heaven's temple. Why is this significant for end-time believers?"
      ],
      prayerPrompt: "God of law and mercy, Your throne rests on justice and Your love covers my failures. Let me treasure Your commandments as the foundation of Your government and the expression of Your character.",
      thenContext: "The mercy seat (kapporeth) was the place where the blood was sprinkled on the Day of Atonement. It was literally 'mercy covering the law' — a picture of grace and justice meeting.",
      nowApplication: "The heavenly ark containing God's law reminds us that the Ten Commandments are eternal, not temporary. They reflect God's unchanging character and remain the standard of judgment.",
    },
    {
      planId: sanctuaryPlan.id, dayNumber: 7,
      title: "Come Boldly to the Throne of Grace",
      bookId: BOOK_IDS.Hebrews, chapter: 4, verseStart: 14, verseEnd: 16,
      passageLabel: "Hebrews 4:14–16; 10:19–22",
      contextNote: "Because we have a great High Priest who has passed through the heavens — Jesus, the Son of God — we can come boldly to the throne of grace. The sanctuary is not a fearful place but a place of access, mercy, and help.",
      reflectionQuestions: [
        "How does knowing that Jesus was 'tempted in all points like as we are' affect your confidence in approaching God?",
        "What does it mean to 'come boldly' — not presumptuously but confidently?",
        "How has this week's study of the sanctuary changed your understanding of what Christ is doing for you?"
      ],
      prayerPrompt: "Great High Priest, I come boldly to Your throne — not because of my worthiness but because of Yours. Thank You for mercy in my failures and grace to help in every time of need.",
      thenContext: "The book of Hebrews was written to believers tempted to give up. The sanctuary message is meant to encourage: your High Priest understands, intercedes, and will never abandon you.",
      nowApplication: "The sanctuary is not a doctrine to argue about but a reality to live in. Every prayer you offer reaches a real High Priest in a real sanctuary who really cares.",
    },
  ]);
  console.log("  Created: The Heavenly Sanctuary (7 days)");
  }

  // ==================== PLAN 5: THE STATE OF THE DEAD & RESURRECTION HOPE ====================
  if (existingPlans.has("Death, Sleep, and Resurrection")) { console.log('  Plan "Death, Sleep, and Resurrection" already exists, skipping.'); } else {
  const [deathPlan] = await db.insert(devotionalPlans).values({
    title: "Death, Sleep, and Resurrection",
    description: "What happens when we die? Does the soul live on? What does the Bible actually teach? This plan examines what Scripture says about death as a sleep, the hope of the resurrection, and the danger of spiritualism — offering comfort, clarity, and solid biblical ground.",
    totalDays: 6,
    estimatedMinutesPerDay: 13,
    isPublished: false,
    provenance: "legacy_unclassified",
  }).returning();

  await db.insert(devotionalDays).values([
    {
      planId: deathPlan.id, dayNumber: 1,
      title: "Dust to Dust — The Nature of Humanity",
      bookId: BOOK_IDS.Genesis, chapter: 2, verseStart: 7, verseEnd: 7,
      passageLabel: "Genesis 2:7; Ecclesiastes 12:7",
      contextNote: "God formed man from the dust of the ground and breathed into him the breath of life, and man 'became a living soul.' The soul is not something we have — it is what we are: body + breath = living being.",
      reflectionQuestions: [
        "How does Genesis 2:7 define a 'soul' differently from popular culture?",
        "If the soul is not a separate entity that leaves the body, how does this change your view of death?",
        "Why is it important to let the Bible define its own terms rather than importing Greek philosophy?"
      ],
      prayerPrompt: "Creator God, You made me from dust and breathed life into me. I am wholly Yours — body and breath. Help me understand death and life as You have revealed them in Your Word.",
      thenContext: "The Hebrew word 'nephesh' (soul) means 'living being' — it is used of animals too (Genesis 1:21, 24). The concept of an immortal soul separate from the body comes from Greek philosophy, not Scripture.",
      nowApplication: "Understanding that humans are a holistic unity (not a body housing a detachable soul) is the foundation for understanding what happens at death.",
    },
    {
      planId: deathPlan.id, dayNumber: 2,
      title: "Death Is a Sleep",
      bookId: BOOK_IDS.John, chapter: 11, verseStart: 11, verseEnd: 14,
      passageLabel: "John 11:11–14; Psalm 115:17; Ecclesiastes 9:5–6",
      contextNote: "Jesus called death a 'sleep' — not to minimise it, but to define it. The dead know nothing, their love and hatred have perished, and they do not praise the Lord. Death is an unconscious rest until the resurrection.",
      reflectionQuestions: [
        "Why did Jesus use the metaphor of 'sleep' for death?",
        "What comfort does the sleep metaphor offer compared to the idea of conscious suffering after death?",
        "How does Ecclesiastes 9:5 ('the dead know not anything') settle the question of consciousness after death?"
      ],
      prayerPrompt: "Lord Jesus, You are the resurrection and the life. I trust that those who sleep in You are safe in Your keeping, awaiting the morning of resurrection.",
      thenContext: "The Old Testament consistently describes death as sleep (Daniel 12:2, Psalm 13:3, Job 14:12). Jesus affirmed this teaching and demonstrated His power over it by raising Lazarus.",
      nowApplication: "The sleep of death means our loved ones are not suffering or watching from heaven — they rest peacefully until Jesus calls them forth. This is a comforting truth.",
    },
    {
      planId: deathPlan.id, dayNumber: 3,
      title: "The Wages of Sin Is Death — Not Eternal Torment",
      bookId: BOOK_IDS.Romans, chapter: 6, verseStart: 23, verseEnd: 23,
      passageLabel: "Romans 6:23; Malachi 4:1–3; John 3:16",
      contextNote: "The wages of sin is death — not eternal conscious torment. God alone has immortality (1 Timothy 6:16). The wicked will be destroyed, consumed, and be as if they had not been — not tortured forever.",
      reflectionQuestions: [
        "How does the clear statement 'the wages of sin is death' differ from the doctrine of eternal torment?",
        "John 3:16 says believers shall not 'perish' — what does perishing mean if not destruction?",
        "How does understanding God's justice reshape His character in your mind?"
      ],
      prayerPrompt: "Righteous God, Your justice is true and Your mercy is real. Thank You that the end of sin is destruction, not endless torture — and that You offer eternal life to all who believe.",
      thenContext: "The doctrine of eternal conscious torment entered Christianity from Greek philosophy (Plato's immortality of the soul). The Bible teaches conditional immortality — only God possesses it inherently, and He gives it to believers at the resurrection.",
      nowApplication: "God is not a cosmic torturer. His justice means sin and sinners will come to a permanent end. Eternal life is a gift, not an inherent possession — making the gospel truly good news.",
    },
    {
      planId: deathPlan.id, dayNumber: 4,
      title: "The Resurrection Morning",
      bookId: BOOK_IDS["1 Thessalonians"], chapter: 4, verseStart: 13, verseEnd: 18,
      passageLabel: "1 Thessalonians 4:13–18; 1 Corinthians 15:51–55",
      contextNote: "The Christian hope is not the soul going to heaven at death — it is the resurrection at the second coming. The Lord Himself shall descend, the dead in Christ shall rise, and together with the living saints, they shall meet the Lord in the air.",
      reflectionQuestions: [
        "If believers went to heaven immediately at death, why would Paul need to comfort the Thessalonians about the resurrection?",
        "What does 'the dead in Christ shall rise first' tell us about where the dead are now?",
        "How does the resurrection hope change how you grieve?"
      ],
      prayerPrompt: "Lord of the resurrection, I cling to this blessed hope: that You will return, the trumpet will sound, and those who sleep in You will rise to eternal life. Comfort me with this truth.",
      thenContext: "The Thessalonians feared that their deceased loved ones would miss out on Christ's return. Paul's comfort is not 'they are already in heaven' but 'they will rise when He comes.'",
      nowApplication: "The resurrection is the cornerstone of Christian hope. Without it, as Paul says, our faith is vain (1 Corinthians 15:14). With it, death truly has lost its sting.",
    },
    {
      planId: deathPlan.id, dayNumber: 5,
      title: "Beware of Spiritualism",
      bookId: BOOK_IDS.Deuteronomy, chapter: 18, verseStart: 10, verseEnd: 12,
      passageLabel: "Deuteronomy 18:10–12; Isaiah 8:19–20; 1 Samuel 28:7–19",
      contextNote: "God forbids all communication with the dead — not because it works, but because it opens the door to demonic deception. If the dead are truly asleep, then any 'spirit' claiming to be a departed loved one is an impersonation.",
      reflectionQuestions: [
        "Why does God so strongly condemn consulting the dead?",
        "If the dead are unconscious, who or what appears in séances and spiritualistic experiences?",
        "How does the state of the dead protect us from end-time deception?"
      ],
      prayerPrompt: "God of truth, protect me from deception in every form. When the enemy counterfeits the voices of the dead, let me stand on Your Word: 'To the law and to the testimony.'",
      thenContext: "In the end times, Satan will use miracles and apparitions to deceive (Revelation 16:14; 2 Corinthians 11:14). Understanding that the dead are asleep is a powerful shield against this deception.",
      nowApplication: "Spiritualism is not a relic of the past — it permeates modern culture through mediums, near-death experiences, and entertainment. The biblical truth about death is the antidote.",
    },
    {
      planId: deathPlan.id, dayNumber: 6,
      title: "Immortality — A Gift at the Resurrection",
      bookId: BOOK_IDS["1 Corinthians"], chapter: 15, verseStart: 51, verseEnd: 55,
      passageLabel: "1 Corinthians 15:51–55; 1 Timothy 6:15–16",
      contextNote: "Immortality is not something humans naturally possess — it is a gift bestowed at the resurrection. 'This mortal must put on immortality.' Until then, our lives are 'hid with Christ in God' (Colossians 3:3), safe in His keeping.",
      reflectionQuestions: [
        "If humans already had immortal souls, why would Paul say immortality must be 'put on' at the resurrection?",
        "How does knowing that God 'only hath immortality' (1 Timothy 6:16) reshape your theology?",
        "What practical hope does conditional immortality give you for the future?"
      ],
      prayerPrompt: "Immortal God, I do not possess eternal life in myself — it is Your gift. I look forward to the day when this mortal puts on immortality and death is swallowed up in victory.",
      thenContext: "The Greek word 'athanasia' (immortality) appears only here and in 1 Timothy 6:16 in the New Testament. It is never attributed to the human soul — only to God and to the resurrected saints.",
      nowApplication: "Death is not the doorway to eternity — the resurrection is. This shifts our focus from death to the second coming, where the gift of eternal life is bestowed by the Life-giver Himself.",
    },
  ]);
  console.log("  Created: Death, Sleep, and Resurrection (6 days)");
  }

  console.log("\nSDA devotional plan seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
