import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import {
  devotionalPlans,
  devotionalDays,
  locations,
  timelineEvents,
  commentators,
} from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

interface DayData {
  dayNumber: number;
  title: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  passageLabel: string;
  contextNote: string;
  keyTermStrongId: string | null;
  locationName: string | null;
  timelineEventTitle: string | null;
  commentatorId: string | null;
  historicVoiceExcerpt: string | null;
  reflectionQuestions: string[];
  prayerPrompt: string;
  thenContext: string;
  nowApplication: string;
}

interface PlanData {
  title: string;
  description: string;
  totalDays: number;
  theme: string;
  targetGoals: string[];
  difficultyLevel: string;
  estimatedMinutesPerDay: number;
  isPublished: boolean;
  days: DayData[];
}

const PLANS: PlanData[] = [
  {
    title: "Women of the Bible",
    description:
      "Meet seven remarkable women whose faith, courage, and obedience shaped the course of redemptive history. From Ruth's loyalty to Esther's bravery to Mary's surrender, each day reveals how God works powerfully through those the world often overlooks.",
    totalDays: 7,
    theme: "Character Studies",
    targetGoals: [
      "Learn from the faith and courage of biblical women",
      "See God's redemptive work through unexpected people",
      "Apply lessons of loyalty, courage, and trust to daily life",
    ],
    difficultyLevel: "intermediate",
    estimatedMinutesPerDay: 15,
    isPublished: true,
    days: [
      {
        dayNumber: 1,
        title: "Sarah — Laughter from the Impossible",
        bookId: 1,
        chapter: 18,
        verseStart: 1,
        verseEnd: 15,
        passageLabel: "Genesis 18:1-15",
        contextNote:
          "Three visitors arrive at Abraham's tent and announce that Sarah, at age 90, will bear a son. Sarah laughs in disbelief. Yet God's promise was fulfilled, and she named her son Isaac — 'laughter.' Her story is a testimony that nothing is too hard for the Lord.",
        keyTermStrongId: "H1285",
        locationName: null,
        timelineEventTitle: "Call of Abraham",
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Is anything too hard for the Lord? Sarah's laughter was rebuked, but her joy was fulfilled — for God delights to do the impossible.",
        reflectionQuestions: [
          "Where in your life have you laughed at a promise that seemed too good to be true?",
          "How does Sarah's story challenge your understanding of God's timing?",
          "What impossible situation do you need to surrender to God today?",
          "How does barrenness turned to fruitfulness speak to seasons of waiting?",
        ],
        prayerPrompt:
          "Lord, nothing is too hard for You. Where I have laughed in disbelief, replace my doubt with trust. Help me to wait on Your timing, knowing that You fulfill every promise — even the ones that seem impossible.",
        thenContext:
          "In the ancient Near East, a woman's identity and social standing were tied to childbearing. Sarah's decades of barrenness were not just personal grief but public shame. God's promise overturned both her sorrow and societal expectations.",
        nowApplication:
          "Sarah's story reminds us that God specializes in the impossible. When our dreams seem dead and our waiting unbearable, He is still at work. The laughter of doubt can become the laughter of joy when God fulfills His word.",
      },
      {
        dayNumber: 2,
        title: "Rahab — Faith in the Unlikeliest Place",
        bookId: 6,
        chapter: 2,
        verseStart: 1,
        verseEnd: 21,
        passageLabel: "Joshua 2:1-21",
        contextNote:
          "Rahab, a Canaanite prostitute in Jericho, hides the Israelite spies and declares her faith in the God of Israel. Her courageous act saved her family, and she was grafted into the lineage of King David — and ultimately Jesus Christ.",
        keyTermStrongId: "H2617",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "By faith the harlot Rahab perished not — her past did not define her future, for she believed and acted upon the God of Israel.",
        reflectionQuestions: [
          "What does Rahab's inclusion in Jesus' genealogy tell you about God's grace?",
          "How does her story challenge assumptions about who God can use?",
          "What risks has faith required you to take?",
          "How does Rahab's declaration of faith compare to the Israelites' own wavering?",
        ],
        prayerPrompt:
          "God of grace, You used Rahab — an outsider and outcast — and placed her in the lineage of Your Son. No past is too broken for Your redemption. Use me, despite my failures, for Your purpose.",
        thenContext:
          "Jericho was a fortified Canaanite city standing between Israel and the Promised Land. Rahab's profession placed her on the margins of society. Yet her faith — expressed in action — exceeded that of many within Israel itself.",
        nowApplication:
          "Rahab's story demolishes every excuse we make about being disqualified by our past. God does not wait for perfection before extending grace. He meets people where they are and transforms them by faith.",
      },
      {
        dayNumber: 3,
        title: "Ruth — Loyalty Beyond Borders",
        bookId: 8,
        chapter: 1,
        verseStart: 1,
        verseEnd: 22,
        passageLabel: "Ruth 1:1-22",
        contextNote:
          "After losing her husband, Ruth the Moabitess chooses to leave her homeland and follow her mother-in-law Naomi back to Bethlehem. Her famous declaration — 'Where you go, I will go' — is one of the most powerful statements of loyalty in all of Scripture.",
        keyTermStrongId: "H2617",
        locationName: "Bethlehem",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Ruth's resolution was as firm as it was affectionate. She would not be persuaded to go back, for she had fixed her heart on the God of Israel.",
        reflectionQuestions: [
          "What does Ruth's decision to follow Naomi reveal about sacrificial love?",
          "How does loyalty to people sometimes require leaving comfort behind?",
          "Where is God calling you to faithful commitment even when the future is uncertain?",
          "How does Ruth's story foreshadow the inclusion of Gentiles in God's family?",
        ],
        prayerPrompt:
          "Lord, give me the loyalty of Ruth — a heart that clings to what is right even when the road ahead is uncertain. May my commitments reflect Your steadfast love.",
        thenContext:
          "Moabites were historically enemies of Israel. For Ruth to leave Moab and pledge herself to Naomi's God was extraordinary. She entered Bethlehem as a widow, a foreigner, and a gleaner — the lowest social position. Yet God elevated her to the lineage of David.",
        nowApplication:
          "Ruth teaches that faithfulness in small, unglamorous acts of love can have eternal significance. Her story encourages us to stay committed to people and to God even when the outcome is invisible.",
      },
      {
        dayNumber: 4,
        title: "Hannah — Prayer from the Depths",
        bookId: 9,
        chapter: 1,
        verseStart: 1,
        verseEnd: 28,
        passageLabel: "1 Samuel 1:1-28",
        contextNote:
          "Hannah, barren and taunted by her rival Peninnah, pours out her anguish before God at the tabernacle. God hears her desperate prayer and grants her a son, Samuel, whom she dedicates back to God's service. Her prayer becomes a model of honest, passionate faith.",
        keyTermStrongId: "H8085",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "adam-clarke",
        historicVoiceExcerpt:
          "Hannah poured out her soul before the Lord — not with eloquent words, but with the raw honesty of a heart that refused to let go of God.",
        reflectionQuestions: [
          "What does Hannah's prayer teach you about bringing raw emotion before God?",
          "How does her willingness to give Samuel back to God challenge your hold on blessings?",
          "When have you been misunderstood in your worship, as Eli misunderstood Hannah?",
          "What promise have you made to God that you need to honor?",
        ],
        prayerPrompt:
          "Lord, like Hannah, I pour out my soul before You — holding nothing back. Hear my cry, and in Your mercy answer. And when You do, help me to give back to You with the same generosity with which You give to me.",
        thenContext:
          "In a culture where barrenness was seen as divine disfavor, Hannah's suffering was intensified by social stigma and personal mockery. Her prayer at Shiloh was so fervent that the priest Eli mistook her for a drunkard. Yet God honored her raw, honest faith.",
        nowApplication:
          "Hannah's story invites us to pray with radical honesty. God is not offended by our tears, our anger, or our desperation. He honors prayers that come from the depths — and He answers in ways that reshape history.",
      },
      {
        dayNumber: 5,
        title: "Esther — Courage for Such a Time",
        bookId: 17,
        chapter: 4,
        verseStart: 1,
        verseEnd: 17,
        passageLabel: "Esther 4:1-17",
        contextNote:
          "When Haman plots to destroy all the Jews in Persia, Mordecai challenges Esther to use her position as queen to intercede. Esther agrees to risk her life, saying, 'If I perish, I perish.' Her courage saved an entire nation from annihilation.",
        keyTermStrongId: null,
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Who knows whether you have come to the kingdom for such a time as this? Providence places us where courage is required.",
        reflectionQuestions: [
          "What position or influence has God given you 'for such a time as this'?",
          "When has God called you to act courageously despite personal risk?",
          "How does Esther's call for fasting before action challenge your decision-making?",
          "What does Mordecai's confidence in divine providence teach about God's sovereignty?",
        ],
        prayerPrompt:
          "Lord, You have placed me where I am for a reason. Give me the courage of Esther to speak and act when it matters most — even at personal cost. I trust that You are working behind the scenes.",
        thenContext:
          "Persian law made it punishable by death to approach the king uninvited. Esther had not been summoned in thirty days. Her decision was not merely bold — it was potentially fatal. Yet she chose obedience to God over self-preservation.",
        nowApplication:
          "Esther's story reminds us that our positions, talents, and opportunities are not accidents. God places us strategically. The question is whether we will use our influence for His purposes, even when it costs us.",
      },
      {
        dayNumber: 6,
        title: "Mary of Nazareth — The Willing Handmaid",
        bookId: 42,
        chapter: 1,
        verseStart: 26,
        verseEnd: 56,
        passageLabel: "Luke 1:26-56",
        contextNote:
          "The angel Gabriel announces to Mary that she will conceive the Son of God by the Holy Spirit. Mary's response — 'Behold the handmaid of the Lord; be it unto me according to thy word' — is one of the greatest acts of surrender in Scripture. Her song, the Magnificat, celebrates God's reversal of the world's values.",
        keyTermStrongId: "G5485",
        locationName: "Bethlehem",
        timelineEventTitle: "Birth of Jesus Christ",
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "Mary did not fully understand, yet she believed. Her submission was not passive ignorance but active faith in the God who does great things.",
        reflectionQuestions: [
          "What does Mary's immediate surrender teach about responding to God's call?",
          "How does the Magnificat reshape your understanding of power and humility?",
          "Where is God asking you to say 'yes' before you fully understand?",
          "How does Mary's example challenge the cultural value of control?",
        ],
        prayerPrompt:
          "Lord, like Mary, I say: be it unto me according to Your word. Where I do not understand Your plan, I choose to trust Your character. Use me for Your glory, however humble the path.",
        thenContext:
          "Mary was a young Jewish woman in Nazareth — an obscure village with no significance. She was betrothed but not yet married. The angel's announcement would bring social scandal, personal danger, and a life of sorrow alongside unmatched blessing.",
        nowApplication:
          "Mary's surrender is the model for every believer's response to God: trust without full understanding, obedience before certainty, and worship in the midst of mystery. Her Magnificat teaches that God lifts the humble and fills the hungry.",
      },
      {
        dayNumber: 7,
        title: "Mary Magdalene — First Witness of the Resurrection",
        bookId: 43,
        chapter: 20,
        verseStart: 1,
        verseEnd: 18,
        passageLabel: "John 20:1-18",
        contextNote:
          "Mary Magdalene comes to the tomb while it is still dark and finds it empty. Weeping, she encounters the risen Jesus, who calls her by name. She becomes the first person commissioned to proclaim the resurrection — the apostle to the apostles.",
        keyTermStrongId: "G386",
        locationName: "Jerusalem",
        timelineEventTitle: "Resurrection of Jesus",
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Jesus called her by name, and immediately she knew Him. Love recognizes the voice of the Beloved, even through tears.",
        reflectionQuestions: [
          "Why did Jesus choose Mary Magdalene as the first witness of the resurrection?",
          "What does it mean that Jesus called her by name in her moment of deepest grief?",
          "How does this encounter challenge cultural dismissal of women's testimony?",
          "Where do you need to hear Jesus calling your name today?",
        ],
        prayerPrompt:
          "Risen Lord, You called Mary by name and turned her grief into the greatest proclamation in history. Call my name today. Let me hear Your voice through my tears and be transformed by Your resurrection power.",
        thenContext:
          "In first-century Judaism, a woman's testimony was not accepted in court. That Jesus chose a woman — and one previously afflicted by seven demons — as the first witness of the resurrection was a deliberate, radical reversal of cultural norms.",
        nowApplication:
          "Mary Magdalene's commissioning reveals God's pattern: He gives the most important message to those the world deems least qualified. The resurrection is good news for every outsider, every broken person, every underestimated voice.",
      },
    ],
  },
  {
    title: "Prophets and Prophecy",
    description:
      "Explore the voices of God's prophets — men who spoke truth to power, warned of judgment, and promised restoration. Each day examines a key prophetic text, its original context, and its fulfillment, revealing how God's word proves faithful across centuries.",
    totalDays: 7,
    theme: "Prophecy & Fulfillment",
    targetGoals: [
      "Understand the role of prophets in biblical history",
      "Trace prophecy from declaration to fulfillment",
      "Apply prophetic calls to justice and faithfulness today",
    ],
    difficultyLevel: "intermediate",
    estimatedMinutesPerDay: 15,
    isPublished: true,
    days: [
      {
        dayNumber: 1,
        title: "Moses — The Prophet Like No Other",
        bookId: 5,
        chapter: 18,
        verseStart: 15,
        verseEnd: 22,
        passageLabel: "Deuteronomy 18:15-22",
        contextNote:
          "Moses declares that God will raise up a Prophet like himself from among the people. This prophecy points ultimately to Jesus Christ, the greater Moses who would speak God's words with final authority and lead His people to true freedom.",
        keyTermStrongId: "H1696",
        locationName: "Mount Sinai",
        timelineEventTitle: "Giving of the Law at Sinai",
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "The Lord will raise up a Prophet — not merely a teacher, but one who speaks with the very authority of God, as Moses did face to face.",
        reflectionQuestions: [
          "How does Jesus fulfill the role of 'a prophet like Moses'?",
          "What does it mean that God puts His words in the prophet's mouth?",
          "How do you discern true prophetic voices from false ones today?",
          "What characteristics of Moses' leadership do you see fulfilled in Jesus?",
        ],
        prayerPrompt:
          "Lord, You promised a Prophet who would speak Your words with authority. Thank You that Jesus is that Prophet — the Word made flesh. Help me to listen to His voice above all others.",
        thenContext:
          "As Israel prepared to enter the Promised Land, Moses reminded them that they would need ongoing divine guidance. The surrounding nations consulted sorcerers and diviners; Israel was to listen to God's appointed prophets instead.",
        nowApplication:
          "This passage establishes the prophetic office and points to Christ as the ultimate Prophet. In a world of competing voices and false authorities, we are called to measure everything against God's revealed Word.",
      },
      {
        dayNumber: 2,
        title: "Elijah — Showdown on Mount Carmel",
        bookId: 11,
        chapter: 18,
        verseStart: 20,
        verseEnd: 40,
        passageLabel: "1 Kings 18:20-40",
        contextNote:
          "Elijah challenges 450 prophets of Baal to a contest on Mount Carmel. When Baal fails and God answers with fire from heaven, the people cry, 'The Lord, He is God!' This dramatic confrontation demonstrates that the God of Israel alone is the living God.",
        keyTermStrongId: "H430",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "adam-clarke",
        historicVoiceExcerpt:
          "The fire of the Lord fell — and consumed not merely the sacrifice but the wood, the stones, the dust, and the water. No power of Baal could rival such a display.",
        reflectionQuestions: [
          "What 'Mount Carmel moments' has God given you — clear demonstrations of His power?",
          "How does Elijah's bold faith challenge your own timidity?",
          "What modern 'Baals' compete for your allegiance and worship?",
          "Why do you think the people wavered between two opinions?",
        ],
        prayerPrompt:
          "God of Elijah, You are the living God who answers with fire. In a world of false gods and divided loyalties, help me to stand boldly for You. Let Your power be displayed so that all may know You alone are Lord.",
        thenContext:
          "Under King Ahab and Queen Jezebel, Israel had descended into Baal worship. Elijah stood virtually alone against an entire corrupt religious system. The drought preceding this event had lasted three years, intensifying the stakes of the confrontation.",
        nowApplication:
          "Elijah's story speaks to every believer who feels outnumbered or alone in their faith. God does not need a majority to display His power. One person standing on truth, backed by the living God, is a majority.",
      },
      {
        dayNumber: 3,
        title: "Isaiah — The Holy God and the Cleansed Prophet",
        bookId: 23,
        chapter: 6,
        verseStart: 1,
        verseEnd: 13,
        passageLabel: "Isaiah 6:1-13",
        contextNote:
          "In the year King Uzziah died, Isaiah sees the Lord high and lifted up. Seraphim cry 'Holy, holy, holy!' Isaiah is undone by his unworthiness, but a coal from the altar cleanses his lips. When God asks, 'Whom shall I send?' Isaiah responds, 'Here am I; send me.'",
        keyTermStrongId: "H430",
        locationName: "Jerusalem",
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "Woe is me! I am undone — the prophet could not behold the holiness of God without recognizing the depth of his own defilement. Yet God cleansed him and commissioned him.",
        reflectionQuestions: [
          "What does the threefold 'Holy' reveal about God's essential nature?",
          "When have you felt 'undone' in the presence of God?",
          "How does God's cleansing precede His commissioning in your life?",
          "What would it mean for you to say 'Here am I; send me' today?",
        ],
        prayerPrompt:
          "Holy, holy, holy Lord — I am undone before You. Cleanse me with the coal from Your altar. And then, send me. Here am I, Lord. Use me wherever You will.",
        thenContext:
          "King Uzziah's death marked the end of an era of relative stability. Isaiah's vision came at a moment of national uncertainty. In the heavenly throne room, he saw a King who would never die and a kingdom that would never end.",
        nowApplication:
          "Isaiah 6 teaches that true calling begins with a vision of God's holiness, which produces humility, which leads to cleansing, which results in mission. We cannot be sent until we have been seen, convicted, and restored.",
      },
      {
        dayNumber: 4,
        title: "Jeremiah — The Weeping Prophet's Call",
        bookId: 24,
        chapter: 1,
        verseStart: 1,
        verseEnd: 19,
        passageLabel: "Jeremiah 1:1-19",
        contextNote:
          "God calls Jeremiah before he is born, appointing him as a prophet to the nations. Jeremiah protests his youth, but God touches his mouth and assures him: 'I am with you to deliver you.' Jeremiah's ministry would be marked by tears, rejection, and unwavering faithfulness.",
        keyTermStrongId: "H3045",
        locationName: "Jerusalem",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Before you were formed in the womb I knew you — God's call does not begin with our qualification but with His sovereign knowledge and purpose.",
        reflectionQuestions: [
          "How does God's knowledge of Jeremiah before birth speak to your own purpose?",
          "What excuses do you make when God calls you to difficult tasks?",
          "How does Jeremiah's faithfulness despite rejection inspire your own perseverance?",
          "What does it mean to be 'a fortified city' against opposition?",
        ],
        prayerPrompt:
          "Lord, You knew me before I was formed. You appointed me for a purpose. When I feel too young, too weak, or too inadequate, remind me that You have put Your words in my mouth and Your strength at my back.",
        thenContext:
          "Jeremiah was called during the reign of Josiah, a rare godly king, but his ministry spanned the final decades before Jerusalem's destruction by Babylon. He preached repentance to a nation that did not want to hear it, and suffered greatly for his obedience.",
        nowApplication:
          "Jeremiah's call reminds us that faithfulness is not measured by results but by obedience. God sometimes calls us to speak truth that people reject. Our role is not to guarantee the outcome but to deliver the message with love and integrity.",
      },
      {
        dayNumber: 5,
        title: "Micah — What the Lord Requires",
        bookId: 33,
        chapter: 6,
        verseStart: 1,
        verseEnd: 8,
        passageLabel: "Micah 6:1-8",
        contextNote:
          "God brings a legal case against His people, asking what He has done to cause them to turn away. The prophet then distills the essence of true religion: 'Do justly, love mercy, and walk humbly with thy God.' This verse has been called the greatest summary of Old Testament ethics.",
        keyTermStrongId: "H4941",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "adam-clarke",
        historicVoiceExcerpt:
          "What doth the Lord require? Not rivers of oil or thousands of rams — but a just life, a merciful heart, and a humble walk with God.",
        reflectionQuestions: [
          "How do you practice justice in your daily decisions?",
          "What does 'loving mercy' look like in your relationships?",
          "Where do you struggle with walking humbly before God?",
          "How does this verse challenge religious performance without heart change?",
        ],
        prayerPrompt:
          "Lord, You have shown me what is good. Help me to do justly in every decision, to love mercy toward every person, and to walk humbly with You in every moment. Strip away my pretense and make my faith real.",
        thenContext:
          "Micah prophesied to a society characterized by injustice, exploitation of the poor, and religious hypocrisy. The wealthy oppressed the vulnerable while maintaining elaborate religious ceremonies. God declared that no amount of ritual could substitute for genuine righteousness.",
        nowApplication:
          "Micah 6:8 remains the antidote to every form of religious hypocrisy. God is not impressed by our activities if our hearts are unjust. True faith expresses itself in how we treat the vulnerable, extend mercy, and walk with humble dependence on God.",
      },
      {
        dayNumber: 6,
        title: "Daniel — Faithful in a Foreign Land",
        bookId: 27,
        chapter: 6,
        verseStart: 1,
        verseEnd: 28,
        passageLabel: "Daniel 6:1-28",
        contextNote:
          "Daniel, now an elderly statesman in the Persian court, refuses to stop praying to God despite a decree that makes it punishable by death. He is thrown into the lions' den, but God shuts the lions' mouths. His faithfulness becomes a testimony to the pagan king.",
        keyTermStrongId: null,
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "Daniel's enemies could find no fault in him except concerning the law of his God — what a testimony to a life lived with integrity.",
        reflectionQuestions: [
          "What does Daniel's consistent prayer life teach about spiritual discipline?",
          "When has your faithfulness to God put you at odds with cultural pressure?",
          "How does Daniel's testimony impact even the pagan king Darius?",
          "What does the lions' den teach about God's protection and sovereignty?",
        ],
        prayerPrompt:
          "God of Daniel, You shut the mouths of lions and vindicated Your servant's faithfulness. Give me the same uncompromising devotion — to pray openly, live with integrity, and trust You with the consequences.",
        thenContext:
          "Daniel had been exiled from Jerusalem as a young man and served faithfully through the Babylonian and Persian empires. By the time of this story, he was elderly. His enemies could find no corruption in him — only his devotion to God.",
        nowApplication:
          "Daniel's story challenges us to maintain our spiritual disciplines and convictions even when the culture pressures us to compromise. Consistency in prayer and integrity of character are more powerful than any political strategy.",
      },
      {
        dayNumber: 7,
        title: "Malachi — The Sun of Righteousness",
        bookId: 39,
        chapter: 4,
        verseStart: 1,
        verseEnd: 6,
        passageLabel: "Malachi 4:1-6",
        contextNote:
          "The final chapter of the Old Testament looks forward to 'the day of the Lord' — a day of both judgment and healing. For those who fear God's name, 'the Sun of righteousness shall arise with healing in his wings.' Malachi closes with the promise of Elijah's return before that great day.",
        keyTermStrongId: "H6666",
        locationName: "Jerusalem",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "The Sun of righteousness — unlike the natural sun, He brings not merely light and warmth, but healing. His rising is the hope of every wounded soul.",
        reflectionQuestions: [
          "How does the image of a 'Sun of righteousness with healing in His wings' speak to you?",
          "What does it mean that the same day brings judgment and healing?",
          "How does the Old Testament's final word — a promise — shape your expectation?",
          "Where do you need the healing rays of Christ's righteousness today?",
        ],
        prayerPrompt:
          "Sun of Righteousness, arise over my life with healing in Your wings. Where there is darkness, bring Your light. Where there is disease of soul, bring Your restoration. I turn my face to You.",
        thenContext:
          "Malachi wrote to a disillusioned post-exilic community. The temple had been rebuilt but the glory seemed diminished. Spiritual apathy and cynicism had set in. God's final Old Testament word was both a warning and a promise — judgment is coming, but so is the Healer.",
        nowApplication:
          "Malachi 4 closes the Old Testament with anticipation. For four hundred silent years, these words echoed until John the Baptist appeared as the promised Elijah. The Sun of Righteousness rose in Bethlehem. And one day, He will return in full and final glory.",
      },
    ],
  },
  {
    title: "Parables of Jesus",
    description:
      "Jesus was the master storyteller. Over five days, explore His most memorable parables — stories that surprised, convicted, and transformed His listeners. Each parable reveals a facet of God's kingdom that challenges how we see the world.",
    totalDays: 5,
    theme: "Kingdom of God",
    targetGoals: [
      "Understand the purpose and power of Jesus' parables",
      "See how parables reveal the nature of God's kingdom",
      "Apply kingdom values to everyday life decisions",
    ],
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 12,
    isPublished: true,
    days: [
      {
        dayNumber: 1,
        title: "The Good Samaritan — Who Is My Neighbor?",
        bookId: 42,
        chapter: 10,
        verseStart: 25,
        verseEnd: 37,
        passageLabel: "Luke 10:25-37",
        contextNote:
          "A lawyer tests Jesus by asking what he must do to inherit eternal life. When Jesus asks him what the law says, the man correctly answers: love God and love your neighbor. But wanting to justify himself, he asks, 'Who is my neighbor?' Jesus responds with this devastating parable.",
        keyTermStrongId: "G26",
        locationName: "Jerusalem",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "The Samaritan showed mercy — not asking whether the wounded man was worthy, but seeing only that he was in need. This is the love Christ requires.",
        reflectionQuestions: [
          "Who are the 'Samaritans' in your world — the people you might be tempted to pass by?",
          "What excuses do you use to avoid helping those in need?",
          "How does this parable redefine what it means to be a neighbor?",
          "What would it cost you to 'go and do likewise' this week?",
        ],
        prayerPrompt:
          "Lord Jesus, You told the story of the Good Samaritan to shatter my excuses. Open my eyes to see the wounded on my path. Give me the compassion to stop, the courage to help, and the generosity to give without counting the cost.",
        thenContext:
          "Samaritans were despised by Jews as racial and religious half-breeds. By making the hero a Samaritan and the villains a priest and Levite, Jesus deliberately subverted His audience's prejudices. The parable was designed to provoke and convict.",
        nowApplication:
          "The Good Samaritan parable asks us not 'Who is my neighbor?' but 'To whom am I being a neighbor?' It destroys every boundary we construct to limit our compassion — racial, social, political, or religious.",
      },
      {
        dayNumber: 2,
        title: "The Prodigal Son — A Father's Reckless Love",
        bookId: 42,
        chapter: 15,
        verseStart: 11,
        verseEnd: 32,
        passageLabel: "Luke 15:11-32",
        contextNote:
          "A younger son demands his inheritance, squanders it in reckless living, and ends up feeding pigs. When he returns home expecting punishment, his father runs to embrace him. But the older son, resentful and self-righteous, refuses to celebrate. Both sons are lost — one in rebellion, the other in religion.",
        keyTermStrongId: "G5485",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "The father ran to him — dignity cast aside, protocol abandoned — for the love of a father exceeds all propriety when a lost child returns.",
        reflectionQuestions: [
          "Do you identify more with the younger son or the older son? Why?",
          "What does the father's running reveal about God's posture toward repentant sinners?",
          "How does the older son's resentment expose a different kind of lostness?",
          "Where do you need to accept the extravagance of God's grace?",
        ],
        prayerPrompt:
          "Father, I have wandered — sometimes in rebellion, sometimes in self-righteousness. You run to meet me in both. Help me to receive Your grace without shame and to extend it to others without resentment.",
        thenContext:
          "In the ancient Near East, for a father to run was a shocking breach of dignity. For a son to demand his inheritance was equivalent to wishing his father dead. Jesus' audience would have expected the father to reject the son. Instead, lavish grace.",
        nowApplication:
          "This parable reveals two ways of being lost: through open sin and through self-righteous religion. Both need the Father's grace. The gospel is not just for the obviously broken but also for the secretly proud.",
      },
      {
        dayNumber: 3,
        title: "The Sower — The Condition of the Heart",
        bookId: 40,
        chapter: 13,
        verseStart: 1,
        verseEnd: 23,
        passageLabel: "Matthew 13:1-23",
        contextNote:
          "Jesus teaches from a boat, describing a sower who scatters seed on four types of soil: the path, rocky ground, thorns, and good soil. He then explains privately that the seed is the word of God and the soils represent the condition of human hearts in receiving it.",
        keyTermStrongId: "G3056",
        locationName: "Sea of Galilee",
        timelineEventTitle: null,
        commentatorId: "adam-clarke",
        historicVoiceExcerpt:
          "The same seed was sown in all soils — the difference lay not in the word preached but in the heart that received it.",
        reflectionQuestions: [
          "Which type of soil best describes your heart right now?",
          "What 'thorns' — worries, wealth, distractions — are choking the word in your life?",
          "How can you cultivate 'good soil' in your daily spiritual practices?",
          "What does it mean that fruitfulness varies even among good soil?",
        ],
        prayerPrompt:
          "Lord, prepare the soil of my heart. Remove the rocks of stubbornness, uproot the thorns of distraction, and soften the hardened paths of indifference. Let Your word take deep root in me and bear fruit — thirty, sixty, a hundredfold.",
        thenContext:
          "First-century Palestinian farmers sowed seed broadly by hand before plowing. The mixed terrain Jesus described — paths, rocks, thorns, and good earth — would have been immediately recognizable to His agricultural audience.",
        nowApplication:
          "The Parable of the Sower shifts responsibility from the message to the listener. The seed is always good. The question is the receptivity of our hearts. Spiritual fruitfulness requires intentional cultivation — removing distractions and deepening roots.",
      },
      {
        dayNumber: 4,
        title: "The Unforgiving Servant — The Debt We Owe",
        bookId: 40,
        chapter: 18,
        verseStart: 21,
        verseEnd: 35,
        passageLabel: "Matthew 18:21-35",
        contextNote:
          "Peter asks Jesus how many times he should forgive — seven times? Jesus replies, seventy times seven. He then tells of a servant forgiven an enormous debt who refuses to forgive a fellow servant a tiny one. The master's response is severe: unforgiveness has devastating consequences.",
        keyTermStrongId: "G5485",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Ten thousand talents — a debt so vast it could never be repaid by human effort. Yet forgiven freely. And the forgiven servant could not forgive a hundred pence.",
        reflectionQuestions: [
          "How does understanding the size of your forgiven debt change your willingness to forgive others?",
          "Who do you find hardest to forgive, and why?",
          "What does this parable teach about the connection between receiving grace and extending it?",
          "How does unforgiveness imprison the one who holds it?",
        ],
        prayerPrompt:
          "Lord, You have forgiven me an unpayable debt. Forgive me for the times I have withheld mercy from others. Free me from the prison of bitterness and teach me to forgive as You have forgiven me.",
        thenContext:
          "Ten thousand talents was an astronomical sum — roughly 200,000 years of a laborer's wages. Jesus deliberately used an absurd number to illustrate the immensity of God's forgiveness. A hundred denarii, by contrast, was a few months' pay.",
        nowApplication:
          "This parable exposes the hypocrisy of accepting God's enormous grace while withholding forgiveness from others. Forgiveness is not optional for the forgiven — it is the evidence that we have truly understood what we have received.",
      },
      {
        dayNumber: 5,
        title: "The Talents — Faithful with What You're Given",
        bookId: 40,
        chapter: 25,
        verseStart: 14,
        verseEnd: 30,
        passageLabel: "Matthew 25:14-30",
        contextNote:
          "A master entrusts his servants with different amounts of money before traveling. Two servants invest and double their master's wealth. The third buries his talent out of fear. Upon the master's return, the faithful are rewarded and the fearful is condemned — not for failing, but for doing nothing.",
        keyTermStrongId: "G4102",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "Well done, good and faithful servant — the commendation was not for the amount gained but for the faithfulness exercised with what was given.",
        reflectionQuestions: [
          "What talents, resources, or opportunities has God entrusted to you?",
          "Are you investing what you have been given, or burying it out of fear?",
          "What does this parable teach about God's expectations of stewardship?",
          "How does fear of failure prevent you from stepping out in faith?",
        ],
        prayerPrompt:
          "Master, You have entrusted me with gifts, time, and opportunities. Forgive me for the times I have buried them out of fear. Help me to invest boldly, knowing that faithfulness — not perfection — is what You require.",
        thenContext:
          "A talent was a unit of weight in precious metal — one talent equaled about 20 years of a laborer's wages. Five talents represented a staggering fortune. The parable illustrates that God distributes gifts differently but expects faithfulness universally.",
        nowApplication:
          "The Parable of the Talents condemns not failure but inaction. God does not compare us to others — He asks whether we were faithful with what He gave us. The enemy of fruitfulness is not inability but fear-driven passivity.",
      },
    ],
  },
  {
    title: "Walking Through the Wilderness",
    description:
      "Journey with Israel through the wilderness from Egypt to the edge of the Promised Land. Each day explores a pivotal moment in the Exodus — from miraculous deliverance to grumbling and provision — revealing how God shapes His people through the desert seasons of life.",
    totalDays: 7,
    theme: "Faith & Perseverance",
    targetGoals: [
      "Understand God's purpose in wilderness seasons",
      "Learn from Israel's failures and faithfulness",
      "Trust God's provision when the path is unclear",
    ],
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 14,
    isPublished: true,
    days: [
      {
        dayNumber: 1,
        title: "Deliverance at the Red Sea",
        bookId: 2,
        chapter: 14,
        verseStart: 10,
        verseEnd: 31,
        passageLabel: "Exodus 14:10-31",
        contextNote:
          "Trapped between the Red Sea and Pharaoh's army, Israel panics. Moses declares, 'Stand still, and see the salvation of the Lord.' God parts the sea, Israel crosses on dry ground, and the pursuing army is destroyed. This is the definitive act of deliverance in the Old Testament.",
        keyTermStrongId: "H3444",
        locationName: null,
        timelineEventTitle: "The Exodus from Egypt",
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Stand still — not in sloth or despair, but in holy confidence that God will fight for you. The salvation of the Lord requires only that you trust and obey.",
        reflectionQuestions: [
          "When has God delivered you from a situation that seemed impossible?",
          "What does 'Stand still and see the salvation of the Lord' mean for your current struggle?",
          "How quickly do you forget God's past deliverances when new crises arise?",
          "What does the Red Sea crossing reveal about God's power over the forces that pursue you?",
        ],
        prayerPrompt:
          "Lord, You parted the sea for Your people. You are the same God today. When I am trapped between fear and impossibility, help me to stand still, to trust, and to see Your salvation.",
        thenContext:
          "Israel had been slaves in Egypt for over 400 years. Pharaoh's army represented the most powerful military force in the ancient world. The Red Sea was a wall of impossibility. God's deliverance was not subtle — it was spectacular and unmistakable.",
        nowApplication:
          "The Red Sea moment teaches that God's deliverance often comes at the last possible moment and in ways we never expected. Our role is not to engineer escape but to trust the God who commands wind and water.",
      },
      {
        dayNumber: 2,
        title: "Bitter Water Made Sweet",
        bookId: 2,
        chapter: 15,
        verseStart: 22,
        verseEnd: 27,
        passageLabel: "Exodus 15:22-27",
        contextNote:
          "Three days after the Red Sea, Israel finds no water. When they reach Marah, the water is bitter and undrinkable. The people grumble. God shows Moses a tree; when cast into the water, it becomes sweet. God reveals Himself as Jehovah Rapha — 'the Lord who heals.'",
        keyTermStrongId: "H2421",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "adam-clarke",
        historicVoiceExcerpt:
          "The tree cast into the waters made them sweet — a figure of the cross of Christ, which sweetens every bitter providence.",
        reflectionQuestions: [
          "How quickly do you move from celebration to complaint?",
          "What bitter circumstances in your life need God's sweetening?",
          "How does the tree at Marah point to the cross of Christ?",
          "What does the name 'the Lord who heals' mean for your situation?",
        ],
        prayerPrompt:
          "Jehovah Rapha, You are the Lord who heals. Take the bitter waters of my circumstances and make them sweet by Your grace. Help me not to grumble but to trust that You are working even in the desert.",
        thenContext:
          "After the spectacular deliverance at the Red Sea, Israel expected smooth passage. Instead, they faced three waterless days and then bitter water. God was teaching them that faith is not tested in the miracle but in the monotony and hardship that follow.",
        nowApplication:
          "Marah teaches that mountaintop experiences are followed by valley tests. The same God who parts seas also sweetens bitter water. He is Jehovah Rapha — present not only in dramatic deliverance but in the daily difficulties that shape our character.",
      },
      {
        dayNumber: 3,
        title: "Manna from Heaven",
        bookId: 2,
        chapter: 16,
        verseStart: 1,
        verseEnd: 21,
        passageLabel: "Exodus 16:1-21",
        contextNote:
          "Israel grumbles about food, longing for Egypt's provision. God sends manna — bread from heaven — each morning and quail each evening. They must gather daily, trusting that tomorrow's supply will come. The manna teaches daily dependence on God.",
        keyTermStrongId: "H3068",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Manna was given daily — not stored in abundance — so that Israel would learn to depend on God each morning. Daily bread for daily need.",
        reflectionQuestions: [
          "How does the daily nature of manna challenge your desire for long-term security?",
          "In what ways do you romanticize past 'Egypts' when present circumstances are hard?",
          "What does it mean to gather only enough for today and trust God for tomorrow?",
          "How does Jesus' claim to be the 'Bread of Life' connect to the manna?",
        ],
        prayerPrompt:
          "Father, You provided manna every morning — enough for the day. Teach me to trust You for daily bread and to resist hoarding out of anxiety. You are faithful, morning by morning.",
        thenContext:
          "The wilderness provided no natural food sources for over a million people. Manna was a supernatural provision that appeared with the morning dew. It could not be hoarded except before the Sabbath. God was retraining a slave mentality into a trust mentality.",
        nowApplication:
          "Manna teaches that God's provision is daily, not annual. We cannot stockpile enough security to eliminate the need for faith. Each morning is an invitation to trust that the same God who provided yesterday will provide today.",
      },
      {
        dayNumber: 4,
        title: "Water from the Rock",
        bookId: 2,
        chapter: 17,
        verseStart: 1,
        verseEnd: 7,
        passageLabel: "Exodus 17:1-7",
        contextNote:
          "Again without water, Israel quarrels bitterly with Moses: 'Is the Lord among us, or not?' God instructs Moses to strike the rock at Horeb, and water flows abundantly. Paul later reveals that 'the rock was Christ' — a source of living water for a thirsty people.",
        keyTermStrongId: "H776",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "The rock, being smitten, poured forth water for all — a figure of Christ, who was smitten for us that living water might flow to all who thirst.",
        reflectionQuestions: [
          "Why does the same lesson — trusting God for provision — need to be repeated so often?",
          "How does questioning 'Is the Lord among us?' resonate with your doubts?",
          "What does it mean that the rock was Christ, smitten for our sake?",
          "Where are you spiritually thirsty and in need of living water?",
        ],
        prayerPrompt:
          "Lord, You brought water from solid rock for Your thirsty people. I come to You thirsty again. Strike the rock of my hardened heart and let living water flow. You are among us — even when I cannot see You.",
        thenContext:
          "Rephidim was a desolate location with no natural water source. Israel's complaint was legitimate in practical terms but revealed a spiritual crisis: they doubted God's presence and care despite repeated miracles. The place was named Massah and Meribah — 'testing' and 'quarreling.'",
        nowApplication:
          "The rock at Horeb prefigures Christ, who was 'struck' on the cross so that living water could flow to all. Our repeated thirst is not a sign of failure — it is an invitation to return to the Source who never runs dry.",
      },
      {
        dayNumber: 5,
        title: "The Golden Calf — Idolatry in the Desert",
        bookId: 2,
        chapter: 32,
        verseStart: 1,
        verseEnd: 20,
        passageLabel: "Exodus 32:1-20",
        contextNote:
          "While Moses is on Mount Sinai receiving the law, Israel grows impatient and pressures Aaron to make a golden calf. They declare, 'These be thy gods, O Israel, which brought thee up out of Egypt.' In mere weeks, they have replaced the living God with a manufactured idol.",
        keyTermStrongId: "H430",
        locationName: "Mount Sinai",
        timelineEventTitle: "Giving of the Law at Sinai",
        commentatorId: "adam-clarke",
        historicVoiceExcerpt:
          "They changed their glory into the similitude of an ox that eateth grass — trading the Creator for a creation of their own hands.",
        reflectionQuestions: [
          "What 'golden calves' do you construct when God seems silent or distant?",
          "How does impatience lead to idolatry in your life?",
          "What does Aaron's compliance teach about the danger of people-pleasing leadership?",
          "How quickly can spiritual devotion decay without intentional maintenance?",
        ],
        prayerPrompt:
          "Lord, forgive me for the idols I construct when You seem silent. Break the golden calves of my heart — the substitutes I worship in place of You. You alone are God. There is no other.",
        thenContext:
          "Israel had just witnessed the most dramatic theophany in history at Sinai. Yet within forty days of Moses' absence, they reverted to Egyptian-style idol worship. The golden calf was not a rejection of God but an attempt to make Him manageable and visible — which is its own form of idolatry.",
        nowApplication:
          "The golden calf warns us that idolatry is not just ancient paganism — it is the human tendency to replace the invisible God with visible substitutes. Any good thing can become an idol when it takes God's place: career, relationships, comfort, or control.",
      },
      {
        dayNumber: 6,
        title: "The Twelve Spies — Fear vs. Faith",
        bookId: 4,
        chapter: 13,
        verseStart: 26,
        verseEnd: 33,
        passageLabel: "Numbers 13:26-33",
        contextNote:
          "Twelve spies return from scouting the Promised Land. Ten report that the inhabitants are giants and conquest is impossible. Only Joshua and Caleb declare, 'The Lord is with us.' The majority's fear leads to forty years of wandering. A generation dies without entering the land.",
        keyTermStrongId: "H2377",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "They saw the giants and forgot the God who had parted the sea. Fear magnifies the obstacle and shrinks the promise.",
        reflectionQuestions: [
          "When have you let the 'giants' in your life make you forget God's promises?",
          "What is the difference between the perspective of the ten spies and that of Joshua and Caleb?",
          "How does fear-based decision-making rob you of God's best?",
          "What 'Promised Land' are you hesitating to enter because of fear?",
        ],
        prayerPrompt:
          "Lord, give me the faith of Caleb and Joshua — to see the giants but believe the promise. When fear tells me I cannot, remind me that You have already gone before me. I will not let what I see overrule what You have said.",
        thenContext:
          "The twelve spies all agreed that the land was abundant — flowing with milk and honey. The evidence was a cluster of grapes so large it required two men to carry it. The disagreement was not about the facts but about the faith to act on God's promise.",
        nowApplication:
          "The spy report teaches that facts and faith must coexist. The obstacles were real, but so was God's promise. Fear-based decision-making leads to decades of wandering. Faith-based obedience leads to the Promised Land.",
      },
      {
        dayNumber: 7,
        title: "The Bronze Serpent — Look and Live",
        bookId: 4,
        chapter: 21,
        verseStart: 4,
        verseEnd: 9,
        passageLabel: "Numbers 21:4-9",
        contextNote:
          "After more complaining, God sends venomous serpents among the people. When they repent, God instructs Moses to make a bronze serpent and lift it on a pole. Anyone bitten who looks at it will live. Jesus later points to this event as a picture of His own crucifixion: 'As Moses lifted up the serpent in the wilderness, even so must the Son of man be lifted up.'",
        keyTermStrongId: "H3444",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "Look and live — the simplicity of the remedy was its scandal. No effort, no merit — only a look of faith at the one lifted up.",
        reflectionQuestions: [
          "How does the bronze serpent prefigure Christ lifted up on the cross?",
          "What does it mean that salvation required only looking — not earning or achieving?",
          "Why is the simplicity of the gospel so difficult for human pride?",
          "Where are you bitten by sin and in need of looking to Christ?",
        ],
        prayerPrompt:
          "Lord Jesus, as Moses lifted the serpent, so You were lifted up — that whoever looks to You in faith shall not perish but have eternal life. I look to You now. Heal me, save me, and give me life.",
        thenContext:
          "The bronze serpent was a radical provision — the cure resembled the curse. God did not remove the serpents but provided a means of healing in the midst of them. This paradox prefigures the cross, where Christ was 'made sin for us' so that we might be healed.",
        nowApplication:
          "John 3:14-15 explicitly connects the bronze serpent to the cross. Salvation is not complicated — it requires looking to the One who was lifted up. The simplicity offends our pride, but it is the only remedy. Look and live.",
      },
    ],
  },
  {
    title: "The Armor of God",
    description:
      "Paul's letter to the Ephesians culminates in a call to spiritual warfare. Over six days, examine each piece of the armor of God — truth, righteousness, the gospel, faith, salvation, and the Word — and learn how to stand firm against the forces of darkness.",
    totalDays: 6,
    theme: "Spiritual Warfare",
    targetGoals: [
      "Understand each piece of the armor of God",
      "Recognize the reality of spiritual warfare",
      "Equip yourself daily for spiritual battles",
    ],
    difficultyLevel: "intermediate",
    estimatedMinutesPerDay: 13,
    isPublished: true,
    days: [
      {
        dayNumber: 1,
        title: "Know Your Enemy — The Call to Stand",
        bookId: 49,
        chapter: 6,
        verseStart: 10,
        verseEnd: 13,
        passageLabel: "Ephesians 6:10-13",
        contextNote:
          "Paul introduces the spiritual warfare passage by reminding believers that their struggle is not against flesh and blood but against principalities and powers. The call is not to attack but to stand — to hold ground that Christ has already won.",
        keyTermStrongId: "G1411",
        locationName: "Rome",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "Be strong in the Lord — not in yourselves. The power that enables us to stand is not our own but is drawn from the might of God Himself.",
        reflectionQuestions: [
          "How does recognizing your battle is spiritual change the way you fight?",
          "What does it mean to 'stand' rather than advance or retreat?",
          "Where have you been fighting flesh-and-blood battles that are actually spiritual?",
          "How do you draw on the Lord's strength rather than your own?",
        ],
        prayerPrompt:
          "Lord, I recognize that my battle is not against people but against spiritual forces. Strengthen me with Your might. Teach me to stand — not in my power but in Yours. I put on Your armor today.",
        thenContext:
          "Paul wrote from prison in Rome, likely chained to a Roman soldier. The image of armor was drawn from the very guard watching over him. Yet Paul's vision transcended the physical — behind human conflict, spiritual forces were at work.",
        nowApplication:
          "Ephesians 6 reframes every conflict. Relational tensions, temptations, discouragement, and cultural pressures are not merely human — they have a spiritual dimension. Awareness of the true enemy changes our strategy from anger at people to dependence on God.",
      },
      {
        dayNumber: 2,
        title: "The Belt of Truth",
        bookId: 49,
        chapter: 6,
        verseStart: 14,
        verseEnd: 14,
        passageLabel: "Ephesians 6:14a",
        contextNote:
          "The first piece of armor is the belt of truth. In Roman armor, the belt held everything together and allowed the soldier to move freely. Truth is the foundation of spiritual integrity — without it, every other piece of armor is compromised.",
        keyTermStrongId: "G225",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "adam-clarke",
        historicVoiceExcerpt:
          "Truth is the girdle that holds everything in place — a life built on deception will find every other defense compromised.",
        reflectionQuestions: [
          "In what areas of your life are you tempted to compromise truth?",
          "How does self-deception undermine your spiritual defenses?",
          "What is the relationship between God's truth and personal integrity?",
          "How can you 'gird yourself with truth' in practical daily ways?",
        ],
        prayerPrompt:
          "God of truth, gird me with Your truth today. Expose every lie I have believed about myself, about You, and about the world. Let truth be the foundation that holds every other piece of my spiritual armor in place.",
        thenContext:
          "The Roman soldier's belt (cingulum) was essential — it cinched the tunic, supported the sword, and allowed freedom of movement. Without it, the soldier was encumbered and vulnerable. Paul uses this to illustrate that truth is foundational to spiritual readiness.",
        nowApplication:
          "In an age of deception, misinformation, and self-delusion, the belt of truth is more critical than ever. It means living in alignment with God's revealed truth — in our beliefs, our speech, our relationships, and our inner lives.",
      },
      {
        dayNumber: 3,
        title: "The Breastplate of Righteousness",
        bookId: 49,
        chapter: 6,
        verseStart: 14,
        verseEnd: 14,
        passageLabel: "Ephesians 6:14b",
        contextNote:
          "The breastplate protects the vital organs — the heart. The breastplate of righteousness is both Christ's imputed righteousness (our standing before God) and practical righteousness (our daily obedience). Together, they guard the heart from accusation and corruption.",
        keyTermStrongId: "G1343",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "The breastplate of righteousness — both the righteousness of Christ imputed to us and the righteousness wrought in us by the Spirit — guards the heart from every assault.",
        reflectionQuestions: [
          "How does Christ's righteousness protect you from guilt and condemnation?",
          "Where is your heart vulnerable because of unconfessed sin?",
          "What is the relationship between positional righteousness and practical holiness?",
          "How does the enemy attack your sense of identity and standing before God?",
        ],
        prayerPrompt:
          "Lord Jesus, I put on the breastplate of Your righteousness. Guard my heart from the accusations of the enemy. I stand not in my own goodness but in Yours. And by Your Spirit, help me to live in a way that protects my heart.",
        thenContext:
          "The Roman breastplate (lorica) covered the torso, protecting the heart and lungs. Without it, any blow to the chest was fatal. Paul understood that the spiritual heart is the primary target of the enemy — and righteousness is its defense.",
        nowApplication:
          "The breastplate has two sides: Christ's righteousness that silences condemnation, and practical holiness that prevents the enemy from gaining a foothold. Both are necessary. We need Christ's record and the Spirit's transformation.",
      },
      {
        dayNumber: 4,
        title: "Shoes of the Gospel of Peace",
        bookId: 49,
        chapter: 6,
        verseStart: 15,
        verseEnd: 15,
        passageLabel: "Ephesians 6:15",
        contextNote:
          "Roman soldiers wore caligae — heavy sandals with hobnailed soles that provided grip on any terrain. Paul applies this to the readiness that comes from the gospel of peace. Grounded in the gospel, believers can stand firm on any ground the battle takes them.",
        keyTermStrongId: "G1515",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt:
          "The gospel of peace gives the soldier sure footing — for the one who has peace with God can stand firm on any ground.",
        reflectionQuestions: [
          "How does having peace with God affect your ability to face conflict?",
          "Are you ready to share the gospel when opportunities arise?",
          "What terrain are you currently standing on — is your footing sure?",
          "How does inner peace become a weapon in spiritual warfare?",
        ],
        prayerPrompt:
          "Prince of Peace, fit my feet with the readiness of Your gospel. Give me sure footing on any terrain the enemy chooses. And make me ready — always ready — to share the good news that brings peace.",
        thenContext:
          "Roman soldiers' hobnailed sandals were essential for maintaining position in battle. Slipping meant death. Paul's metaphor connects the gospel of peace with stability in conflict — those who know they are at peace with God cannot be knocked off their feet.",
        nowApplication:
          "The shoes of the gospel represent both stability and readiness. We stand firm because we are at peace with God through Christ. And we are always ready to bring that peace to others. A believer with gospel footing is immovable and mission-ready.",
      },
      {
        dayNumber: 5,
        title: "The Shield of Faith and Helmet of Salvation",
        bookId: 49,
        chapter: 6,
        verseStart: 16,
        verseEnd: 17,
        passageLabel: "Ephesians 6:16-17a",
        contextNote:
          "The shield of faith quenches the fiery darts of the enemy — doubts, temptations, lies, and accusations. The helmet of salvation protects the mind, guarding our confidence that we belong to God. Together, they defend against the enemy's external attacks and internal deceptions.",
        keyTermStrongId: "G4102",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "adam-clarke",
        historicVoiceExcerpt:
          "The shield of faith quenches every fiery dart — not some, but all. Faith does not merely deflect the enemy's attacks; it extinguishes them.",
        reflectionQuestions: [
          "What 'fiery darts' has the enemy been launching at you recently?",
          "How does active faith — not passive belief — serve as a shield?",
          "What lies about your salvation does the enemy use to attack your confidence?",
          "How do you protect your mind from thoughts that undermine your identity in Christ?",
        ],
        prayerPrompt:
          "Lord, I take up the shield of faith to quench every fiery dart. And I put on the helmet of salvation to protect my mind. When doubt, accusation, and fear come, I stand behind the shield of what I know to be true about You.",
        thenContext:
          "The Roman scutum was a large, door-like shield that could protect the entire body. It was coated with leather and soaked in water before battle, extinguishing flaming arrows. The helmet (galea) protected the head — the seat of thought and decision-making.",
        nowApplication:
          "Faith is not a feeling — it is the active decision to trust God's promises over the enemy's lies. The helmet of salvation guards the mind, which is the primary battlefield. When we are sure of our salvation, the enemy's accusations lose their power.",
      },
      {
        dayNumber: 6,
        title: "The Sword of the Spirit — The Word of God",
        bookId: 49,
        chapter: 6,
        verseStart: 17,
        verseEnd: 20,
        passageLabel: "Ephesians 6:17b-20",
        contextNote:
          "The only offensive weapon in the armor is the sword of the Spirit — the Word of God. Paul then adds the essential element: prayer. The fully armed believer stands firm, wields the Word, and prays 'always with all prayer and supplication in the Spirit.'",
        keyTermStrongId: "G3056",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt:
          "The sword of the Spirit — the Word of God — is both defensive and offensive. It is the only weapon that can wound the enemy and set captives free.",
        reflectionQuestions: [
          "How familiar are you with the Scriptures — enough to wield them in battle?",
          "When has a specific Bible verse defeated a specific temptation or lie?",
          "How does prayer complete the armor and sustain the fight?",
          "What does it mean to pray 'in the Spirit' during spiritual warfare?",
        ],
        prayerPrompt:
          "Lord, Your Word is my sword. Sharpen it in my hands through study and meditation. And keep me in constant prayer — alert, persevering, and interceding for all the saints. I will not fight in my strength but in Yours.",
        thenContext:
          "The Roman gladius was a short, double-edged sword designed for close combat. Paul's use of 'rhema' (spoken word) rather than 'logos' (general word) suggests specific, timely application of Scripture — as Jesus demonstrated when He defeated Satan in the wilderness by quoting specific texts.",
        nowApplication:
          "The sword of the Spirit is the only offensive weapon in the armor. It requires knowing Scripture well enough to apply it specifically to each situation. Jesus modeled this in His temptation: each lie was countered with 'It is written.' We fight the same way — not with arguments but with God's Word.",
      },
    ],
  },
];

