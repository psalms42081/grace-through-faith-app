import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  devotionalPlans,
  devotionalDays,
  locations,
  timelineEvents,
  commentators,
} from "../shared/schema";

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
    title: "Foundations of Faith",
    description: "Journey through seven key passages from Genesis to Revelation that lay the bedrock of Christian belief. Each day explores a foundational doctrine — creation, covenant, law, prophecy, incarnation, redemption, and restoration — helping you build an unshakeable framework for faith.",
    totalDays: 7,
    theme: "Core Doctrines",
    targetGoals: ["Understand foundational doctrines", "Build a biblical worldview", "Connect Old and New Testaments"],
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 15,
    isPublished: true,
    days: [
      {
        dayNumber: 1,
        title: "In the Beginning — Creation",
        bookId: 1,
        chapter: 1,
        verseStart: 1,
        verseEnd: 31,
        passageLabel: "Genesis 1:1-31",
        contextNote: "Genesis opens the entire biblical narrative with God creating the heavens and earth. Written to ancient Israelites surrounded by polytheistic creation myths, this chapter declares one sovereign God who creates with purpose, order, and goodness.",
        keyTermStrongId: "H1254",
        locationName: "Garden of Eden Region",
        timelineEventTitle: "Creation",
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "The work of creation is not a work of human art or device but a work of divine wisdom and power.",
        reflectionQuestions: [
          "What does it mean that God declared creation 'good'?",
          "How does being made in God's image shape your understanding of human dignity?",
          "Where do you see evidence of God's creative order in the world around you?",
          "How does the creation account challenge modern views of human origin and purpose?"
        ],
        prayerPrompt: "Creator God, thank You for making all things with intention and declaring them good. Help me to see Your image in every person I encounter and to steward Your creation faithfully.",
        thenContext: "Ancient Israelites lived among cultures with competing creation stories involving chaotic battles between gods. Genesis 1 presented a radically different vision: one God, creating peacefully and purposefully, with humanity as the pinnacle of His work.",
        nowApplication: "In a culture that often reduces humans to biological accidents or economic units, Genesis 1 affirms that every person carries inherent dignity and purpose. Our work, creativity, and care for others flow from this original design.",
      },
      {
        dayNumber: 2,
        title: "Covenant Promise — God Calls Abraham",
        bookId: 1,
        chapter: 12,
        verseStart: 1,
        verseEnd: 9,
        passageLabel: "Genesis 12:1-9",
        contextNote: "God calls Abram out of Ur, a prosperous pagan city, promising to make him a great nation and bless all families of the earth through him. This covenant becomes the backbone of the entire biblical storyline.",
        keyTermStrongId: "H1285",
        locationName: "Ur",
        timelineEventTitle: "Call of Abraham",
        commentatorId: "john-gill",
        historicVoiceExcerpt: "This call of Abram was an act of pure sovereign grace; there was nothing in Abram to merit such a distinction.",
        reflectionQuestions: [
          "What is God asking you to leave behind in order to follow Him more fully?",
          "How do you respond when God's promises seem too large for your circumstances?",
          "What does Abram's obedience without seeing the destination teach about faith?",
          "How does God's promise to bless 'all families of the earth' expand your understanding of His plan?"
        ],
        prayerPrompt: "Lord, like Abraham, give me the courage to follow where You lead, even when I cannot see the destination. Help me to trust Your covenant promises and to be a blessing to those around me.",
        thenContext: "Abram's departure from Ur was a complete break from family, culture, and the security of a prosperous civilization. God's promise to make him a great nation seemed impossible — he was elderly and childless.",
        nowApplication: "Following God often means stepping into uncertainty with nothing but a promise. Abraham's journey reminds us that faith is not a feeling but a decision to obey when God speaks, even before we see results.",
      },
      {
        dayNumber: 3,
        title: "The Law — God's Standard Revealed",
        bookId: 2,
        chapter: 20,
        verseStart: 1,
        verseEnd: 17,
        passageLabel: "Exodus 20:1-17",
        contextNote: "At Mount Sinai, God gives Israel the Ten Commandments — the moral foundation of the Mosaic covenant. These laws defined Israel's relationship with God and with one another, setting them apart from surrounding nations.",
        keyTermStrongId: "H8451",
        locationName: "Mount Sinai",
        timelineEventTitle: "Giving of the Law at Sinai",
        commentatorId: "adam-clarke",
        historicVoiceExcerpt: "These ten words are the foundation of all the laws in the Pentateuch, and indeed of all righteous legislation among mankind.",
        reflectionQuestions: [
          "Which of the Ten Commandments challenges you most in your daily life?",
          "How does the law reveal both God's holiness and His care for human flourishing?",
          "What is the relationship between the law and grace in your understanding?",
          "How do these ancient commands remain relevant in modern ethical discussions?"
        ],
        prayerPrompt: "Holy God, Your commandments reveal Your character and Your care for us. Show me where my life falls short of Your standard, and give me grace to pursue holiness — not to earn Your love, but because I have already received it.",
        thenContext: "Israel had just been delivered from Egypt and was being constituted as a covenant nation. The Ten Commandments established the terms of their relationship with God — not as conditions for earning salvation, but as the grateful response of a redeemed people.",
        nowApplication: "The law functions as a mirror, revealing our need for grace. While we are not saved by keeping commandments, they still reflect God's unchanging character and provide a moral framework for life in community.",
      },
      {
        dayNumber: 4,
        title: "The Suffering Servant — Prophecy of Redemption",
        bookId: 23,
        chapter: 53,
        verseStart: 1,
        verseEnd: 12,
        passageLabel: "Isaiah 53:1-12",
        contextNote: "Written approximately 700 years before Christ, Isaiah 53 describes a mysterious 'Suffering Servant' who bears the sins of the people. The original audience expected a conquering Messiah; Isaiah revealed one who would conquer through sacrifice.",
        keyTermStrongId: "H3444",
        locationName: "Jerusalem",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "He was wounded for our transgressions — not for any sin of His own; the chastisement of our peace was upon Him, that we, by His stripes, might be healed.",
        reflectionQuestions: [
          "How does understanding the cost of grace change the way you live?",
          "In what ways does Jesus as the Suffering Servant challenge your expectations of strength?",
          "What does it mean that 'by His stripes we are healed'?",
          "How does this prophecy connect the Old Testament to the New Testament?"
        ],
        prayerPrompt: "Jesus, by Your wounds I am healed. Help me never to treat Your sacrifice lightly. Let the weight of what You endured transform my gratitude, my worship, and my willingness to serve others sacrificially.",
        thenContext: "Isaiah spoke to a nation facing judgment and exile. The idea of a Messiah who would suffer and die was counter to every expectation. Yet this servant would bear iniquity, be 'cut off from the land of the living,' and make many righteous.",
        nowApplication: "Isaiah 53 confronts our desire for a God who fixes everything without cost. True redemption required the deepest sacrifice. This chapter invites us to reckon with the weight of grace — it was not cheap.",
      },
      {
        dayNumber: 5,
        title: "The Word Made Flesh — Incarnation",
        bookId: 43,
        chapter: 1,
        verseStart: 1,
        verseEnd: 18,
        passageLabel: "John 1:1-18",
        contextNote: "John's prologue declares that the eternal Word (Logos) who was with God and was God became flesh and dwelt among humanity. This is the cornerstone of Christian theology: God entered the material world fully and personally.",
        keyTermStrongId: "G3056",
        locationName: "Bethlehem",
        timelineEventTitle: "Birth of Jesus Christ",
        commentatorId: "john-gill",
        historicVoiceExcerpt: "The Word was made flesh — not by being changed into flesh, but by assuming human nature into union with His divine person.",
        reflectionQuestions: [
          "What does it mean that the eternal Word 'became flesh' and dwelt among us?",
          "How does the incarnation change the way you view ordinary, physical life?",
          "What does John mean when he says Jesus is 'full of grace and truth'?",
          "How does the metaphor of light versus darkness apply to your circumstances?"
        ],
        prayerPrompt: "Lord Jesus, You are the Word made flesh. Thank You for not remaining distant but entering into the fullness of human experience. Shine Your light into every dark corner of my heart and help me receive Your grace and truth.",
        thenContext: "John wrote to a mixed audience of Jews (for whom 'the Word' meant God's creative and revelatory power) and Greeks (for whom 'Logos' was the rational principle of the universe). John declared this Logos was not an abstract force but a Person.",
        nowApplication: "In a culture that separates spiritual from physical, John 1 insists God entered the material world fully. The incarnation means God is not distant — He moved into the neighborhood. This transforms how we view our bodies, our work, and everyday life.",
      },
      {
        dayNumber: 6,
        title: "No Condemnation — Freedom in Christ",
        bookId: 45,
        chapter: 8,
        verseStart: 1,
        verseEnd: 39,
        passageLabel: "Romans 8:1-39",
        contextNote: "Romans 8 is the climactic chapter of Paul's letter — a declaration that those in Christ are free from condemnation, empowered by the Spirit, and held secure by an inseparable love. It addresses guilt, fear, and the assurance of salvation.",
        keyTermStrongId: "G1343",
        locationName: "Rome",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "If God be for us, who can be against us? The apostle here challenges all the enemies of the saints to produce anything against them that can prevail.",
        reflectionQuestions: [
          "Where in your life are you still living under condemnation rather than in freedom?",
          "How does the promise that 'all things work together for good' sustain you in hardship?",
          "What would change if you truly believed nothing can separate you from God's love?",
          "How is the Holy Spirit interceding for you in your current struggles?"
        ],
        prayerPrompt: "Abba, Father — I am Your child. Thank You that there is no condemnation for me in Christ Jesus. When guilt and shame threaten to define me, remind me that Your Spirit bears witness with my spirit. Nothing can separate me from Your love.",
        thenContext: "Paul wrote to a community of Jewish and Gentile believers navigating deep theological tensions. Romans 8 resolves the tension between law and grace, declaring that the Spirit gives what the law demanded but could not produce.",
        nowApplication: "Romans 8 speaks directly to guilt, fear, and insecurity. In a world that constantly evaluates and condemns, Paul declares freedom. The Spirit does not merely help us try harder — He gives us a new identity as God's children.",
      },
      {
        dayNumber: 7,
        title: "All Things New — The Promise of Restoration",
        bookId: 66,
        chapter: 21,
        verseStart: 1,
        verseEnd: 7,
        passageLabel: "Revelation 21:1-7",
        contextNote: "The final vision of Scripture: a new heaven and new earth where God dwells directly with His people. Death, mourning, crying, and pain are abolished. The entire biblical narrative culminates in total restoration.",
        keyTermStrongId: "G2316",
        locationName: "Patmos",
        timelineEventTitle: "John's Vision on Patmos",
        commentatorId: "jfb",
        historicVoiceExcerpt: "God shall wipe away all tears — there shall be no more death, neither sorrow, nor crying. The former things are passed away; behold, all things are made new.",
        reflectionQuestions: [
          "How does the promise of a renewed creation affect how you handle present suffering?",
          "What does it mean that God will 'dwell with' His people — not at a distance but intimately?",
          "In what ways can you participate now in God's work of making all things new?",
          "How does this vision of the future shape your priorities today?"
        ],
        prayerPrompt: "God of all hope, You are making all things new. When the brokenness of this world weighs on me, lift my eyes to the city You are preparing. Strengthen me to be an agent of Your renewal even now, as I wait for the day when every sorrow is no more.",
        thenContext: "John received this vision while exiled on Patmos, writing to persecuted churches across Asia Minor. The imagery draws on Old Testament promises — the new Jerusalem, the wiping away of tears, the end of death — bringing the biblical narrative to its climax.",
        nowApplication: "Revelation 21 reframes all present suffering as temporary. God's plan is not to abandon creation but to renew it. This hope is not escapism — it is the ultimate realism, the destination toward which all of history moves.",
      },
    ],
  },
  {
    title: "The Life of Christ",
    description: "Walk through seven pivotal moments in the life of Jesus — from His miraculous birth to His glorious resurrection. Each day immerses you in a key event, revealing who Jesus is, why He came, and what His life means for yours.",
    totalDays: 7,
    theme: "Christology",
    targetGoals: ["Know Jesus more deeply", "Understand His mission", "Apply His example to daily life"],
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 12,
    isPublished: true,
    days: [
      {
        dayNumber: 1,
        title: "Born in Bethlehem",
        bookId: 42,
        chapter: 2,
        verseStart: 1,
        verseEnd: 20,
        passageLabel: "Luke 2:1-20",
        contextNote: "Caesar Augustus ordered a census that brought Mary and Joseph to Bethlehem, fulfilling Micah's prophecy. The King of kings was born not in a palace but in the humblest of circumstances, announced first to shepherds — the lowest of society.",
        keyTermStrongId: "G4982",
        locationName: "Bethlehem",
        timelineEventTitle: "Birth of Jesus Christ",
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "Christ was born in an inn, to intimate that He came into the world but as a sojourner, whose home and kingdom are not of this world.",
        reflectionQuestions: [
          "What does the humble setting of Jesus' birth reveal about God's values?",
          "Why were shepherds — social outsiders — the first to hear the good news?",
          "How does the incarnation challenge the way you think about power and status?",
          "What would it look like to 'treasure and ponder' God's work in your life as Mary did?"
        ],
        prayerPrompt: "Lord Jesus, You entered the world in humility and were announced to the lowly. Help me to recognize Your presence in unexpected places and to treasure Your work in my heart as Mary did.",
        thenContext: "In first-century Palestine under Roman occupation, a census forced families to travel to ancestral towns. Bethlehem was small and overcrowded. The Messiah's arrival in such conditions was scandalously humble — the opposite of royal expectation.",
        nowApplication: "God consistently works through what the world overlooks. The birth narrative challenges our assumptions about how God shows up — not in power and spectacle, but in vulnerability, humility, and among the marginalized.",
      },
      {
        dayNumber: 2,
        title: "Baptized in the Jordan",
        bookId: 40,
        chapter: 3,
        verseStart: 13,
        verseEnd: 17,
        passageLabel: "Matthew 3:13-17",
        contextNote: "Jesus comes to John the Baptist to be baptized in the Jordan River. Though sinless, He identifies with humanity. The heavens open, the Spirit descends like a dove, and the Father declares: 'This is my beloved Son, in whom I am well pleased.'",
        keyTermStrongId: "G4151",
        locationName: "Jordan River",
        timelineEventTitle: "Baptism of Jesus",
        commentatorId: "adam-clarke",
        historicVoiceExcerpt: "In this one act, the whole Trinity is manifested: the Father speaks, the Son is baptized, and the Holy Spirit descends.",
        reflectionQuestions: [
          "Why did Jesus, who was sinless, submit to baptism?",
          "What does the Father's declaration of love over Jesus mean for your own identity?",
          "How does Jesus' baptism mark the beginning of His public mission?",
          "In what ways has God affirmed your identity and calling?"
        ],
        prayerPrompt: "Father, just as You declared Your love over Jesus at His baptism, remind me that I too am beloved. Help me to walk in the identity You have given me and to live out the mission You have called me to.",
        thenContext: "John's baptism was a baptism of repentance. Jesus' submission to it was an act of solidarity with sinful humanity — taking on the role of servant from the very beginning of His ministry. The trinitarian revelation was unprecedented.",
        nowApplication: "Jesus' baptism reveals that identity precedes mission. Before He performed a single miracle, the Father affirmed who He was. We too must ground our doing in our being — beloved children of God.",
      },
      {
        dayNumber: 3,
        title: "Teaching on the Mountain",
        bookId: 40,
        chapter: 5,
        verseStart: 1,
        verseEnd: 16,
        passageLabel: "Matthew 5:1-16",
        contextNote: "Jesus delivers the Beatitudes — the opening of the Sermon on the Mount. He declares 'blessed' the poor in spirit, the mourning, the meek, the merciful, and the persecuted. These kingdom values turn worldly wisdom upside down.",
        keyTermStrongId: "G932",
        locationName: "Capernaum",
        timelineEventTitle: "Sermon on the Mount",
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "Christ begins not with commands but with blessings — showing that His kingdom is first a gift before it is a demand.",
        reflectionQuestions: [
          "Which beatitude challenges your assumptions about what it means to be blessed?",
          "How does Jesus' definition of blessedness differ from cultural success?",
          "What does it mean to be 'salt' and 'light' in your specific context?",
          "How can you be a peacemaker in your relationships this week?"
        ],
        prayerPrompt: "Jesus, Your kingdom turns the world's values upside down. Make me poor in spirit and hungry for righteousness. Help me to be salt and light wherever You have placed me — not for my own glory, but for Yours.",
        thenContext: "Jesus taught on a hillside in Galilee to disciples and crowds. In a world dominated by Roman military power and religious legalism, He announced a radically different kingdom with radically different values — one where the humble, the meek, and the merciful are exalted.",
        nowApplication: "The Beatitudes are not aspirational ideals but the constitution of God's kingdom. They describe the character of those who belong to it. In a culture that celebrates self-promotion, Jesus blesses humility, mercy, and purity of heart.",
      },
      {
        dayNumber: 4,
        title: "Calming the Storm",
        bookId: 41,
        chapter: 4,
        verseStart: 35,
        verseEnd: 41,
        passageLabel: "Mark 4:35-41",
        contextNote: "After a day of teaching, Jesus and His disciples cross the Sea of Galilee. A violent storm threatens to swamp the boat while Jesus sleeps. He rises, rebukes the wind and waves, and they are instantly still. The disciples are terrified — not by the storm, but by Jesus.",
        keyTermStrongId: "G4102",
        locationName: "Sea of Galilee",
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt: "He who made the winds and the sea could with a word command them into silence, for they are His servants.",
        reflectionQuestions: [
          "What storms in your life feel overwhelming right now?",
          "Why do you think Jesus was able to sleep during the storm?",
          "What does the disciples' question — 'Do you not care?' — reveal about their faith?",
          "How does Jesus' authority over creation change the way you face fear?"
        ],
        prayerPrompt: "Lord Jesus, You command the wind and waves. In the storms of my life, help me to trust that You are present even when You seem silent. Replace my fear with faith in Your sovereign power.",
        thenContext: "The Sea of Galilee is known for sudden, violent storms caused by wind funneling through surrounding valleys. The disciples — experienced fishermen — were genuinely terrified. Jesus' command over nature demonstrated an authority that exceeded any prophet before Him.",
        nowApplication: "This passage speaks to every season of chaos and fear. Jesus does not promise the absence of storms but His presence in them. His peace is not the absence of trouble but the assurance of His authority over it.",
      },
      {
        dayNumber: 5,
        title: "Feeding the Five Thousand",
        bookId: 43,
        chapter: 6,
        verseStart: 1,
        verseEnd: 14,
        passageLabel: "John 6:1-14",
        contextNote: "Jesus feeds over five thousand people with five loaves and two fish from a boy's lunch. This is the only miracle recorded in all four Gospels, underscoring its significance. It reveals Jesus as the provider who satisfies both physical and spiritual hunger.",
        keyTermStrongId: "G5485",
        locationName: "Sea of Galilee",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "Christ multiplied the loaves in the breaking — so it is often in the using of our gifts for God's glory that we find them increased.",
        reflectionQuestions: [
          "What small resources or abilities are you holding back from God?",
          "How does the boy's willingness to offer what he had challenge your generosity?",
          "What does this miracle reveal about Jesus' compassion for physical needs?",
          "How does Jesus' role as 'bread of life' satisfy your deepest hunger?"
        ],
        prayerPrompt: "Lord, You took a small offering and multiplied it beyond imagination. I offer You what I have — my time, my talents, my resources — trusting that in Your hands, even the little I bring can feed multitudes.",
        thenContext: "The crowd had followed Jesus to a remote area near the Sea of Galilee. Philip calculated it would take eight months' wages to feed them. Andrew found a boy with five barley loaves and two fish — a peasant's lunch — and Jesus turned it into abundance.",
        nowApplication: "God does not wait for us to have enough before He acts. He takes what we offer — however small — and multiplies it. This miracle invites us to stop calculating our insufficiency and start trusting His sufficiency.",
      },
      {
        dayNumber: 6,
        title: "Crucified for Us",
        bookId: 43,
        chapter: 19,
        verseStart: 17,
        verseEnd: 30,
        passageLabel: "John 19:17-30",
        contextNote: "Jesus is crucified at Golgotha. John records the details with stark restraint — the inscription on the cross, the soldiers dividing His garments, Jesus committing His mother to John's care, and His final words: 'It is finished.'",
        keyTermStrongId: "G5547",
        locationName: "Jerusalem",
        timelineEventTitle: "Crucifixion of Jesus",
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "'It is finished' — not merely His suffering, but the work of redemption, the fulfillment of all prophecy, and the satisfaction of divine justice.",
        reflectionQuestions: [
          "What does Jesus' declaration 'It is finished' mean for your salvation?",
          "How does the cross reveal both God's justice and His love simultaneously?",
          "In what ways do you try to add to what Christ has already accomplished?",
          "How does meditating on the crucifixion change the way you approach God?"
        ],
        prayerPrompt: "Jesus, You said 'It is finished.' Help me to rest in the completeness of Your sacrifice. I cannot add to what You have done. Free me from trying to earn what You have freely given. Your cross is enough.",
        thenContext: "Crucifixion was Rome's most brutal and humiliating form of execution, reserved for the lowest criminals. That the Messiah would die this way was unthinkable to first-century Jews. Yet Jesus embraced it willingly, fulfilling Isaiah's prophecy of the Suffering Servant.",
        nowApplication: "The cross stands at the center of Christian faith — not as a symbol of defeat but of victory. 'It is finished' means the debt is paid, the barrier removed, and access to God opened. We approach God not through our merit but through Christ's completed work.",
      },
      {
        dayNumber: 7,
        title: "He Is Risen",
        bookId: 43,
        chapter: 20,
        verseStart: 1,
        verseEnd: 18,
        passageLabel: "John 20:1-18",
        contextNote: "On the first day of the week, Mary Magdalene finds the tomb empty. She encounters the risen Jesus, who calls her by name. She becomes the first witness and herald of the resurrection — the event that changed everything.",
        keyTermStrongId: "G386",
        locationName: "Jerusalem",
        timelineEventTitle: "Resurrection of Jesus",
        commentatorId: "john-gill",
        historicVoiceExcerpt: "He called her by name — 'Mary' — and in that single word she recognized the voice of her Lord, alive forevermore.",
        reflectionQuestions: [
          "What does the empty tomb mean for your daily life, not just your eternal destiny?",
          "Why did Jesus appear first to Mary Magdalene rather than to religious leaders?",
          "How does the resurrection confirm everything Jesus claimed about Himself?",
          "In what areas of your life do you need the power of resurrection hope?"
        ],
        prayerPrompt: "Risen Lord, You conquered death and called Mary by name. You know my name too. Fill me with resurrection hope — the confidence that no grave, no failure, no darkness has the final word. You are alive, and because You live, I can face tomorrow.",
        thenContext: "In first-century Jewish culture, women's testimony was not accepted in court. Yet God chose Mary Magdalene as the first witness of the resurrection — overturning social hierarchy and demonstrating that the gospel elevates those the world dismisses.",
        nowApplication: "The resurrection is not just a historical event but a present reality. Because Christ is risen, death is defeated, hope is restored, and every broken thing can be made new. Resurrection power is available to us now — in our struggles, our grief, and our daily obedience.",
      },
    ],
  },
  {
    title: "Psalms of Comfort",
    description: "Spend five days in the Psalms that have comforted God's people through centuries of suffering, loss, and uncertainty. These carefully selected passages offer shelter for the weary soul, reminding you that God is near to the brokenhearted.",
    totalDays: 5,
    theme: "Comfort & Encouragement",
    targetGoals: ["Find comfort in Scripture", "Develop a habit of prayer through the Psalms", "Learn to lament honestly before God"],
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 10,
    isPublished: true,
    days: [
      {
        dayNumber: 1,
        title: "The Lord Is My Shepherd",
        bookId: 19,
        chapter: 23,
        verseStart: 1,
        verseEnd: 6,
        passageLabel: "Psalm 23:1-6",
        contextNote: "David, the shepherd-king who knew both green pastures and deadly valleys, wrote this psalm from personal experience. It is perhaps the most beloved passage in all of Scripture — a declaration of trust in God's personal, active provision.",
        keyTermStrongId: "H7462",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "If the Lord is my shepherd, I shall not want — not because I will have everything I desire, but because the shepherd knows what the sheep truly needs.",
        reflectionQuestions: [
          "In what area of your life do you need to trust that the Lord is your shepherd?",
          "What 'valley of the shadow of death' are you walking through right now?",
          "How has God 'prepared a table' for you even in difficult circumstances?",
          "What does it mean to dwell in the house of the Lord forever?"
        ],
        prayerPrompt: "Lord, You are my shepherd and I lack nothing in You. Lead me beside still waters and restore my soul. Even in the darkest valleys, I choose to trust Your rod and staff. Let Your goodness and mercy follow me all the days of my life.",
        thenContext: "In ancient Israel, shepherds were responsible for every aspect of their flock's welfare — guiding, feeding, protecting, and carrying the weak. David applied this intimate knowledge to describe God's comprehensive care for His people.",
        nowApplication: "Psalm 23 is not a promise of a trouble-free life but of a never-alone life. In seasons of anxiety and loss, it reminds us that God's provision is not passive but actively personal — He leads, restores, comforts, and prepares abundance even in opposition.",
      },
      {
        dayNumber: 2,
        title: "God Is Our Refuge",
        bookId: 19,
        chapter: 46,
        verseStart: 1,
        verseEnd: 11,
        passageLabel: "Psalm 46:1-11",
        contextNote: "This psalm declares God as a refuge and strength even when the earth gives way and mountains fall into the sea. It climaxes with the command: 'Be still, and know that I am God.' Martin Luther drew inspiration from it for his hymn 'A Mighty Fortress Is Our God.'",
        keyTermStrongId: "H430",
        locationName: "Jerusalem",
        timelineEventTitle: null,
        commentatorId: "adam-clarke",
        historicVoiceExcerpt: "Be still — cease from your own restless efforts and know, by experience and submission, that Jehovah alone is God.",
        reflectionQuestions: [
          "What does it mean for God to be your 'refuge' in practical terms?",
          "When have you experienced God as 'a very present help in trouble'?",
          "What would it look like to truly 'be still' in your current circumstances?",
          "How does this psalm help you face situations that feel catastrophic?"
        ],
        prayerPrompt: "Mighty God, You are my refuge and strength — a very present help in trouble. When everything shakes, You remain unmoved. Teach me to be still, to release my grip on control, and to rest in the knowledge that You are God.",
        thenContext: "This psalm may have been written in response to a military threat against Jerusalem, possibly during Hezekiah's reign when Sennacherib's Assyrian army surrounded the city. The imagery of cosmic upheaval reflects the terrifying scale of the danger.",
        nowApplication: "In a world of constant anxiety, breaking news, and existential dread, Psalm 46 commands us to stop striving. 'Be still' is not passive resignation — it is active trust in a God who is sovereign over every earthquake, literal and figurative.",
      },
      {
        dayNumber: 3,
        title: "Out of the Depths",
        bookId: 19,
        chapter: 130,
        verseStart: 1,
        verseEnd: 8,
        passageLabel: "Psalm 130:1-8",
        contextNote: "One of the seven penitential psalms and a 'Song of Ascents' sung by pilgrims going up to Jerusalem. The psalmist cries from the depths of despair, pleading for mercy, and finds hope in God's unfailing love and full redemption.",
        keyTermStrongId: "H2617",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "john-gill",
        historicVoiceExcerpt: "Out of the depths — not merely of affliction, but of a soul convinced of sin and sensible of its misery without divine mercy.",
        reflectionQuestions: [
          "Have you ever cried to God 'out of the depths'? What did that season teach you?",
          "What does it mean that God does not keep a record of sins?",
          "How do you experience 'waiting for the Lord' — with anxiety or with hope?",
          "Where do you need to trust in God's 'full redemption' today?"
        ],
        prayerPrompt: "Lord, out of the depths I cry to You. If You kept a record of sins, I could not stand. But with You there is forgiveness. I wait for You, and in Your word I put my hope. Redeem me from all my iniquities.",
        thenContext: "The Songs of Ascents (Psalms 120-134) were sung by pilgrims ascending to Jerusalem for the great feasts. Psalm 130 likely expressed the corporate guilt and longing of a people who knew they had failed God yet clung to His promise of redemption.",
        nowApplication: "Psalm 130 gives language to our darkest moments — when guilt, grief, or despair push us to the bottom. It teaches us that crying out honestly to God is itself an act of faith. And it promises that with God there is forgiveness and full redemption.",
      },
      {
        dayNumber: 4,
        title: "He Heals the Brokenhearted",
        bookId: 19,
        chapter: 147,
        verseStart: 1,
        verseEnd: 11,
        passageLabel: "Psalm 147:1-11",
        contextNote: "This psalm celebrates God who counts the stars and calls them by name yet also heals the brokenhearted and binds up their wounds. It holds together God's cosmic power and His intimate tenderness — He is both infinite and near.",
        keyTermStrongId: "H3068",
        locationName: "Jerusalem",
        timelineEventTitle: null,
        commentatorId: "matthew-henry",
        historicVoiceExcerpt: "He who numbers the stars also numbers the sighs of the afflicted. No wound is too small for His attention, no grief too hidden for His care.",
        reflectionQuestions: [
          "How does it comfort you that the God who counts stars also binds your wounds?",
          "Where in your life do you need God's healing touch right now?",
          "What does this psalm teach about what God delights in — and what He does not?",
          "How can you praise God even in a season of brokenness?"
        ],
        prayerPrompt: "Father, You count the stars and call them by name, yet You also see my brokenness and bind my wounds. Heal my heart today. I bring You my pain, trusting that no grief is too small for Your attention.",
        thenContext: "Psalm 147 was likely composed after the return from Babylonian exile when Jerusalem was being rebuilt. The community carried deep wounds from decades of displacement. The psalmist celebrates a God who rebuilds cities and heals hearts simultaneously.",
        nowApplication: "This psalm bridges the gap between theology and therapy. The God of infinite power is also the God of intimate care. He does not merely observe our pain — He actively heals. And He delights not in human strength but in those who hope in His love.",
      },
      {
        dayNumber: 5,
        title: "Where Can I Go from Your Spirit?",
        bookId: 19,
        chapter: 139,
        verseStart: 1,
        verseEnd: 18,
        passageLabel: "Psalm 139:1-18",
        contextNote: "David reflects on God's omniscience and omnipresence — He knows every thought, word, and movement before it happens. There is nowhere to flee from God's Spirit. David concludes that he is 'fearfully and wonderfully made,' known completely and loved entirely.",
        keyTermStrongId: "H3045",
        locationName: null,
        timelineEventTitle: null,
        commentatorId: "jfb",
        historicVoiceExcerpt: "The psalmist does not shrink from being fully known by God — because to be known by the All-Knowing is to be known by the All-Loving.",
        reflectionQuestions: [
          "Does the idea that God knows everything about you bring comfort or discomfort? Why?",
          "What does it mean to be 'fearfully and wonderfully made'?",
          "Where have you tried to flee from God's presence, and how did He meet you there?",
          "How do God's thoughts toward you outnumber the grains of sand?"
        ],
        prayerPrompt: "Lord, You have searched me and known me completely — every thought, every word, every hidden place. And still You love me. Thank You that I am fearfully and wonderfully made. Help me to live in the reality that I am fully known and fully loved.",
        thenContext: "David wrote as a man who had experienced both the heights of divine favor and the depths of personal failure. Psalm 139 is not the prayer of a perfect person but of one who has learned that God's knowledge is not surveillance but intimate love.",
        nowApplication: "In an age of privacy anxiety and curated identities, Psalm 139 offers a radical alternative: being fully known by God and finding it to be a gift, not a threat. His omniscience is paired with love — He knows everything and loves completely.",
      },
    ],
  },
];

