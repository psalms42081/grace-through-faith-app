import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { applicationTemplates } from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const APPLICATION_TEMPLATES = [
  {
    bookId: 1, chapter: 1, keyTheme: "Creation & Purpose",
    thenContext: "Genesis 1 was written to an ancient Israelite audience surrounded by polytheistic cultures. The creation account declared that one sovereign God — not a pantheon of competing deities — made everything with intention and order. Humanity was given the unique dignity of being made in God's image, tasked with stewardship over creation.",
    nowApplication: "In a world that often reduces human beings to economic units or biological accidents, Genesis 1 affirms that every person carries inherent dignity and purpose. Our work, creativity, and care for the environment flow from this original mandate. We are not random — we are designed and commissioned.",
    reflectionQuestions: [
      "What does it mean for my daily life that I am made in God's image?",
      "How does the creation mandate to 'have dominion' shape my responsibility toward the environment and others?",
      "Where in my life do I see the goodness of God's created order?",
      "How can I bring order and beauty into the chaos around me this week?"
    ],
    prayerPrompt: "Lord, thank You that I am fearfully and wonderfully made in Your image. Help me to see the dignity in every person I encounter today. Give me wisdom to steward well the responsibilities You have entrusted to me. Let my work reflect Your creative purpose.",
  },
  {
    bookId: 19, chapter: 23, keyTheme: "Divine Provision & Trust",
    thenContext: "David, a shepherd-king who knew both green pastures and deadly valleys, wrote this psalm from personal experience. In ancient Israel, shepherds were responsible for every aspect of their flock's welfare — guiding, feeding, protecting, and even carrying the weak. David applied this intimate knowledge to describe God's care for His people.",
    nowApplication: "In seasons of anxiety, uncertainty, and loss, Psalm 23 reminds us that God's provision is not passive but actively personal. He leads, restores, comforts, and prepares abundance even in the presence of opposition. This is not a promise of a trouble-free life, but of a never-alone life.",
    reflectionQuestions: [
      "In what area of my life do I need to trust that the Lord is my shepherd right now?",
      "What 'valley of the shadow of death' am I walking through, and how can I sense God's presence there?",
      "How has God 'prepared a table' for me even in difficult circumstances?",
      "What would it look like to truly 'fear no evil' in my current situation?"
    ],
    prayerPrompt: "Father, You are my shepherd and I lack nothing in You. Restore my soul today. Lead me beside still waters when the noise of life overwhelms me. Even in the darkest valleys, I choose to trust Your rod and staff. Let Your goodness and mercy follow me all the days of my life.",
  },
  {
    bookId: 23, chapter: 53, keyTheme: "Suffering Servant & Redemption",
    thenContext: "Written roughly 700 years before Christ, Isaiah 53 describes a mysterious 'Suffering Servant' who would bear the sins of the people. The original audience — Israelites facing judgment and exile — expected a conquering Messiah. Instead, Isaiah revealed one who would conquer through suffering, rejection, and sacrificial death.",
    nowApplication: "Isaiah 53 confronts our natural desire for a God who fixes everything without cost. True redemption required the deepest sacrifice. This chapter invites us to reckon with the weight of grace — it was not cheap. Our healing came through His wounds, our peace through His punishment.",
    reflectionQuestions: [
      "How does understanding the cost of grace change the way I live today?",
      "In what ways do I take for granted the sacrifice described in this passage?",
      "How does Jesus as the Suffering Servant challenge my expectations of what strength looks like?",
      "Where am I called to embrace redemptive suffering for the sake of others?"
    ],
    prayerPrompt: "Jesus, by Your stripes I am healed. Help me never to treat Your sacrifice lightly. Let the reality of what You endured transform my gratitude, my worship, and my willingness to lay down my own comfort for others. You were despised and rejected so that I could be accepted and loved.",
  },
  {
    bookId: 43, chapter: 1, keyTheme: "The Incarnation & Light",
    thenContext: "John wrote his Gospel to a mixed audience of Jews and Greeks, both of whom had concepts of 'the Word' (Logos). For Jews, God's word was His creative and revelatory power. For Greeks, Logos was the rational principle ordering the universe. John declared that this Logos was not an abstract force but a Person — one who 'became flesh and dwelt among us.'",
    nowApplication: "In a culture that separates the spiritual from the physical, John 1 insists that God entered the material world fully. The incarnation means God is not distant or detached. He moved into the neighborhood. This transforms how we view our bodies, our work, and our everyday lives — all of it is the arena where God dwells.",
    reflectionQuestions: [
      "What does it mean that the Word 'became flesh' — that God chose to enter my world physically?",
      "How does the metaphor of light versus darkness apply to my current circumstances?",
      "In what ways can I 'receive' Christ more fully in my daily routine?",
      "How does the incarnation change the way I view ordinary, physical life?"
    ],
    prayerPrompt: "Lord Jesus, You are the Word made flesh. Thank You for not remaining distant but entering into the mess and beauty of human life. Shine Your light into the dark corners of my heart. Help me to receive You fully and to reflect Your glory to those around me.",
  },
  {
    bookId: 43, chapter: 3, keyTheme: "New Birth & God's Love",
    thenContext: "Nicodemus, a Pharisee and member of the Jewish ruling council, came to Jesus at night — likely to avoid public scrutiny. Jesus' teaching about being 'born again' would have shocked this learned teacher. In Jewish thought, conversion was for Gentiles, not for those already within the covenant community. Jesus declared that everyone, regardless of religious pedigree, needs spiritual rebirth.",
    nowApplication: "John 3 challenges both religious complacency and spiritual despair. No amount of religious knowledge substitutes for personal transformation by the Spirit. And no depth of failure puts anyone beyond the reach of God's love. 'For God so loved the world' remains the most revolutionary sentence ever written — a love without ethnic, social, or moral boundaries.",
    reflectionQuestions: [
      "Have I confused religious activity with genuine spiritual life?",
      "What does being 'born again' mean for me practically — not just as a past event but as an ongoing reality?",
      "How does the scope of 'God so loved the world' challenge my assumptions about who deserves grace?",
      "Where is the Spirit blowing in my life right now, even if I cannot fully understand it?"
    ],
    prayerPrompt: "Father, Your love for the world is beyond my comprehension. Help me to be born again daily — to live not by religious routine but by the power of Your Spirit. Open my eyes like Nicodemus to see what I have been missing. Let Your love flow through me to those I would otherwise overlook.",
  },
  {
    bookId: 45, chapter: 8, keyTheme: "Freedom & Assurance in Christ",
    thenContext: "Paul wrote to the church in Rome — a community of Jewish and Gentile believers navigating deep theological tensions. Romans 8 serves as the climactic declaration of the letter: those who are in Christ are free from condemnation, empowered by the Spirit, and held secure by a love that nothing in all creation can sever. This was radical for a community that felt the weight of the law's demands.",
    nowApplication: "Romans 8 speaks directly to guilt, fear, and insecurity. In a world that constantly evaluates, condemns, and discards, Paul declares that there is 'no condemnation' for those in Christ. The Spirit does not merely help us try harder — He gives us a new identity as children of God. And nothing — not suffering, not failure, not death itself — can separate us from divine love.",
    reflectionQuestions: [
      "Where in my life am I still living under condemnation rather than in the freedom Christ offers?",
      "How does the promise that 'all things work together for good' challenge me when circumstances seem hopeless?",
      "What would change in my daily outlook if I truly believed nothing can separate me from God's love?",
      "How is the Holy Spirit interceding for me in my current struggles?"
    ],
    prayerPrompt: "Abba, Father — I am Your child. Thank You that there is no condemnation for me in Christ Jesus. When guilt and shame threaten to define me, remind me that Your Spirit bears witness with my spirit. Nothing in all creation can separate me from Your love. Help me to live in this freedom today.",
  },
  {
    bookId: 66, chapter: 21, keyTheme: "New Creation & Restoration",
    thenContext: "John received this vision while exiled on the island of Patmos, writing to persecuted churches across Asia Minor. Revelation 21 paints the ultimate picture of hope: a new heaven and new earth where God dwells directly with His people. The imagery draws heavily on Old Testament promises — the new Jerusalem, the wiping away of tears, the end of death — bringing the entire biblical narrative to its climax.",
    nowApplication: "Revelation 21 reframes all present suffering as temporary. God's plan is not to abandon creation but to renew it. The vision of 'no more tears, no more death, no more pain' is not escapism — it is the ultimate realism, the destination toward which all of history moves. This hope transforms how we endure hardship and pursue justice now.",
    reflectionQuestions: [
      "How does the promise of a renewed creation affect the way I handle present suffering?",
      "What does it mean that God will 'dwell with' His people — not at a distance but intimately present?",
      "In what ways can I participate now in the work of making 'all things new'?",
      "How does this vision of the future shape my priorities and values today?"
    ],
    prayerPrompt: "God of all hope, You are making all things new. When the brokenness of this world weighs on me, lift my eyes to the city You are preparing. Wipe away my tears and strengthen me to be an agent of Your renewal even now. I long for the day when You dwell fully with Your people and every sorrow is no more.",
  },
  {
    bookId: 27, chapter: 8, keyTheme: "Prophetic Vision & Sovereignty",
    thenContext: "Daniel received this vision during the reign of Belshazzar of Babylon (c. 550 BC). The ram and goat symbolized the Medo-Persian and Greek empires respectively, with the 'little horn' pointing to Antiochus IV Epiphanes, who would desecrate the temple. Daniel was shown that earthly powers rise and fall, but God's sovereign plan unfolds with precision across centuries.",
    nowApplication: "Daniel 8 reminds us that God is not surprised by political upheaval, the rise of tyrants, or the persecution of the faithful. History is not random — it is moving toward God's appointed end. When we face overwhelming cultural and political forces, we can trust that the same God who foretold empires centuries in advance is sovereign over our present moment.",
    reflectionQuestions: [
      "How does God's sovereignty over nations and empires comfort me in uncertain political times?",
      "Where do I see 'little horns' — arrogant powers that oppose God — in the world today, and how should I respond?",
      "What does Daniel's response of being 'overcome and sick for days' teach me about honest engagement with difficult truths?",
      "How can I hold prophetic hope and present faithfulness together?"
    ],
    prayerPrompt: "Sovereign Lord, You hold the rise and fall of empires in Your hand. When I am overwhelmed by the powers of this age, remind me that You have already declared the end from the beginning. Give me the courage of Daniel — to remain faithful even when the vision is troubling and the future seems dark. You are the Ancient of Days.",
  },
  {
    bookId: 1, chapter: 12, keyTheme: "Call & Covenant Promise",
    thenContext: "God called Abram out of Ur of the Chaldeans — a prosperous, idolatrous city in Mesopotamia. This was not a minor relocation but a complete break from family, culture, and security. God's promise to make Abram a great nation and to bless all families of the earth through him established the covenant that shapes the rest of Scripture.",
    nowApplication: "Genesis 12 speaks to every believer who has heard God's call to leave the comfortable and familiar. Following God often means stepping into uncertainty with nothing but a promise. Abram's journey reminds us that faith is not a feeling — it is a decision to go when God says go, even before we see the destination.",
    reflectionQuestions: [
      "What is God asking me to leave behind in order to follow Him more fully?",
      "How do I respond when God's promises seem too big for my circumstances?",
      "In what ways am I clinging to comfort or familiarity instead of trusting God's call?",
      "How does God's promise to 'bless all families of the earth' shape my understanding of my own purpose?"
    ],
    prayerPrompt: "Lord, like Abram, I want to follow where You lead — even when I cannot see the destination. Give me faith to leave behind what is comfortable and step into the promises You have spoken over my life. Use me to be a blessing to others, just as You promised to bless all nations through Abraham's seed.",
  },
  {
    bookId: 2, chapter: 14, keyTheme: "Deliverance & Faith",
    thenContext: "The Israelites stood trapped between Pharaoh's advancing army and the Red Sea. After 400 years of slavery and ten devastating plagues, this was the ultimate test of faith. God's command through Moses — 'Stand still and see the salvation of the Lord' — defined a new paradigm: deliverance would come not through human effort but through divine intervention.",
    nowApplication: "Exodus 14 speaks to every impossible situation we face. When we are hemmed in on all sides, God specializes in making a way where there is none. The key is the posture Moses commanded: stand still, stop striving, and watch God work. This is not passivity — it is active trust in a God who fights for His people.",
    reflectionQuestions: [
      "What 'Red Sea' am I facing right now — a situation that seems impossible from every angle?",
      "How do I practically 'stand still and see the salvation of the Lord' when everything in me wants to panic?",
      "What past deliverances can I recall to strengthen my faith for current challenges?",
      "How does this passage reshape my understanding of what it means to 'fight' my battles?"
    ],
    prayerPrompt: "God of deliverance, You parted the sea for Your people and You can make a way for me. When I am trapped and terrified, teach me to stand still and trust. You have not brought me this far to abandon me. Fight for me, Lord, and let me see Your salvation.",
  },
  {
    bookId: 40, chapter: 5, keyTheme: "Kingdom Ethics & Blessedness",
    thenContext: "Jesus delivered the Sermon on the Mount to His disciples and the gathered crowds on a hillside in Galilee. The Beatitudes turned conventional wisdom upside down: the poor in spirit, the meek, the persecuted — these are the ones God calls blessed. In a world dominated by Roman power and religious legalism, Jesus announced a radically different kingdom with radically different values.",
    nowApplication: "The Beatitudes challenge our cultural definitions of success, power, and happiness. In a society that celebrates self-promotion, Jesus blesses humility. Where culture rewards aggression, Jesus honors the peacemakers. The Sermon on the Mount is not merely aspirational ethics — it is the constitution of God's kingdom, describing the character of those who belong to it.",
    reflectionQuestions: [
      "Which beatitude challenges me the most, and why?",
      "How does Jesus' definition of 'blessed' differ from what my culture tells me will make me happy?",
      "In what practical ways can I be a peacemaker in my relationships this week?",
      "Where am I relying on my own righteousness rather than hungering and thirsting for God's?"
    ],
    prayerPrompt: "Jesus, Your kingdom turns the world's values upside down. Make me poor in spirit — aware of my need for You. Give me a hunger and thirst for righteousness that no earthly satisfaction can quench. Help me to be a peacemaker, to show mercy, and to rejoice even when the world opposes Your ways.",
  },
  {
    bookId: 46, chapter: 13, keyTheme: "The Nature of Love",
    thenContext: "Paul wrote to the church in Corinth, a community fractured by divisions, spiritual pride, and the misuse of spiritual gifts. In this context, the 'love chapter' was not a wedding reading — it was a rebuke. The Corinthians valued flashy gifts over sacrificial love. Paul declared that without love, even the most impressive spiritual accomplishments amount to nothing.",
    nowApplication: "1 Corinthians 13 defines love not as a feeling but as a series of actions and choices. Love is patient when patience is exhausting. Love is kind when kindness is inconvenient. Love does not keep a record of wrongs when forgiveness feels impossible. This chapter calls us to measure our relationships not by what we feel but by how we act.",
    reflectionQuestions: [
      "If I replace the word 'love' with my name in verses 4-7, where do I fall short?",
      "Which quality of love — patience, kindness, humility, endurance — do I most need to cultivate right now?",
      "How does Paul's context (a divided church) change the way I read this passage?",
      "What would it look like to 'put away childish things' in my approach to relationships?"
    ],
    prayerPrompt: "Lord, teach me to love as You love — patiently, kindly, without envy or pride. Forgive me for the times I have kept score instead of extending grace. Let Your love be the measure of all I do, not my gifts or accomplishments. Help me to bear all things, believe all things, hope all things, and endure all things in love.",
  },
];

async function seed() {
  console.log("Seeding application templates...");

  for (const template of APPLICATION_TEMPLATES) {
    await db
      .insert(applicationTemplates)
      .values(template)
      .onConflictDoNothing();
  }

  console.log(`Seeded ${APPLICATION_TEMPLATES.length} application templates.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