async function seed() {
  console.log("Seeding additional devotional plans and days...");

  const allLocations = await db.select().from(locations);
  const locationMap = new Map<string, string>();
  for (const loc of allLocations) {
    locationMap.set(loc.name, loc.id);
  }

  const allEvents = await db.select().from(timelineEvents);
  const eventMap = new Map<string, string>();
  for (const evt of allEvents) {
    eventMap.set(evt.title, evt.id);
  }

  const allCommentators = await db.select().from(commentators);
  const commentatorIds = new Set(allCommentators.map((c) => c.id));

  for (const plan of PLANS) {
    const existingPlan = await db
      .select()
      .from(devotionalPlans)
      .where(eq(devotionalPlans.title, plan.title))
      .limit(1);

    let planId: string;

    if (existingPlan.length) {
      planId = existingPlan[0].id;
      console.log(`  Plan "${plan.title}" already exists (id=${planId}), skipping.`);
      continue;
    } else {
      const inserted = await db
        .insert(devotionalPlans)
        .values({
          title: plan.title,
          description: plan.description,
          totalDays: plan.totalDays,
          theme: plan.theme,
          targetGoals: plan.targetGoals,
          difficultyLevel: plan.difficultyLevel,
          estimatedMinutesPerDay: plan.estimatedMinutesPerDay,
          isPublished: plan.isPublished,
        })
        .returning();

      planId = inserted[0].id;
      console.log(`  Inserted plan: "${plan.title}" (id=${planId})`);
    }

    for (const day of plan.days) {
      const locationId = day.locationName
        ? locationMap.get(day.locationName) ?? null
        : null;
      const timelineEventId = day.timelineEventTitle
        ? eventMap.get(day.timelineEventTitle) ?? null
        : null;
      const validCommentatorId =
        day.commentatorId && commentatorIds.has(day.commentatorId)
          ? day.commentatorId
          : null;

      if (day.locationName && !locationId) {
        console.warn(`    Location not found: "${day.locationName}"`);
      }
      if (day.timelineEventTitle && !timelineEventId) {
        console.warn(`    Timeline event not found: "${day.timelineEventTitle}"`);
      }
      if (day.commentatorId && !validCommentatorId) {
        console.warn(`    Commentator not found: "${day.commentatorId}"`);
      }

      await db
        .insert(devotionalDays)
        .values({
          planId,
          dayNumber: day.dayNumber,
          title: day.title,
          bookId: day.bookId,
          chapter: day.chapter,
          verseStart: day.verseStart,
          verseEnd: day.verseEnd,
          passageLabel: day.passageLabel,
          contextNote: day.contextNote,
          keyTermStrongId: day.keyTermStrongId,
          locationId,
          timelineEventId,
          commentatorId: validCommentatorId,
          historicVoiceExcerpt: day.historicVoiceExcerpt,
          reflectionQuestions: day.reflectionQuestions,
          prayerPrompt: day.prayerPrompt,
          thenContext: day.thenContext,
          nowApplication: day.nowApplication,
        })
        .onConflictDoNothing();

      console.log(`    Day ${day.dayNumber}: "${day.title}"`);
    }
  }

  console.log("\nAdditional devotional seeding complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