// ─── Importable data-only function ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedDevotionals(db: NodePgDatabase<any>): Promise<void> {
  console.log("Seeding devotional plans and days...");

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
      .select({ id: devotionalPlans.id })
      .from(devotionalPlans)
      .where(eq(devotionalPlans.title, plan.title))
      .limit(1);

    let planId: string;

    if (existingPlan.length) {
      planId = existingPlan[0].id;
      console.log(`  Plan "${plan.title}" already exists (id=${planId}), checking days...`);
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
          // Publishing requires a separate, explicit human-curation decision.
          isPublished: false,
          provenance: "legacy_unclassified",
        })
        .returning({ id: devotionalPlans.id });

      planId = inserted[0].id;
      console.log(`  Inserted plan: "${plan.title}" (id=${planId})`);
    }

    // Partial repair: check which days already exist, insert only missing ones
    const existingDays = await db
      .select({ dayNumber: devotionalDays.dayNumber })
      .from(devotionalDays)
      .where(eq(devotionalDays.planId, planId));
    const existingDayNumbers = new Set(existingDays.map((d) => d.dayNumber));

    for (const day of plan.days) {
      if (existingDayNumbers.has(day.dayNumber)) {
        continue; // already present — idempotent skip
      }

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

  console.log("\nDevotional seeding complete.");
}

// ─── Optional CLI wrapper ─────────────────────────────────────────────────────

async function runCli() {
  const { drizzle: drizzleConnect } = await import("drizzle-orm/node-postgres");
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  const cliDb = drizzleConnect(pool);
  try {
    await seedDevotionals(cliDb);
  } finally {
    await pool.end();
  }
}

// Detect direct execution (tsx scripts/seed-devotionals.ts)
const isMain = process.argv[1] != null &&
  (process.argv[1].endsWith("/seed-devotionals.ts") ||
   process.argv[1].endsWith("\\seed-devotionals.ts"));
if (isMain) {
  runCli().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
