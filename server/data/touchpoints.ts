export interface TouchPointQuestion {
  id: string;
  question: string;
  verses: { ref: string }[];
  commentary: string;
}

export interface TouchPointResource {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationMinutes: number;
}

export interface TouchPointTopic {
  id: string;
  title: string;
  category: string;
  overview: string;
  questions: TouchPointQuestion[];
  resources?: TouchPointResource[];
}

export const TOUCHPOINT_CATEGORIES = [
  "Emotions & Struggles",
  "Relationships",
  "Faith & Belief",
  "Character & Growth",
  "Life Circumstances",
  "God's Nature",
  "Spiritual Practices",
  "Social & Moral Issues",
  "Adventist Doctrines",
];

export const TOUCHPOINTS_DATA: TouchPointTopic[] = [
  {
    id: "abandonment",
    title: "Abandonment",
    category: "Emotions & Struggles",
    overview: "One of our greatest fears is losing a deeply cherished relationship. Whether by abandonment, rejection, death, or divorce, we fear losing the people we care deeply about. Sometimes being abandoned can seriously undermine our sense of self-worth. However, no matter how often people hurt us, reject us, or abandon us, our loving God always remains faithful. We are his precious children, and even when others abandon us, he will never leave us. Like the lost sheep or the prodigal son, when we feel most abandoned, we can find comfort and hope in his loving presence.",
    questions: [
      {
        id: "abandonment-1",
        question: "Is it my fault that I have been abandoned? Is there something wrong with me?",
        verses: [
          { ref: "Psalm 27:10" },
          { ref: "Isaiah 49:15-16" },
        ],
        commentary: "Abandonment is never a reflection of your worth in God's eyes. While human relationships can fail, God's love for you is unconditional and permanent. He has engraved you on the palms of His hands — you are always on His mind and in His care. Your value comes from being created in God's image, not from the actions of others.",
      },
      {
        id: "abandonment-2",
        question: "How can I heal from my abandonment?",
        verses: [
          { ref: "Psalm 34:18" },
          { ref: "Psalm 147:3" },
          { ref: "2 Corinthians 1:3-4" },
        ],
        commentary: "Healing begins when we bring our pain to God rather than hiding it. He specializes in mending broken hearts. The process takes time, but God promises to be near you in your darkest moments. As you experience His comfort, you gain the ability to help others who face similar pain — your wound becomes your ministry.",
      },
      {
        id: "abandonment-3",
        question: "Is there a difference between rejection, betrayal, and abandonment?",
        verses: [
          { ref: "Matthew 12:23-24" },
          { ref: "Mark 14:10-11" },
          { ref: "Mark 14:43-50" },
        ],
        commentary: "Jesus experienced all three forms of relational pain. The Pharisees rejected Him — refusing to accept who He was. Judas betrayed Him — deliberately turning against someone who had trusted him. The disciples abandoned Him — fleeing when things got difficult. Jesus understands every form of relational hurt you experience because He endured them all. In His resurrection, He showed that no rejection, betrayal, or abandonment has the final word.",
      },
      {
        id: "abandonment-4",
        question: "Where is God during my difficult times?",
        verses: [
          { ref: "Deuteronomy 31:8" },
          { ref: "Psalm 23:4" },
          { ref: "Romans 8:38-39" },
        ],
        commentary: "God is not distant during your suffering — He is closer than ever. The darkest valleys are where His presence becomes most real. Nothing in all creation has the power to separate you from His love. When you cannot feel Him, remember that feelings are not facts. His promise stands: He will never leave you or forsake you.",
      },
      {
        id: "abandonment-5",
        question: "Other people have abandoned me — why hasn't God?",
        verses: [
          { ref: "Lamentations 3:22-23" },
          { ref: "Hebrews 13:5" },
        ],
        commentary: "Human love is conditional and limited. God's love is unconditional and inexhaustible. People abandon because of their own brokenness, selfishness, or weakness. God cannot abandon you because faithfulness is central to His very nature. Every morning His mercies are renewed — not because you earned them, but because He is who He is.",
      },
      {
        id: "abandonment-6",
        question: "In what circumstances might God abandon me?",
        verses: [
          { ref: "Romans 8:1" },
          { ref: "John 6:37" },
        ],
        commentary: "The simple and beautiful answer is: none. God will never abandon you. There is no sin so great, no failure so deep, no wandering so far that it can exhaust God's grace. While we may walk away from Him, He never walks away from us. Like the father in the prodigal son story, He watches for our return with open arms.",
      },
      {
        id: "abandonment-7",
        question: "Promises from God",
        verses: [
          { ref: "Isaiah 41:10" },
          { ref: "Matthew 28:20" },
          { ref: "Joshua 1:9" },
        ],
        commentary: "These are not empty words — they are covenant promises from the God who created the universe. When Jesus said 'I am with you always,' He meant it without exception. When you feel abandoned by the world, stand on these promises. Speak them out loud. Write them on your heart. Let them be the foundation when everything else feels uncertain.",
      },
    ],
  },
  {
    id: "addiction",
    title: "Addiction",
    category: "Emotions & Struggles",
    overview: "Addiction is a powerful force that can control our thoughts, actions, and relationships. Whether it's substance abuse, pornography, gambling, or any compulsive behavior, addiction promises freedom but delivers slavery. The good news is that God specializes in setting captives free. Through His power, honest community, and daily dependence on Him, chains can be broken. Recovery is not about willpower alone — it's about surrendering to a power greater than our weakness.",
    questions: [
      {
        id: "addiction-1",
        question: "Can God really free me from my addiction?",
        verses: [
          { ref: "John 8:36" },
          { ref: "2 Corinthians 5:17" },
          { ref: "Philippians 4:13" },
        ],
        commentary: "Absolutely. God's power is greater than any addiction. Freedom may come as a sudden breakthrough or as a gradual journey, but God's promise is clear: He can make you new. This doesn't mean temptation disappears, but His strength becomes available to you moment by moment.",
      },
      {
        id: "addiction-2",
        question: "Why do I keep falling back into the same patterns?",
        verses: [
          { ref: "Romans 7:19" },
          { ref: "Galatians 5:17" },
          { ref: "1 John 1:9" },
        ],
        commentary: "Paul himself described this very struggle. Relapse doesn't mean failure — it means you're in a battle. Each time you fall, God's grace meets you right there. Don't let shame keep you from returning to Him. Confession and community break the cycle of secrecy that feeds addiction.",
      },
      {
        id: "addiction-3",
        question: "How can I find the strength to overcome?",
        verses: [
          { ref: "2 Corinthians 12:9" },
          { ref: "James 5:16" },
          { ref: "Psalm 119:11" },
        ],
        commentary: "Three keys: First, admit your weakness — God's power shows up when you stop pretending you can do it alone. Second, bring others into your struggle through trusted fellowship. Third, fill your mind with Scripture so that when temptation comes, truth is ready. Recovery is a daily choice empowered by God's daily grace.",
      },
      {
        id: "addiction-4",
        question: "Does God still love me even though I struggle?",
        verses: [
          { ref: "Romans 5:8" },
          { ref: "Romans 8:1" },
        ],
        commentary: "God loved you at your very worst. His love is not based on your performance — it's based on His character. Your struggle does not diminish His affection for you. He is not standing over you with disappointment; He is beside you with compassion, ready to help you take the next step forward.",
      },
    ],
  },
  {
    id: "anger",
    title: "Anger",
    category: "Emotions & Struggles",
    overview: "Anger is a powerful emotion that, when unchecked, can destroy relationships, damage our witness, and harm our own souls. Yet anger itself is not always sinful — even Jesus expressed righteous anger at injustice. The key is what we do with our anger. God calls us to be slow to anger, to process it honestly, and to seek resolution rather than revenge. When channeled properly, anger at injustice can motivate positive change.",
    questions: [
      {
        id: "anger-1",
        question: "Is it a sin to be angry?",
        verses: [
          { ref: "Ephesians 4:26-27" },
          { ref: "James 1:19-20" },
        ],
        commentary: "Feeling anger is not sinful — it's a natural human emotion that even God experiences. The sin comes when anger controls us rather than us controlling it. Paul's instruction is practical: deal with anger quickly, don't let it fester overnight, and don't let it become a tool the enemy uses against you.",
      },
      {
        id: "anger-2",
        question: "How can I control my temper?",
        verses: [
          { ref: "Proverbs 15:1" },
          { ref: "Proverbs 29:11" },
          { ref: "Galatians 5:22-23" },
        ],
        commentary: "Self-control is a fruit of the Spirit, not just a skill to develop. Ask God daily for His Spirit to produce patience in you. When anger rises, pause before responding. A soft word has remarkable power to defuse conflict. The wisest people aren't those who never feel anger — they're the ones who choose how to respond to it.",
      },
      {
        id: "anger-3",
        question: "What should I do when I am angry at God?",
        verses: [
          { ref: "Psalm 13:1-2" },
          { ref: "Psalm 62:8" },
        ],
        commentary: "Being honest with God about your anger is not disrespectful — it's an act of faith. The psalmists poured out raw emotions before God regularly. He can handle your anger. What He doesn't want is for you to shut Him out. Bring your frustration to Him honestly, and trust that He is big enough to receive it and loving enough to respond.",
      },
    ],
  },
  {
    id: "anxiety",
    title: "Anxiety & Worry",
    category: "Emotions & Struggles",
    overview: "Anxiety touches nearly every person at some point. The churning stomach, racing thoughts, and sleepless nights can feel overwhelming. While Scripture doesn't dismiss anxiety as trivial, it offers a powerful alternative: bringing our fears to God and receiving His peace in return. Jesus Himself told us not to worry, not because our concerns are unimportant, but because our Father already knows what we need.",
    questions: [
      {
        id: "anxiety-1",
        question: "What does God say about my anxiety?",
        verses: [
          { ref: "Philippians 4:6-7" },
          { ref: "Matthew 6:25-27" },
          { ref: "1 Peter 5:7" },
        ],
        commentary: "God doesn't scold you for feeling anxious — He invites you to bring your anxiety to Him. The antidote to worry is prayer combined with thanksgiving. When you turn your worries into prayers, something supernatural happens: a peace that defies logic settles over your heart. You are far more valuable to God than the birds He faithfully feeds every day.",
      },
      {
        id: "anxiety-2",
        question: "How can I find peace when everything feels uncertain?",
        verses: [
          { ref: "Isaiah 26:3" },
          { ref: "Psalm 46:1-2" },
          { ref: "John 14:27" },
        ],
        commentary: "Peace doesn't come from controlling your circumstances — it comes from trusting the One who controls all things. Fix your mind on God's character: His faithfulness, His sovereignty, His love for you. The peace Jesus gives is different from the world's peace. It doesn't depend on things going well; it holds steady even when everything shakes.",
      },
      {
        id: "anxiety-3",
        question: "Is it wrong to seek professional help for anxiety?",
        verses: [
          { ref: "Proverbs 11:14" },
          { ref: "Proverbs 12:15" },
        ],
        commentary: "Seeking help is not a lack of faith — it's an act of wisdom. God works through counselors, therapists, and doctors just as He works through prayer and Scripture. Mental health challenges deserve professional attention alongside spiritual care. There is no shame in getting help; it takes courage and humility to reach out.",
      },
    ],
  },
  {
    id: "forgiveness",
    title: "Forgiveness",
    category: "Relationships",
    overview: "Forgiveness is at the heart of the Christian faith. God's forgiveness of our sins through Christ is the foundation of our relationship with Him, and it becomes the model for how we forgive others. Forgiveness doesn't mean excusing wrong behavior or pretending it didn't hurt. It means releasing the debt and entrusting justice to God. When we forgive, we are set free from the prison of bitterness.",
    questions: [
      {
        id: "forgiveness-1",
        question: "Why should I forgive someone who hurt me deeply?",
        verses: [
          { ref: "Ephesians 4:32" },
          { ref: "Matthew 6:14-15" },
          { ref: "Colossians 3:13" },
        ],
        commentary: "We forgive because we have been forgiven. When we consider the magnitude of what God has forgiven us, forgiving others becomes not just duty but gratitude. Unforgiveness is like drinking poison and expecting the other person to get sick — it hurts you more than anyone. Forgiveness sets you free.",
      },
      {
        id: "forgiveness-2",
        question: "How can I forgive when I still feel the pain?",
        verses: [
          { ref: "Mark 11:25" },
          { ref: "Luke 23:34" },
        ],
        commentary: "Forgiveness is a decision, not a feeling. You may need to choose forgiveness daily — even hourly — until your emotions catch up with your choice. Jesus forgave from the cross while in excruciating pain. He didn't wait until He felt like it. Start by telling God you're willing to forgive, and ask Him to help you follow through.",
      },
      {
        id: "forgiveness-3",
        question: "Does forgiving mean I have to trust the person again?",
        verses: [
          { ref: "Proverbs 4:23" },
          { ref: "Matthew 10:16" },
        ],
        commentary: "Forgiveness and trust are not the same thing. Forgiveness is given freely; trust must be earned over time. You can forgive someone completely and still set healthy boundaries. Wisdom and forgiveness are not enemies — they work together. Forgive generously, but protect yourself wisely.",
      },
    ],
  },
  {
    id: "grief",
    title: "Grief & Loss",
    category: "Emotions & Struggles",
    overview: "Grief is the natural response to loss, whether the death of a loved one, the end of a relationship, the loss of health, or shattered dreams. God does not expect us to grieve with stoic composure. Jesus Himself wept at the tomb of Lazarus. In our sorrow, God draws near with comfort, hope, and the assurance that death and loss are not the final chapter. For those who trust in Christ, there is a reunion coming.",
    questions: [
      {
        id: "grief-1",
        question: "How can I cope with the death of a loved one?",
        verses: [
          { ref: "1 Thessalonians 4:13-14" },
          { ref: "Revelation 21:4" },
        ],
        commentary: "Christians grieve, but not without hope. The promise of resurrection means that death is not goodbye forever — it is 'see you later.' Let yourself grieve fully; don't rush the process. But lift your eyes to the hope that one day every tear will be wiped away and you will be reunited with those who trusted in Christ.",
      },
      {
        id: "grief-2",
        question: "Is it okay to question God in my grief?",
        verses: [
          { ref: "Psalm 88:1-2" },
          { ref: "Job 3:11" },
        ],
        commentary: "Job asked some of the most honest questions in all of Scripture — and God honored his honesty. The Psalms are filled with raw cries of 'why?' and 'how long?' Questioning God is not the same as rejecting God. Bring your questions to Him. He is not offended by your honesty; He is honored by your trust.",
      },
    ],
  },
  {
    id: "loneliness",
    title: "Loneliness",
    category: "Emotions & Struggles",
    overview: "Loneliness can strike even in a crowded room. It's the ache of feeling disconnected, unseen, or unknown. God designed us for relationship — first with Him, then with others. When loneliness overwhelms us, it's often an invitation to deepen our relationship with God and to take brave steps toward genuine community. You are never truly alone, because the God who made you has promised never to leave your side.",
    questions: [
      {
        id: "loneliness-1",
        question: "Does God see me in my loneliness?",
        verses: [
          { ref: "Psalm 139:1-4" },
          { ref: "Genesis 16:13" },
        ],
        commentary: "Hagar, alone in the desert and pregnant, discovered that God saw her in her loneliest moment. She called Him 'El Roi' — the God who sees. He sees you too. Every silent tear, every sleepless night, every moment you feel invisible — God is watching over you with tender care. You are fully known and deeply loved.",
      },
      {
        id: "loneliness-2",
        question: "How can I find genuine community?",
        verses: [
          { ref: "Hebrews 10:24-25" },
          { ref: "Ecclesiastes 4:9-10" },
        ],
        commentary: "Deep relationships don't happen by accident — they require intentional effort and vulnerability. Start by showing up consistently at church, a small group, or a service opportunity. Be the kind of friend you wish you had. Authentic community is built through shared experiences, honest conversations, and consistent presence over time.",
      },
    ],
  },
  {
    id: "purpose",
    title: "Purpose & Meaning",
    category: "Faith & Belief",
    overview: "Every human heart asks: 'Why am I here?' God created each person with intention, purpose, and a unique contribution to make. Your purpose is not random — it was designed before you were born. While the specifics unfold over time, the foundation is clear: to know God, to glorify Him, and to serve others with the gifts He has given you. Purpose is not found in achievement but in alignment with God's will.",
    questions: [
      {
        id: "purpose-1",
        question: "Does God have a specific plan for my life?",
        verses: [
          { ref: "Jeremiah 29:11" },
          { ref: "Ephesians 2:10" },
          { ref: "Psalm 139:16" },
        ],
        commentary: "God is not indifferent to the details of your life. He has specific good works prepared for you to walk in. You are His masterpiece — a one-of-a-kind creation with a one-of-a-kind calling. The adventure of faith is discovering what He has already prepared for you and stepping into it with courage.",
      },
      {
        id: "purpose-2",
        question: "How do I discover my calling?",
        verses: [
          { ref: "Proverbs 3:5-6" },
          { ref: "Romans 12:6-8" },
          { ref: "Micah 6:8" },
        ],
        commentary: "Your calling is found at the intersection of your gifts, your passions, the world's needs, and God's direction. Start with faithfulness in what's right in front of you. Pay attention to what energizes you and where you see God's fruit in your efforts. Calling unfolds as you walk — you don't need to see the whole path to take the next step.",
      },
    ],
  },
  {
    id: "fear",
    title: "Fear",
    category: "Emotions & Struggles",
    overview: "Fear is one of the most common human experiences and one of the most frequently addressed topics in Scripture. 'Do not fear' appears hundreds of times in the Bible — not because our fears are silly, but because God wants us to know He is greater than anything we face. Fear is natural, but faith calls us to act despite our fears, trusting that God goes before us.",
    questions: [
      {
        id: "fear-1",
        question: "How can I overcome my fears?",
        verses: [
          { ref: "2 Timothy 1:7" },
          { ref: "Isaiah 41:10" },
          { ref: "Psalm 56:3" },
        ],
        commentary: "Courage is not the absence of fear — it's choosing to trust God in the midst of it. The psalmist didn't say 'I'm never afraid.' He said 'When I am afraid, I will trust.' Start there. Acknowledge your fear honestly, then choose trust. God promises His power, His presence, and His help — that's more than enough.",
      },
      {
        id: "fear-2",
        question: "What about the fear of death?",
        verses: [
          { ref: "Psalm 23:4" },
          { ref: "1 Corinthians 15:55-57" },
        ],
        commentary: "For the believer, death has lost its sting. Jesus conquered death through His resurrection, and He promises that same victory to all who trust in Him. Death is not the end — it's a doorway to eternal life with God. This hope doesn't eliminate the natural sadness of death, but it removes its ultimate terror.",
      },
    ],
  },
  {
    id: "marriage",
    title: "Marriage",
    category: "Relationships",
    overview: "Marriage is God's idea — a beautiful covenant designed to reflect Christ's love for His church. It requires sacrifice, patience, communication, and daily choices to love even when feelings fluctuate. A Christ-centered marriage is built on mutual submission, unconditional love, and the shared pursuit of God's purposes. No marriage is perfect, but every marriage can grow stronger with God at the center.",
    questions: [
      {
        id: "marriage-1",
        question: "What is God's design for marriage?",
        verses: [
          { ref: "Genesis 2:24" },
          { ref: "Ephesians 5:25-28" },
        ],
        commentary: "Marriage is a covenant of self-giving love that mirrors Christ's relationship with the church. It's designed to be a place of deep intimacy, mutual support, and shared mission. God's design is not about power or control but about sacrificial love that puts the other person's needs alongside your own.",
      },
      {
        id: "marriage-2",
        question: "How do we handle conflict in marriage?",
        verses: [
          { ref: "Ephesians 4:26-27" },
          { ref: "Proverbs 15:1" },
          { ref: "1 Peter 4:8" },
        ],
        commentary: "Conflict is inevitable in marriage; contempt is optional. Address issues quickly and gently. Listen more than you speak. Choose soft words over sharp ones. And remember that you're on the same team — the goal is resolution, not victory. Love has the power to cover mistakes and create space for growth.",
      },
    ],
  },
  {
    id: "patience",
    title: "Patience",
    category: "Character & Growth",
    overview: "In a world of instant gratification, patience feels almost countercultural. Yet God consistently calls His people to wait on Him, trust His timing, and endure with steadfastness. Patience is not passive resignation — it's active trust that God is working even when we can't see it. The most beautiful things in life — deep relationships, spiritual maturity, answered prayer — often require the most patience.",
    questions: [
      {
        id: "patience-1",
        question: "How can I wait on God's timing?",
        verses: [
          { ref: "Psalm 27:14" },
          { ref: "Isaiah 40:31" },
          { ref: "Habakkuk 2:3" },
        ],
        commentary: "Waiting on God is not wasted time — it's formation time. While you wait, God is preparing both the blessing and you for each other. The eagle doesn't flap frantically; it waits for the right wind current and then soars effortlessly. Trust that God's timing is perfect, even when your patience is tested.",
      },
    ],
  },
  {
    id: "temptation",
    title: "Temptation",
    category: "Character & Growth",
    overview: "Temptation is universal — even Jesus was tempted. Being tempted is not sin; yielding to temptation is. God promises that no temptation is beyond what we can bear, and He always provides a way of escape. The key is recognizing temptation early, fleeing from it decisively, and relying on God's strength rather than our own willpower.",
    questions: [
      {
        id: "temptation-1",
        question: "How can I resist temptation?",
        verses: [
          { ref: "1 Corinthians 10:13" },
          { ref: "James 4:7" },
          { ref: "Matthew 4:4" },
        ],
        commentary: "Jesus resisted temptation with Scripture. When the devil attacked, Jesus responded with 'It is written.' Fill your mind with God's Word so that truth is ready when temptation strikes. God always provides an exit — your job is to look for it and take it, even when the temptation feels overwhelming.",
      },
    ],
  },
  {
    id: "suffering",
    title: "Suffering & Trials",
    category: "Life Circumstances",
    overview: "Suffering is one of life's most profound mysteries. Why does a loving God allow pain? While we may not fully understand God's purposes in suffering, Scripture reveals that trials refine our faith, deepen our dependence on God, and produce perseverance and character. Jesus Himself suffered, so He understands our pain intimately. In our darkest moments, He walks with us and promises to bring beauty from ashes.",
    questions: [
      {
        id: "suffering-1",
        question: "Why does God allow suffering?",
        verses: [
          { ref: "Romans 8:28" },
          { ref: "James 1:2-4" },
          { ref: "2 Corinthians 4:17" },
        ],
        commentary: "God doesn't waste pain. Every trial is an opportunity for faith to grow deeper and stronger. This doesn't mean suffering is good — it means God can bring good from it. The perspective of eternity helps: our present troubles, though real and painful, are producing an eternal weight of glory that far exceeds the cost.",
      },
      {
        id: "suffering-2",
        question: "How can I endure my current trial?",
        verses: [
          { ref: "Hebrews 12:1-2" },
          { ref: "Psalm 34:17-19" },
        ],
        commentary: "Fix your eyes on Jesus — He endured the cross for the joy set before Him. He understands suffering from the inside. Call out to Him; He promises to hear. Surround yourself with believers who will pray with you and carry your burden alongside you. You don't have to endure alone.",
      },
    ],
  },
  {
    id: "gratitude",
    title: "Gratitude & Thankfulness",
    category: "Spiritual Practices",
    overview: "Gratitude is not just polite; it's transformative. When we choose thankfulness, our perspective shifts from what we lack to what we have. The Bible commands thanksgiving not because God needs our praise, but because gratitude aligns our hearts with reality — the reality that God is good and that every good gift comes from His hand.",
    questions: [
      {
        id: "gratitude-1",
        question: "Why is gratitude so important to God?",
        verses: [
          { ref: "1 Thessalonians 5:18" },
          { ref: "Psalm 100:4" },
          { ref: "Colossians 3:15-17" },
        ],
        commentary: "Gratitude is the antidote to entitlement, anxiety, and discontent. When Paul said to be thankful 'in all circumstances,' he wasn't asking us to be thankful for suffering, but to find reasons for gratitude even amid difficulty. Thanksgiving is the gateway to God's presence and the foundation of a joy-filled life.",
      },
    ],
  },
  {
    id: "prayer",
    title: "Prayer",
    category: "Spiritual Practices",
    overview: "Prayer is conversation with God — the most powerful activity available to any human being. It's not about using the right words or following a formula. It's about honest, heartfelt communication with a loving Father who delights in hearing from His children. Through prayer, we access God's power, align our hearts with His will, and experience His presence in intimate ways.",
    questions: [
      {
        id: "prayer-1",
        question: "How should I pray?",
        verses: [
          { ref: "Matthew 6:9-13" },
          { ref: "Romans 8:26" },
        ],
        commentary: "Jesus gave us a model prayer that covers worship, submission, provision, forgiveness, and protection. But prayer is not about perfection — even when you don't know what to say, the Holy Spirit intercedes for you. Simply start talking to God like you would a trusted friend. He's listening.",
      },
      {
        id: "prayer-2",
        question: "Does God always answer prayer?",
        verses: [
          { ref: "1 John 5:14-15" },
          { ref: "2 Corinthians 12:8-9" },
        ],
        commentary: "God always answers prayer, but not always with the answer we want. Sometimes He says yes, sometimes no, and sometimes wait. Paul prayed three times for relief, and God's answer was 'My grace is sufficient.' Trust that God's answers are always rooted in His love and wisdom, even when they surprise or disappoint you.",
      },
    ],
  },
  {
    id: "identity",
    title: "Identity in Christ",
    category: "Faith & Belief",
    overview: "In a world that defines us by our achievements, appearance, or social status, God offers a radically different identity. In Christ, you are chosen, forgiven, adopted, and beloved. Your worth is not determined by what you do but by whose you are. Understanding your identity in Christ changes everything — how you see yourself, how you treat others, and how you face the world.",
    questions: [
      {
        id: "identity-1",
        question: "Who am I in Christ?",
        verses: [
          { ref: "2 Corinthians 5:17" },
          { ref: "1 Peter 2:9" },
          { ref: "Ephesians 1:4-5" },
        ],
        commentary: "You are not defined by your past, your mistakes, or the world's labels. In Christ, you are a new creation. You are chosen — picked intentionally. You are royal — dignified and valued. You are adopted — belonging to God's own family. Let these truths sink deep into your heart and reshape how you see yourself.",
      },
    ],
  },
  {
    id: "contentment",
    title: "Contentment",
    category: "Character & Growth",
    overview: "Contentment is the secret to a peaceful life. It doesn't mean having no ambition or accepting injustice — it means finding satisfaction in God regardless of circumstances. Paul learned to be content in prison, in plenty, and in want. True contentment comes not from having everything we want, but from wanting the one thing that truly satisfies: a relationship with God.",
    questions: [
      {
        id: "contentment-1",
        question: "How can I be content with what I have?",
        verses: [
          { ref: "Philippians 4:11-13" },
          { ref: "Hebrews 13:5" },
          { ref: "1 Timothy 6:6-8" },
        ],
        commentary: "Contentment is learned, not inherited. Paul said 'I have learned' — it was a process. The secret? Christ's strength. When your deepest satisfaction comes from your relationship with God, external circumstances lose their power over your peace. This doesn't happen overnight, but it grows as you practice gratitude and trust daily.",
      },
    ],
  },
  {
    id: "integrity",
    title: "Integrity & Honesty",
    category: "Character & Growth",
    overview: "Integrity means being the same person in private as you are in public. It's about honesty, consistency, and doing the right thing even when no one is watching. God values integrity because it reflects His own character — He is truth itself. A life of integrity builds trust, honors God, and gives you the peace of a clear conscience.",
    questions: [
      {
        id: "integrity-1",
        question: "Why does integrity matter to God?",
        verses: [
          { ref: "Proverbs 10:9" },
          { ref: "Proverbs 11:3" },
          { ref: "Luke 16:10" },
        ],
        commentary: "Integrity matters because it shapes your character and your influence. Small choices of honesty compound into a life of trustworthiness. God rewards faithfulness in the small things with greater opportunities. Your reputation is built one honest decision at a time.",
      },
    ],
  },
  {
    id: "doubt",
    title: "Doubt & Faith",
    category: "Faith & Belief",
    overview: "Doubt is not the opposite of faith — it's often the companion of faith. Even great heroes of faith like Thomas, John the Baptist, and David had moments of doubt. God is not threatened by your questions. He invites honest wrestling. Doubt can become the doorway to deeper faith when we bring our questions to God rather than walking away from Him.",
    questions: [
      {
        id: "doubt-1",
        question: "Is it okay to have doubts about God?",
        verses: [
          { ref: "Mark 9:24" },
          { ref: "Jude 1:22" },
          { ref: "Psalm 13:1-2" },
        ],
        commentary: "The father in Mark 9 gave us one of the most honest prayers in Scripture: 'I believe; help my unbelief.' That's a prayer God always answers. Doubt doesn't disqualify you from faith — it's often the sign that your faith is growing, pushing past easy answers into deeper trust. Bring your doubts to God. He can handle them.",
      },
    ],
  },
  {
    id: "generosity",
    title: "Generosity & Giving",
    category: "Spiritual Practices",
    overview: "Generosity is the heartbeat of the gospel. God gave His best — His Son — for us. When we give generously, we reflect His character and participate in His mission. Generosity isn't just about money; it's about sharing our time, talents, and treasure freely. The generous person discovers a paradox: the more they give, the richer they become in what truly matters.",
    questions: [
      {
        id: "generosity-1",
        question: "Why should I give generously?",
        verses: [
          { ref: "2 Corinthians 9:6-7" },
          { ref: "Luke 6:38" },
          { ref: "Proverbs 11:25" },
        ],
        commentary: "Generosity breaks the grip of materialism and aligns our hearts with God's heart. When you give cheerfully, something shifts in your soul — you move from scarcity thinking to abundance thinking. God promises that generosity creates a cycle of blessing: as you refresh others, you yourself are refreshed.",
      },
    ],
    resources: [
      { videoId: "62CliEkRCso", title: "This Lie Can Keep You From Living Generously", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/62CliEkRCso/maxresdefault.jpg", durationMinutes: 5 },
      { videoId: "vajA7LgeZaA", title: "Do Christians Need to Tithe?", channelName: "Amazing Facts", thumbnailUrl: "https://img.youtube.com/vi/vajA7LgeZaA/maxresdefault.jpg", durationMinutes: 8 },
      { videoId: "4aaurIWC4N4", title: "Should Christians Tithe?", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/4aaurIWC4N4/maxresdefault.jpg", durationMinutes: 58 },
      { videoId: "NxLPhw5NUSA", title: "The Tithing Blessing", channelName: "Hope Channel", thumbnailUrl: "https://img.youtube.com/vi/NxLPhw5NUSA/maxresdefault.jpg", durationMinutes: 59 },
    ],
  },
  {
    id: "depression",
    title: "Depression",
    category: "Emotions & Struggles",
    overview: "Depression is more than sadness — it's a heaviness that can cloud every aspect of life. Even great people of faith like Elijah, David, and Jeremiah experienced deep depression. God does not shame you for feeling low; He meets you in the darkness with compassion. Healing may come through prayer, community, professional help, or a combination of all three.",
    questions: [
      {
        id: "depression-1",
        question: "Does God understand my depression?",
        verses: [
          { ref: "Psalm 42:11" },
          { ref: "1 Kings 19:4-5" },
          { ref: "Isaiah 53:3" },
        ],
        commentary: "Jesus was described as 'a man of sorrows, acquainted with deepest grief.' He understands depression from the inside. When Elijah was so depressed he wanted to die, God didn't lecture him — He let him sleep, fed him, and gently guided him forward. God responds to your depression with compassion, not criticism.",
      },
    ],
  },
  {
    id: "trust",
    title: "Trust in God",
    category: "Faith & Belief",
    overview: "Trust is the foundation of the Christian life. It's choosing to believe that God is who He says He is and will do what He says He will do, even when circumstances suggest otherwise. Trust grows through experience — each time God proves faithful, our confidence in Him deepens. The invitation is not blind trust but informed trust, based on God's proven track record throughout Scripture and in our own lives.",
    questions: [
      {
        id: "trust-1",
        question: "How can I trust God when life doesn't make sense?",
        verses: [
          { ref: "Proverbs 3:5-6" },
          { ref: "Isaiah 55:8-9" },
          { ref: "Romans 11:33" },
        ],
        commentary: "Trust is hardest when we can't see the reason behind our circumstances. But God sees the full picture when we only see a fragment. His ways are higher than ours — not because He's distant, but because His wisdom encompasses everything. Trust is choosing to believe in His goodness even when His methods are mysterious.",
      },
    ],
  },
  {
    id: "humility",
    title: "Humility",
    category: "Character & Growth",
    overview: "Humility is not thinking less of yourself — it's thinking of yourself less. Jesus, the King of kings, washed His disciples' feet. He demonstrated that true greatness is found in serving, not in being served. Humility opens the door to God's grace, deepens relationships, and positions us for growth. The humble person recognizes that everything good comes from God.",
    questions: [
      {
        id: "humility-1",
        question: "What does true humility look like?",
        verses: [
          { ref: "Philippians 2:3-5" },
          { ref: "James 4:6" },
          { ref: "Micah 6:8" },
        ],
        commentary: "Jesus modelled humility by emptying Himself and taking the form of a servant. Humility is not weakness — it takes incredible strength to put others first. God opposes the proud because pride blocks His grace. But to the humble, He gives grace abundantly. Walk humbly with God, and you'll find His favor flowing into every area of your life.",
      },
    ],
  },
  {
    id: "parenting",
    title: "Parenting",
    category: "Relationships",
    overview: "Parenting is one of the most sacred and challenging responsibilities God gives us. Children are a gift from the Lord, and we are called to nurture them in faith, love, and wisdom. Perfect parenting doesn't exist, but faithful parenting does — showing up daily with patience, prayer, and the willingness to model the love of Christ in our homes.",
    questions: [
      {
        id: "parenting-1",
        question: "How should I raise my children?",
        verses: [
          { ref: "Proverbs 22:6" },
          { ref: "Deuteronomy 6:6-7" },
          { ref: "Ephesians 6:4" },
        ],
        commentary: "Faith is best taught in everyday moments — at meals, during drives, at bedtime. Children learn more from what they see you do than from what they hear you say. Be consistent, be patient, and be present. Don't just teach about God — let your children see you depending on God in real time.",
      },
    ],
  },
  {
    id: "hope",
    title: "Hope",
    category: "Faith & Belief",
    overview: "Hope is the confident expectation that God will fulfill His promises. It's not wishful thinking — it's anchored in the character of God. Biblical hope sustains us through the darkest nights because it looks beyond present circumstances to the certainty of God's faithfulness. When everything else fails, hope in God remains unshakable.",
    questions: [
      {
        id: "hope-1",
        question: "Where can I find hope when everything seems hopeless?",
        verses: [
          { ref: "Romans 15:13" },
          { ref: "Jeremiah 29:11" },
          { ref: "Hebrews 6:19" },
        ],
        commentary: "Hope is described as an anchor for the soul — something that holds you steady when storms rage. God is the source of all genuine hope. When you feel hopeless, turn to His promises and remind yourself of His track record of faithfulness. Hope is not dependent on your circumstances; it's dependent on your God.",
      },
    ],
  },
  {
    id: "sabbath",
    title: "Sabbath Rest",
    category: "Spiritual Practices",
    overview: "The Sabbath is God's gift of rest in a restless world. From creation, God established a rhythm of work and rest, and He invites us into that same pattern. The Sabbath is not about rigid rules — it's about trusting God enough to stop striving and receive His rest. In a culture that glorifies busyness, Sabbath-keeping is a radical act of faith.",
    questions: [
      {
        id: "sabbath-1",
        question: "Why is Sabbath rest important?",
        verses: [
          { ref: "Exodus 20:8-10" },
          { ref: "Mark 2:27" },
          { ref: "Hebrews 4:9-10" },
        ],
        commentary: "The Sabbath declares that your worth is not tied to your productivity. God rested not because He was tired, but to model a rhythm of trust. When you rest on the Sabbath, you're saying, 'God, I trust you enough to stop working and let you provide.' The Sabbath is made for you — a gift of renewal, worship, and connection.",
      },
    ],
  },
  {
    id: "justice",
    title: "Justice & Compassion",
    category: "Social & Moral Issues",
    overview: "God's heart beats for justice. Throughout Scripture, He calls His people to defend the vulnerable, speak for the voiceless, and act with compassion. Biblical justice is not mere punishment — it's the restoration of right relationships and the protection of human dignity. As followers of Christ, we are called to be agents of justice in a broken world.",
    questions: [
      {
        id: "justice-1",
        question: "What does God require of me regarding justice?",
        verses: [
          { ref: "Micah 6:8" },
          { ref: "Isaiah 1:17" },
          { ref: "Proverbs 31:8-9" },
        ],
        commentary: "God's call to justice is not optional — it's central to what it means to follow Him. Justice and mercy walk together. We are called to use our voices, resources, and influence to defend those who cannot defend themselves. Every act of compassion reflects the heart of God to a watching world.",
      },
    ],
  },
  {
    id: "work",
    title: "Work & Vocation",
    category: "Life Circumstances",
    overview: "Work is not a curse — it existed before the Fall. God Himself is a worker, and He created us to find purpose and dignity in meaningful labor. Whatever your vocation, it can be done as an act of worship when you do it with excellence, integrity, and a desire to glorify God. Your workplace is your mission field.",
    questions: [
      {
        id: "work-1",
        question: "How should I approach my work?",
        verses: [
          { ref: "Colossians 3:23-24" },
          { ref: "Proverbs 16:3" },
          { ref: "Ecclesiastes 9:10" },
        ],
        commentary: "When you work as if serving Christ, even mundane tasks take on eternal significance. Your attitude, integrity, and excellence at work are a testimony to everyone around you. Commit your work to God, do it with all your heart, and trust Him with the results.",
      },
    ],
  },
  {
    id: "sanctuary",
    title: "The Sanctuary",
    category: "Adventist Doctrines",
    overview: "The sanctuary doctrine is one of the most distinctive and beautiful truths of the Adventist faith. From the earthly tabernacle built by Moses to the heavenly sanctuary where Christ ministers as our High Priest, the sanctuary reveals God's step-by-step plan to deal with sin and restore humanity to full fellowship with Him. Every piece of furniture, every sacrifice, and every priestly service pointed forward to Jesus — the Lamb who was slain, the Priest who intercedes, and the King who will return. Understanding the sanctuary unlocks the gospel in three dimensions.",
    questions: [
      {
        id: "sanctuary-1",
        question: "What is the sanctuary and why does it matter?",
        verses: [
          { ref: "Exodus 25:8" },
          { ref: "Hebrews 8:1-2" },
        ],
        commentary: "God's deepest desire has always been to dwell with His people. The earthly sanctuary was a shadow of the heavenly reality where Christ now ministers. It matters because it reveals the full scope of salvation — not just forgiveness at the cross, but ongoing intercession and ultimate vindication of God's character.",
      },
      {
        id: "sanctuary-2",
        question: "How does the sanctuary reveal Jesus?",
        verses: [
          { ref: "John 1:29" },
          { ref: "Hebrews 9:11-12" },
          { ref: "John 14:6" },
        ],
        commentary: "Every element of the sanctuary points to Christ. He is the sacrificial Lamb at the altar of burnt offering, the Bread of Life on the table of showbread, the Light of the World on the lampstand, and our Intercessor at the altar of incense. The veil torn at His death opened the way into God's presence for all who believe.",
      },
      {
        id: "sanctuary-3",
        question: "What is Christ doing in the heavenly sanctuary now?",
        verses: [
          { ref: "Hebrews 7:25" },
          { ref: "1 John 2:1" },
          { ref: "Hebrews 4:15-16" },
        ],
        commentary: "Right now, Jesus is not distant or disengaged. He is actively interceding for you in heaven's sanctuary. He applies the merits of His sacrifice to your daily struggles, weaknesses, and failures. Because He was tempted in every way yet without sin, He understands your battles and invites you to come boldly — not timidly — to the throne of grace.",
      },
      {
        id: "sanctuary-4",
        question: "What does the Day of Atonement teach us?",
        verses: [
          { ref: "Leviticus 16:30" },
          { ref: "Daniel 8:14" },
          { ref: "Revelation 14:7" },
        ],
        commentary: "The Day of Atonement was the most solemn day of the Israelite year — a day of cleansing, judgment, and restoration. Adventists understand that since 1844, Christ has been engaged in a final work of atonement in the Most Holy Place of the heavenly sanctuary. This is not about condemnation but about vindicating God's people and demonstrating the fairness of His character before the universe.",
      },
      {
        id: "sanctuary-5",
        question: "How does the sanctuary give me assurance today?",
        verses: [
          { ref: "Hebrews 10:19-22" },
          { ref: "Romans 8:34" },
        ],
        commentary: "The sanctuary is not an abstract doctrine — it is personal assurance. You have an Advocate in heaven's court. When guilt whispers that you are not enough, Jesus holds up nail-scarred hands and says, 'This one is Mine.' The sanctuary tells you that salvation is secure not because of your performance but because of His finished and ongoing work.",
      },
    ],
  },
  {
    id: "second-coming",
    title: "The Second Coming",
    category: "Adventist Doctrines",
    overview: "The second coming of Jesus Christ is the blessed hope of the church — the grand climax of the gospel and the culmination of God's redemptive plan. It will be literal, personal, visible, and worldwide. Every eye will see Him. The dead in Christ will rise, the living righteous will be transformed, and together they will be caught up to meet the Lord. This event is not a metaphor or a spiritual experience — it is a real, physical, glorious return. For Seventh-day Adventists, the second coming is not just a belief; it defines our very name and mission.",
    questions: [
      {
        id: "second-coming-1",
        question: "How do we know Jesus is really coming back?",
        verses: [
          { ref: "John 14:1-3" },
          { ref: "Acts 1:10-11" },
          { ref: "Revelation 22:20" },
        ],
        commentary: "Jesus Himself promised to return. Angels confirmed it. The apostles taught it. Revelation closes with it. The second coming is the most frequently mentioned doctrine in the New Testament. It is not wishful thinking — it is a covenant promise from the One who has never broken a promise.",
      },
      {
        id: "second-coming-2",
        question: "What will the second coming look like?",
        verses: [
          { ref: "Matthew 24:27" },
          { ref: "Revelation 1:7" },
          { ref: "1 Thessalonians 4:16-17" },
        ],
        commentary: "The second coming will be unmistakable. It will be visible like lightning across the sky, audible with shouts and trumpets, and universal — every eye will see Him. There will be no secret about it. Christ will come in blazing glory, surrounded by angels, and the entire earth will witness it. This truth protects us from deceptions that claim He has already come secretly.",
      },
      {
        id: "second-coming-3",
        question: "What are the signs that Jesus is coming soon?",
        verses: [
          { ref: "Matthew 24:6-8" },
          { ref: "2 Timothy 3:1-5" },
          { ref: "Matthew 24:14" },
        ],
        commentary: "Jesus gave us signs not to set dates but to keep us watchful and hopeful. The moral decay, natural disasters, wars, and global proclamation of the gospel we see today all point to His soon return. These signs are not meant to frighten us — they are meant to assure us that God is still in control and that He is keeping His promise.",
      },
      {
        id: "second-coming-4",
        question: "How should I live in light of Christ's return?",
        verses: [
          { ref: "Titus 2:12-13" },
          { ref: "2 Peter 3:11-12" },
        ],
        commentary: "The hope of Christ's return is not an excuse to sit idle — it is the greatest motivation for holy living. When you truly believe Jesus is coming, it changes how you treat people, how you spend your time, and what you prioritise. We are to live with wisdom and devotion, not in fear but in joyful anticipation.",
      },
      {
        id: "second-coming-5",
        question: "What happens to believers when Jesus returns?",
        verses: [
          { ref: "1 Corinthians 15:51-53" },
          { ref: "Philippians 3:20-21" },
        ],
        commentary: "At Christ's return, death is defeated forever. The dead in Christ rise first, then those who are alive are instantly transformed. Our broken, suffering bodies will be exchanged for glorious, immortal ones. Tears, pain, disease, and death will be no more. This is not fantasy — it is the promise of the God who raised Jesus from the dead.",
      },
    ],
  },
  {
    id: "three-angels",
    title: "The Three Angels' Messages",
    category: "Adventist Doctrines",
    overview: "Revelation 14:6-12 contains three urgent messages from heaven delivered by angels flying in mid-heaven — meant for every nation, tribe, language, and people. These messages form the heart of the Adventist mission: calling the world to worship the Creator, announcing the fall of spiritual Babylon, and warning against the mark of the beast. Far from being messages of doom, they are God's final invitation of love and mercy before Jesus returns. They call us back to the everlasting gospel, true worship, and faithful endurance.",
    questions: [
      {
        id: "three-angels-1",
        question: "What is the first angel's message?",
        verses: [
          { ref: "Revelation 14:6-7" },
          { ref: "Ecclesiastes 12:13" },
        ],
        commentary: "The first angel proclaims the everlasting gospel and calls every human to worship God as Creator. In an age of evolution and secularism, this is a radical declaration: there IS a Creator, and He deserves our reverence. The language echoes the fourth commandment — Sabbath keeping is an act of acknowledging God as the One who made all things. The hour of judgment has arrived, and the invitation is urgent but gracious.",
      },
      {
        id: "three-angels-2",
        question: "What is the second angel's message?",
        verses: [
          { ref: "Revelation 14:8" },
          { ref: "Revelation 18:4" },
        ],
        commentary: "Babylon represents religious confusion and false teachings that have led people away from biblical truth. The second angel declares that these systems of error are collapsing. God lovingly calls His people out of confusion and back to His Word. This is not an attack on sincere believers in other traditions — it is a call to examine every teaching by Scripture alone.",
      },
      {
        id: "three-angels-3",
        question: "What is the third angel's message?",
        verses: [
          { ref: "Revelation 14:9-10" },
          { ref: "Revelation 14:12" },
        ],
        commentary: "The third angel warns against compromising with false worship systems. The mark of the beast is not a barcode or a microchip — it represents a choice to follow human authority over God's authority. Those who remain faithful are characterised by two things: they keep God's commandments and they hold to the faith of Jesus. Obedience and trust in Christ go hand in hand.",
      },
      {
        id: "three-angels-4",
        question: "Why are these messages relevant today?",
        verses: [
          { ref: "Matthew 24:24" },
          { ref: "2 Thessalonians 2:9-10" },
          { ref: "Revelation 12:17" },
        ],
        commentary: "These messages become more urgent as history moves toward its climax. In a world of growing spiritual deception, competing truth claims, and pressure to compromise, the three angels' messages provide clarity. They remind us that the great controversy between Christ and Satan is real, the stakes are eternal, and God has given us everything we need to stand firm.",
      },
      {
        id: "three-angels-5",
        question: "How do I share these messages with love?",
        verses: [
          { ref: "1 Peter 3:15" },
          { ref: "Colossians 4:5-6" },
        ],
        commentary: "The three angels' messages are not a club to beat people with — they are heaven's final love letter. We share them with gentleness, respect, and a Christ-centred spirit. People need to see in our lives the beauty of the truths we proclaim. Let your conversation be gracious, your character be winsome, and your message be Jesus-centred above all.",
      },
    ],
  },
  {
    id: "health-message",
    title: "Health & Wholeness",
    category: "Adventist Doctrines",
    overview: "The Adventist health message is not legalism or lifestyle restriction — it is an expression of God's love for the whole person. God designed our bodies as temples of the Holy Spirit, and He wants us to thrive physically, mentally, emotionally, and spiritually. The biblical principles of health — including diet, rest, exercise, temperance, and trust in God — are supported by modern science and have made Seventh-day Adventists one of the longest-lived populations on earth. True health reform is about freedom, not bondage — the freedom to live the abundant life God intended.",
    questions: [
      {
        id: "health-1",
        question: "Why does God care about my physical health?",
        verses: [
          { ref: "1 Corinthians 6:19-20" },
          { ref: "3 John 1:2" },
          { ref: "1 Corinthians 10:31" },
        ],
        commentary: "God created you as an integrated whole — body, mind, and spirit are inseparably connected. What affects one affects all. Your body is not a prison for the soul but a temple for God's Spirit. Caring for your health is an act of worship and a response to the incredible price God paid to redeem you. He wants you to thrive, not merely survive.",
      },
      {
        id: "health-2",
        question: "What does the Bible teach about diet?",
        verses: [
          { ref: "Genesis 1:29" },
          { ref: "Daniel 1:12-15" },
          { ref: "Leviticus 11:1-3" },
        ],
        commentary: "God's original diet in Eden was plant-based — fruits, grains, nuts, and vegetables. After the flood, clean meats were permitted, but the ideal remains. Daniel's experience shows that God's dietary principles produce observable health benefits. Many Adventists choose vegetarianism not as law but as wisdom — honouring the original design while enjoying the abundance God provides.",
      },
      {
        id: "health-3",
        question: "How does rest and Sabbath relate to health?",
        verses: [
          { ref: "Exodus 20:8-10" },
          { ref: "Mark 6:31" },
          { ref: "Psalm 127:2" },
        ],
        commentary: "Rest is not laziness — it is a divine prescription. God Himself rested on the seventh day, not because He was tired but to model the rhythm of work and rest that humans need. The weekly Sabbath is God's gift of time — a sanctuary in time where we cease striving, connect with God, and allow our bodies and minds to be restored. Modern science confirms what Scripture has always taught: we are designed for rhythmic rest.",
      },
      {
        id: "health-4",
        question: "What about temperance and self-control?",
        verses: [
          { ref: "1 Corinthians 9:25" },
          { ref: "Proverbs 25:28" },
          { ref: "Galatians 5:22-23" },
        ],
        commentary: "Temperance means moderation in good things and total abstinence from harmful things. It is not about deprivation but about freedom — the freedom that comes from not being controlled by appetite, addiction, or excess. Self-control is a fruit of the Holy Spirit, which means it is a gift from God, not just willpower. Ask Him for it and He will provide.",
      },
      {
        id: "health-5",
        question: "How does mental and emotional health connect to faith?",
        verses: [
          { ref: "Philippians 4:6-7" },
          { ref: "Proverbs 17:22" },
          { ref: "Isaiah 26:3" },
        ],
        commentary: "Mental health is not separate from spiritual health. Anxiety, depression, and emotional pain are real struggles that deserve compassion, not judgment. God offers genuine peace — not the absence of problems but a deep trust in His goodness. Prayer, community, gratitude, and professional help when needed are all part of God's provision for emotional wholeness. A cheerful heart truly is good medicine.",
      },
    ],
  },
  {
    id: "state-of-dead",
    title: "The State of the Dead",
    category: "Adventist Doctrines",
    overview: "What happens when we die? This question has haunted humanity for millennia. The Bible's answer is both surprising and liberating: death is a sleep, not a doorway. The dead are not in heaven or hell — they are resting unconsciously in the grave, awaiting the resurrection at Christ's return. This teaching frees us from the fear of an ever-burning hell, protects us from spiritualistic deceptions, and points us firmly toward the resurrection as our true hope. Death is an enemy, but it is a defeated enemy — conquered by the One who holds the keys of death and the grave.",
    questions: [
      {
        id: "state-dead-1",
        question: "What happens when a person dies?",
        verses: [
          { ref: "Ecclesiastes 9:5" },
          { ref: "Psalm 146:4" },
          { ref: "John 11:11-14" },
        ],
        commentary: "The Bible consistently describes death as a sleep — an unconscious state where there is no thought, no awareness, and no activity. Jesus Himself used this language when speaking of Lazarus. The dead are not watching us from above or suffering below. They are at rest, awaiting the great awakening at Christ's return. This is not a harsh truth — it is a merciful one.",
      },
      {
        id: "state-dead-2",
        question: "Do the dead go immediately to heaven or hell?",
        verses: [
          { ref: "John 5:28-29" },
          { ref: "Acts 2:29, 34" },
          { ref: "1 Thessalonians 4:16" },
        ],
        commentary: "If the righteous went to heaven at death, there would be no need for a resurrection or a second coming. The Bible teaches that even King David — a man after God's own heart — has not yet ascended to heaven. The dead await the resurrection when Christ returns. This is not a loss but a promise: the next conscious moment for a person who dies in Christ is seeing His face in glory.",
      },
      {
        id: "state-dead-3",
        question: "Why does this teaching matter practically?",
        verses: [
          { ref: "Deuteronomy 18:10-12" },
          { ref: "2 Corinthians 11:14" },
          { ref: "Isaiah 8:19-20" },
        ],
        commentary: "Understanding the state of the dead is one of the greatest protections against spiritual deception. If the dead are unconscious, then any spirit claiming to be a departed loved one is a counterfeit — a demonic impersonation. This truth shields us from spiritualism, necromancy, and the great final deception. It also frees us from the cruel doctrine of an ever-burning hell, revealing a God of justice and mercy.",
      },
      {
        id: "state-dead-4",
        question: "What is the resurrection hope?",
        verses: [
          { ref: "1 Corinthians 15:20-22" },
          { ref: "Job 19:25-26" },
        ],
        commentary: "The resurrection is the Bible's true hope for the dead — not an ethereal existence as disembodied spirits but a bodily resurrection in glory. Christ's own resurrection guarantees ours. Job, in his deepest suffering, clung to this hope: 'I know that my Redeemer lives!' The resurrection morning will be the greatest reunion in the history of the universe.",
      },
      {
        id: "state-dead-5",
        question: "How should this truth comfort me in grief?",
        verses: [
          { ref: "1 Thessalonians 4:13-14" },
          { ref: "Revelation 21:4" },
        ],
        commentary: "This teaching does not minimise grief — losing someone you love is deeply painful. But it transforms grief with hope. Your loved ones who died in Christ are not suffering. They are at rest. And the separation is temporary. One day soon, at the sound of the trumpet, graves will open, tears will be wiped away, and the reunion will be eternal. We grieve, but not without hope.",
      },
    ],
  },
  {
    id: "great-controversy",
    title: "The Great Controversy",
    category: "Adventist Doctrines",
    overview: "The great controversy is the biblical framework that makes sense of the most troubling questions of human existence: Why is there suffering? Why does a loving God allow evil? What is really happening behind the scenes of history? Scripture reveals a cosmic conflict that began in heaven when Lucifer rebelled against God's character and government. This conflict has played out on earth throughout human history and will reach its climax at the second coming. Understanding the great controversy reveals that God is not the author of suffering — Satan is — and that God's plan has always been to restore, redeem, and make all things new.",
    questions: [
      {
        id: "great-controversy-1",
        question: "How did the great controversy begin?",
        verses: [
          { ref: "Isaiah 14:12-14" },
          { ref: "Ezekiel 28:15, 17" },
          { ref: "Revelation 12:7-9" },
        ],
        commentary: "The great controversy began not with humanity but with a perfect angel in a perfect heaven. Lucifer's sin was pride — the desire to be equal with God, to receive worship, and to challenge God's government of love. When war broke out in heaven, Satan and his followers were cast to earth. This cosmic conflict explains why a good God allows evil: He is demonstrating before the universe that love, not force, is the foundation of His kingdom.",
      },
      {
        id: "great-controversy-2",
        question: "Why does God allow suffering if He is all-powerful?",
        verses: [
          { ref: "Genesis 3:1-4" },
          { ref: "Romans 5:12" },
          { ref: "1 John 3:8" },
        ],
        commentary: "God allows suffering not because He is indifferent but because He respects the freedom He gave His creatures. To destroy evil by force would only prove Satan's accusation that God is a tyrant. Instead, God chose to defeat evil through self-sacrificing love demonstrated at the cross. The suffering we see is the result of sin, not God's will — and Jesus came specifically to destroy the works of the devil.",
      },
      {
        id: "great-controversy-3",
        question: "How did Jesus win the great controversy?",
        verses: [
          { ref: "Colossians 2:15" },
          { ref: "Hebrews 2:14" },
          { ref: "John 12:31-32" },
        ],
        commentary: "The cross is the decisive battle of the great controversy. There, Jesus publicly defeated Satan — not by force but by dying in our place. Satan's accusations about God's character were forever answered at Calvary: God is not selfish, He is self-sacrificing. God is not unjust, He bore justice Himself. The cross disarmed Satan and drew the whole universe to worship a God who would die for His enemies.",
      },
      {
        id: "great-controversy-4",
        question: "How will the great controversy end?",
        verses: [
          { ref: "Revelation 21:1-4" },
          { ref: "Revelation 20:10, 14" },
          { ref: "Nahum 1:9" },
        ],
        commentary: "The great controversy ends with the complete eradication of sin, suffering, and death. God does not torture sinners forever — sin and sinners are consumed in the lake of fire and simply cease to exist. Then God creates a new heaven and new earth where He dwells with His people forever. And Nahum's promise guarantees: sin will never rise again. The universe will be safe and joyful for all eternity.",
      },
      {
        id: "great-controversy-5",
        question: "What does this mean for my daily life?",
        verses: [
          { ref: "Ephesians 6:12" },
          { ref: "Romans 8:37-39" },
          { ref: "James 4:7" },
        ],
        commentary: "Understanding the great controversy transforms your daily experience. Your struggles are not random — they are part of a cosmic conflict. But you are not fighting alone. Through Christ, overwhelming victory is already yours. Every choice you make for good, every temptation you resist, every act of love you perform is a declaration to the universe that God's way works. Resist the devil, and he will flee from you.",
      },
    ],
  },
  {
    id: "stewardship",
    title: "Stewardship",
    category: "Spiritual Practices",
    overview: "Stewardship is the joyful recognition that everything we have — our time, our talents, our resources — belongs to God, and we are entrusted to manage it faithfully. When we see ourselves as stewards rather than owners, it transforms how we live, give, and serve. Faithful stewardship is not about perfection; it is about faithfulness in the small things, trusting that God multiplies what we offer.",
    questions: [
      {
        id: "stewardship-1",
        question: "What does it mean to be a steward?",
        verses: [
          { ref: "1 Peter 4:10" },
          { ref: "Matthew 25:21" },
          { ref: "1 Corinthians 4:2" },
        ],
        commentary: "A steward is someone entrusted with managing what belongs to another. In the biblical vision, God is the owner of everything and we are His managers. This is not a burden but a privilege — God trusts us with His resources and celebrates our faithfulness. The parable of the talents reminds us that faithfulness in small things opens the door to greater responsibility and deeper joy.",
      },
      {
        id: "stewardship-2",
        question: "How can I be a better steward of my time and resources?",
        verses: [
          { ref: "Ephesians 5:15-16" },
          { ref: "Proverbs 3:9-10" },
        ],
        commentary: "Better stewardship starts with intentionality. Honour God first with the best of what you have, not what is left over. Be deliberate about how you spend your hours, your energy, and your money. Ask God each morning how He would have you invest the day. When we prioritise His purposes, He promises provision beyond what we imagined.",
      },
      {
        id: "stewardship-3",
        question: "Does God care about how I manage my finances?",
        verses: [
          { ref: "Luke 16:10-11" },
          { ref: "Malachi 3:10" },
        ],
        commentary: "God cares deeply about our finances — not because He needs our money, but because how we handle money reveals the state of our hearts. Financial faithfulness is a spiritual discipline. When we tithe and give generously, we declare that God is our provider and that we trust His economy over the world's.",
      },
    ],
    resources: [
      { videoId: "YbipxLDtY8c", title: "You're Supposed to Rule the World (Here's How)", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/YbipxLDtY8c/maxresdefault.jpg", durationMinutes: 6 },
      { videoId: "wZ4t-if0-_0", title: "The Role of Stewardship", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/wZ4t-if0-_0/maxresdefault.jpg", durationMinutes: 58 },
      { videoId: "eLTz-RoMCVk", title: "The Results of Stewardship", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/eLTz-RoMCVk/maxresdefault.jpg", durationMinutes: 58 },
    ],
  },
  {
    id: "serving-others",
    title: "Serving Others",
    category: "Character & Growth",
    overview: "Jesus made it clear that greatness in His kingdom is measured not by status but by service. He washed His disciples' feet, healed the outcast, and gave His life for those who could never repay Him. When we serve others — especially the overlooked, the hurting, and the vulnerable — we become the hands and feet of Christ in a world that desperately needs His touch.",
    questions: [
      {
        id: "serving-others-1",
        question: "Why does God call us to serve others?",
        verses: [
          { ref: "Mark 10:45" },
          { ref: "Galatians 5:13" },
          { ref: "Matthew 25:40" },
        ],
        commentary: "Service is the language of love in God's kingdom. Jesus modelled it perfectly — the King of the universe took the posture of a servant. When we serve others, especially those who cannot return the favour, we encounter Christ himself. God calls us to serve not to earn His love, but because His love overflows through us into the lives of others.",
      },
      {
        id: "serving-others-2",
        question: "How can I find meaningful ways to serve in my community?",
        verses: [
          { ref: "1 Peter 4:10" },
          { ref: "James 2:15-17" },
        ],
        commentary: "God has wired you with unique gifts for a reason. Look around your community — where is there need? Start where you are, with what you have. Feed someone who is hungry, visit someone who is lonely, mentor someone who is lost. Faith without works is dead, but when your faith becomes action, it brings life to everyone it touches.",
      },
      {
        id: "serving-others-3",
        question: "What does servant leadership look like?",
        verses: [
          { ref: "John 13:14-15" },
          { ref: "Philippians 2:3-4" },
        ],
        commentary: "Jesus redefined leadership the night before He died by kneeling with a towel and a basin. Servant leadership puts others first, lifts people up rather than lording over them, and leads by example rather than by title. The greatest leaders in God's kingdom are those willing to do the work no one else wants to do.",
      },
    ],
    resources: [
      { videoId: "slyevQ1LW7A", title: "Agape — Love", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/slyevQ1LW7A/maxresdefault.jpg", durationMinutes: 5 },
      { videoId: "QVO0tfxXTtE", title: "Where Is Your Treasure", channelName: "Amazing Facts", thumbnailUrl: "https://img.youtube.com/vi/QVO0tfxXTtE/maxresdefault.jpg", durationMinutes: 48 },
      { videoId: "aCqfveiRuCM", title: "Become Like Jesus", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/aCqfveiRuCM/maxresdefault.jpg", durationMinutes: 54 },
    ],
  },
  {
    id: "fasting",
    title: "Fasting",
    category: "Spiritual Practices",
    overview: "Fasting is an ancient spiritual discipline that quiets the noise of daily life so we can hear God more clearly. It is not about earning God's favour or punishing the body — it is about creating space for deeper communion with the Father. Throughout Scripture, God's people fasted during times of repentance, decision-making, and spiritual breakthrough, and the practice remains a powerful tool for drawing near to God today.",
    questions: [
      {
        id: "fasting-1",
        question: "What is the purpose of fasting?",
        verses: [
          { ref: "Isaiah 58:6" },
          { ref: "Matthew 6:16-18" },
          { ref: "Joel 2:12" },
        ],
        commentary: "God-honoured fasting is not a performance — it is a posture of the heart. Isaiah 58 reveals that true fasting is inseparable from justice and compassion. Jesus assumed His followers would fast ('when you fast,' not 'if'), but He warned against using it for show. Fasting creates holy hunger — a longing for God that nothing else can satisfy.",
      },
      {
        id: "fasting-2",
        question: "How should I begin fasting?",
        verses: [
          { ref: "Matthew 4:1-2" },
          { ref: "Acts 13:2-3" },
        ],
        commentary: "Start simply. You do not need to fast for forty days like Jesus. Begin with a single meal, a full day, or even fasting from media or entertainment. Pair your fast with prayer and Scripture reading — fill the space you create with time in God's presence. The early church fasted before major decisions, and you can follow their example when seeking guidance for important choices in your own life.",
      },
      {
        id: "fasting-3",
        question: "Does fasting still matter today?",
        verses: [
          { ref: "Matthew 9:14-15" },
          { ref: "Daniel 10:2-3" },
        ],
        commentary: "Jesus said there would come a time when His followers would fast — and that time is now. We live between His first and second coming, longing for His return. Fasting is a way of expressing that longing and sharpening our spiritual senses. Daniel's example shows that even a partial fast — setting aside certain foods for a season — can open windows of revelation and spiritual clarity.",
      },
    ],
    resources: [
      { videoId: "kDmBkTLpmjo", title: "What Does the Bible Say About Fasting?", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/kDmBkTLpmjo/maxresdefault.jpg", durationMinutes: 2 },
      { videoId: "wCo2LN7E6bo", title: "How to Spot Religious Hypocrisy in Yourself", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/wCo2LN7E6bo/maxresdefault.jpg", durationMinutes: 7 },
      { videoId: "Qb7vD3hqBnI", title: "10 Keys for Answered Prayer", channelName: "Amazing Facts", thumbnailUrl: "https://img.youtube.com/vi/Qb7vD3hqBnI/maxresdefault.jpg", durationMinutes: 56 },
      { videoId: "_rkVvprmkOA", title: "Revelation, Fasting, and Faith", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/_rkVvprmkOA/maxresdefault.jpg", durationMinutes: 54 },
    ],
  },
  {
    id: "baptism",
    title: "Baptism",
    category: "Adventist Doctrines",
    overview: "Baptism is one of the most beautiful acts in the Christian life — a public declaration that you have died to your old self and risen to new life in Christ. It is not a ritual that saves you but a response to the salvation God has already offered. Through the waters of baptism, you join the family of believers across every generation who have said yes to following Jesus.",
    questions: [
      {
        id: "baptism-1",
        question: "Why is baptism important?",
        verses: [
          { ref: "Romans 6:3-4" },
          { ref: "Matthew 28:19-20" },
          { ref: "Acts 2:38" },
        ],
        commentary: "Baptism is the outward expression of an inward transformation. When you go under the water, you are symbolically buried with Christ; when you rise, you emerge into new life. Jesus himself was baptised, and He commanded His followers to do the same. It is an act of obedience, a testimony to the world, and a beautiful beginning to your public walk with God.",
      },
      {
        id: "baptism-2",
        question: "What does baptism by immersion represent?",
        verses: [
          { ref: "Colossians 2:12" },
          { ref: "Mark 1:9-10" },
        ],
        commentary: "Baptism by immersion tells the gospel story with your body — burial and resurrection. When Jesus was baptised in the Jordan, He went down into the water and came up out of it. This is the pattern of New Testament baptism. Going fully under the water represents the complete death of the old life; rising up represents the complete newness of the life Christ gives.",
      },
      {
        id: "baptism-3",
        question: "When should I be baptised?",
        verses: [
          { ref: "Acts 8:36-37" },
          { ref: "Acts 22:16" },
        ],
        commentary: "The New Testament pattern is clear: once you have accepted Jesus as your Saviour and understand the commitment you are making, there is no reason to delay. The Ethiopian eunuch asked to be baptised the moment he understood the gospel. Ananias urged Paul not to wait. If God is calling you to take this step, today is a good day to say yes.",
      },
    ],
    resources: [
      { videoId: "0k4GbvZUPuo", title: "The Baptism of Jesus: Luke 3-9", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/0k4GbvZUPuo/maxresdefault.jpg", durationMinutes: 5 },
      { videoId: "tdIxxufZn44", title: "Can You Be Baptized for the Dead?", channelName: "Amazing Facts", thumbnailUrl: "https://img.youtube.com/vi/tdIxxufZn44/maxresdefault.jpg", durationMinutes: 4 },
      { videoId: "Amhz2gu9C54", title: "3ABN Today — Baptism", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/Amhz2gu9C54/maxresdefault.jpg", durationMinutes: 56 },
      { videoId: "uscCwnbzpb8", title: "Baptism and the Temptations", channelName: "Hope Channel", thumbnailUrl: "https://img.youtube.com/vi/uscCwnbzpb8/maxresdefault.jpg", durationMinutes: 58 },
    ],
  },
  {
    id: "discipleship",
    title: "Discipleship",
    category: "Faith & Belief",
    overview: "Discipleship is the lifelong journey of learning to follow Jesus — not just believing in Him, but becoming like Him. A disciple is a learner, an apprentice who walks closely with the Master and is gradually transformed by His presence. Jesus did not call people to a set of rules; He called them to a relationship. Discipleship costs everything, but it gives back far more than it asks.",
    questions: [
      {
        id: "discipleship-1",
        question: "What does it mean to be a disciple of Jesus?",
        verses: [
          { ref: "Luke 9:23" },
          { ref: "John 8:31-32" },
          { ref: "Matthew 4:19" },
        ],
        commentary: "A disciple is not simply someone who agrees with Jesus — it is someone who follows Him. Jesus calls us to deny ourselves, take up our cross, and walk in His footsteps daily. This is not a one-time decision but a daily surrender. The reward is freedom, purpose, and the privilege of being shaped by the greatest Teacher who ever lived.",
      },
      {
        id: "discipleship-2",
        question: "How do I grow as a disciple?",
        verses: [
          { ref: "2 Timothy 2:15" },
          { ref: "Hebrews 5:14" },
          { ref: "Psalm 119:105" },
        ],
        commentary: "Growth in discipleship comes through consistent spiritual habits: studying Scripture, prayer, worship, fellowship, and service. Like physical fitness, spiritual maturity does not happen overnight. It requires training, discipline, and patience. But as you invest time in God's Word and in community with other believers, you will find your ability to discern God's voice and follow His leading grows stronger every day.",
      },
      {
        id: "discipleship-3",
        question: "How do I make disciples of others?",
        verses: [
          { ref: "Matthew 28:19-20" },
          { ref: "2 Timothy 2:2" },
        ],
        commentary: "Discipleship is meant to multiply. The model Jesus gave is simple: invest deeply in a few people, teach them what you know, and send them to do the same. You do not need a seminary degree to make disciples — you need a willing heart and a life that reflects Christ. Share what God has done for you, walk alongside someone newer in the faith, and trust the Holy Spirit to do the rest.",
      },
    ],
    resources: [
      { videoId: "xmFPS0f-kzs", title: "How Jesus Became the King of the World", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/xmFPS0f-kzs/maxresdefault.jpg", durationMinutes: 6 },
      { videoId: "b6PuB5qNe_k", title: "The Discipline of Discipleship", channelName: "Amazing Facts", thumbnailUrl: "https://img.youtube.com/vi/b6PuB5qNe_k/maxresdefault.jpg", durationMinutes: 44 },
      { videoId: "uGoQ_VhGhzY", title: "Young Disciple Ministries", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/uGoQ_VhGhzY/maxresdefault.jpg", durationMinutes: 56 },
      { videoId: "7xXOHyJMc7I", title: "Disciples & Scripture", channelName: "Hope Channel", thumbnailUrl: "https://img.youtube.com/vi/7xXOHyJMc7I/maxresdefault.jpg", durationMinutes: 57 },
    ],
  },
  {
    id: "gods-love",
    title: "God's Love",
    category: "God's Nature",
    overview: "The love of God is the foundation on which everything else in the Christian faith rests. It is not a distant, abstract idea — it is a love so deep that God gave His only Son so that you would never have to be separated from Him. His love pursues you when you wander, holds you when you fall, and celebrates you when you return. You are more loved than you can possibly imagine.",
    questions: [
      {
        id: "gods-love-1",
        question: "How much does God love me?",
        verses: [
          { ref: "John 3:16" },
          { ref: "Romans 5:8" },
          { ref: "1 John 3:1" },
        ],
        commentary: "God's love is not based on your performance — He loved you while you were still far from Him. The cross is the ultimate measurement of His love: He gave everything so you could have everything. You are not merely tolerated by God; you are cherished, chosen, and called His child. Let that truth sink deep into your heart today.",
      },
      {
        id: "gods-love-2",
        question: "Can anything separate me from God's love?",
        verses: [
          { ref: "Romans 8:38-39" },
          { ref: "Psalm 139:7-10" },
        ],
        commentary: "Paul's declaration in Romans 8 is one of the most powerful promises in all of Scripture. No failure, no fear, no force in all creation can pry you from God's loving grip. His love is not fragile — it is unbreakable. Even when you cannot feel it, His love surrounds you. There is nowhere you can go where His presence will not find you.",
      },
      {
        id: "gods-love-3",
        question: "How do I experience God's love in daily life?",
        verses: [
          { ref: "Jeremiah 31:3" },
          { ref: "Zephaniah 3:17" },
        ],
        commentary: "God's love is not only cosmic — it is personal and present. He draws you with unfailing love. He calms your fears. He sings over you with joy. You experience His love in the beauty of creation, in the kindness of His people, in the whisper of His Spirit during prayer, and in the promises of His Word. Open your eyes today and look for the fingerprints of His love all around you.",
      },
    ],
    resources: [
      { videoId: "UfbyFLgs_NM", title: "God Loves You, But What Does That Mean?", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/UfbyFLgs_NM/maxresdefault.jpg", durationMinutes: 5 },
      { videoId: "HV_LUs2lnIQ", title: "What It Means to Love God", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/HV_LUs2lnIQ/maxresdefault.jpg", durationMinutes: 4 },
      { videoId: "n2lLDZXxs9E", title: "Walking with God in a Wicked World", channelName: "Amazing Facts", thumbnailUrl: "https://img.youtube.com/vi/n2lLDZXxs9E/maxresdefault.jpg", durationMinutes: 47 },
      { videoId: "LxOynvkrXdc", title: "14 Ways to Understand God's Love", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/LxOynvkrXdc/maxresdefault.jpg", durationMinutes: 58 },
    ],
  },
  {
    id: "gods-grace",
    title: "God's Grace",
    category: "God's Nature",
    overview: "Grace is God's unmerited favour — the gift we could never earn and do not deserve. It is the heart of the gospel and the reason we have hope. Grace met you before you knew you needed it, carries you through your darkest seasons, and will welcome you home at the end of the journey. Everything good in the Christian life flows from this one inexhaustible source.",
    questions: [
      {
        id: "gods-grace-1",
        question: "What is grace and why do I need it?",
        verses: [
          { ref: "Ephesians 2:8-9" },
          { ref: "Titus 3:5" },
          { ref: "Romans 3:23-24" },
        ],
        commentary: "Grace is not something you earn — it is something you receive with open hands. Every person has sinned and fallen short, which means every person needs grace. The beautiful news is that God offers it freely, generously, and without conditions. Grace does not make light of sin; it takes sin so seriously that God paid the price himself so you would not have to.",
      },
      {
        id: "gods-grace-2",
        question: "Is there a limit to God's grace?",
        verses: [
          { ref: "Romans 5:20" },
          { ref: "Lamentations 3:22-23" },
          { ref: "2 Corinthians 12:9" },
        ],
        commentary: "Where sin increases, grace increases even more. There is no sin so deep, no failure so great, no wandering so far that God's grace cannot reach you. His mercies are new every morning — fresh, unused, and waiting for you. When Paul pleaded for relief from his weakness, God did not remove it; He gave him grace sufficient for every moment. That same grace is yours today.",
      },
      {
        id: "gods-grace-3",
        question: "How does grace change the way I live?",
        verses: [
          { ref: "Titus 2:11-12" },
          { ref: "2 Corinthians 5:17" },
        ],
        commentary: "Grace does not give us license to sin — it gives us the power to live differently. When you truly encounter God's grace, it transforms you from the inside out. You become a new creation. The things you once chased lose their grip, and a new desire to live for God takes root. Grace is not just a pardon — it is a power that reshapes your entire life.",
      },
    ],
    resources: [
      { videoId: "ABPVVw_aw44", title: "God's Consistent Posture Toward All Humanity", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/ABPVVw_aw44/maxresdefault.jpg", durationMinutes: 5 },
      { videoId: "TeQ1nq_YJD0", title: "Don't Miss the Point of God's Anger in the Bible", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/TeQ1nq_YJD0/maxresdefault.jpg", durationMinutes: 5 },
      { videoId: "1zUT3pRq1NA", title: "Deadly Faith Or Saving Grace", channelName: "Amazing Facts", thumbnailUrl: "https://img.youtube.com/vi/1zUT3pRq1NA/maxresdefault.jpg", durationMinutes: 48 },
      { videoId: "-fMm1Mpu-do", title: "Is There a Limit to God's Grace?", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/-fMm1Mpu-do/maxresdefault.jpg", durationMinutes: 58 },
    ],
  },
  {
    id: "the-trinity",
    title: "The Trinity",
    category: "God's Nature",
    overview: "The Trinity is one of the most profound mysteries of the Christian faith — one God existing eternally as three Persons: Father, Son, and Holy Spirit. It is not a puzzle to be solved but a relationship to be entered into. The Trinity reveals that at the very heart of reality is not a solitary power but a community of love. The God who made you is relational to His core, and He invites you into that divine fellowship.",
    questions: [
      {
        id: "trinity-1",
        question: "What does the Bible teach about the Trinity?",
        verses: [
          { ref: "Matthew 28:19" },
          { ref: "2 Corinthians 13:14" },
          { ref: "Genesis 1:26" },
        ],
        commentary: "From the very first chapter of Genesis, God speaks in the plural: 'Let us make human beings in our image.' Throughout Scripture, Father, Son, and Holy Spirit are each identified as God, yet there is only one God. The baptismal formula Jesus gave His disciples names all three Persons equally. This is not a contradiction — it is a revelation of God's nature that goes beyond what our finite minds can fully grasp.",
      },
      {
        id: "trinity-2",
        question: "Why does the Trinity matter for my faith?",
        verses: [
          { ref: "John 14:16-17" },
          { ref: "Ephesians 2:18" },
          { ref: "1 John 4:8" },
        ],
        commentary: "The Trinity matters because it means God has always been relational — Father, Son, and Spirit have loved one another from eternity. Love is not something God decided to do; it is who He is. Because God is a Trinity, you were created for relationship. Through Christ, in the power of the Spirit, you have access to the Father. All three Persons of the Godhead are actively involved in your salvation and your daily walk.",
      },
      {
        id: "trinity-3",
        question: "How do the Father, Son, and Holy Spirit work together?",
        verses: [
          { ref: "John 15:26" },
          { ref: "Romans 8:11" },
          { ref: "John 5:19" },
        ],
        commentary: "The Father plans, the Son accomplishes, and the Spirit applies. The Father sent the Son; the Son revealed the Father; the Spirit makes the work of Christ real in our hearts. This is not a hierarchy of importance but a harmony of purpose. The same Spirit who raised Jesus from the dead lives in you — empowering, guiding, and transforming you into the image of Christ.",
      },
    ],
    resources: [
      { videoId: "eAvYmE2YYIU", title: "The Trinity Explained (Without Pretending It's Simple)", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/eAvYmE2YYIU/maxresdefault.jpg", durationMinutes: 8 },
      { videoId: "oNNZO9i1Gjc", title: "Why the Holy Spirit Isn't Just a Force", channelName: "BibleProject", thumbnailUrl: "https://img.youtube.com/vi/oNNZO9i1Gjc/maxresdefault.jpg", durationMinutes: 4 },
      { videoId: "hSteVvG3Phc", title: "The Mystery of the Trinity", channelName: "Amazing Facts", thumbnailUrl: "https://img.youtube.com/vi/hSteVvG3Phc/maxresdefault.jpg", durationMinutes: 53 },
      { videoId: "gfrNG_sSkSo", title: "3ABN Today — The Trinity", channelName: "3ABN", thumbnailUrl: "https://img.youtube.com/vi/gfrNG_sSkSo/maxresdefault.jpg", durationMinutes: 56 },
    ],
  },
  {
    id: "prophecy",
    title: "The Gift of Prophecy",
    category: "Adventist Doctrines",
    overview: "The prophetic gift did not cease with the closing of the biblical canon. God promised through Joel that in the last days He would pour out His Spirit and His people would prophesy. The book of Revelation identifies the remnant church by two marks: they keep the commandments of God and they hold the testimony of Jesus — which Revelation 19:10 defines as the spirit of prophecy. Seventh-day Adventists understand the ministry of Ellen G. White as a fulfilment of this promise — not as an addition to Scripture, but as a lesser light pointing to the greater light of the Bible. Her writings have guided, warned, and encouraged the Adventist movement through every generation.",
    questions: [
      {
        id: "prophecy-1",
        question: "Does the gift of prophecy continue in the last days?",
        verses: [
          { ref: "Joel 2:28" },
          { ref: "Acts 2:17-18" },
          { ref: "1 Corinthians 12:28" },
        ],
        commentary: "God promised the prophetic gift not only for ancient Israel but for the last days of earth's history. Peter explicitly applied Joel's prophecy to the outpouring of the Holy Spirit. The New Testament lists prophecy among the ongoing spiritual gifts given for the health and mission of the church. Expecting prophecy to cease before the end of time contradicts both the promise of Joel and the pattern of how God has always guided His people — through those He raises up to speak for Him.",
      },
      {
        id: "prophecy-2",
        question: "What is the 'testimony of Jesus' and how does it identify God's remnant?",
        verses: [
          { ref: "Revelation 12:17" },
          { ref: "Revelation 19:10" },
          { ref: "Revelation 22:8-9" },
        ],
        commentary: "Revelation 19:10 is the interpretive key: 'the testimony of Jesus is the spirit of prophecy.' The remnant church is identified not only by commandment-keeping but by possessing the prophetic gift — the spirit of prophecy active in its midst. This is not a minor detail but a defining characteristic. God in His mercy marks His last-day people by the same gift that guided ancient Israel: the living voice of prophecy, directing attention away from itself and always pointing to Jesus.",
      },
      {
        id: "prophecy-3",
        question: "How do we test whether a prophet is genuine?",
        verses: [
          { ref: "1 Thessalonians 5:20-21" },
          { ref: "Isaiah 8:20" },
          { ref: "Matthew 7:15-16" },
        ],
        commentary: "God never asks us to accept prophets uncritically — He commands us to test them. Scripture gives us four clear tests: Does the prophet's message align with Scripture? Do their predictions come true? Does their life bear the fruit of the Spirit? And do they point people to God and His Word? Ellen White's ministry passes each of these tests. She consistently directed people to the Bible as the supreme authority and lived a life of dedicated service. We should neither dismiss prophecy with scepticism nor accept it without discernment.",
      },
      {
        id: "prophecy-4",
        question: "How does the Spirit of Prophecy practically guide God's people today?",
        verses: [
          { ref: "Proverbs 29:18" },
          { ref: "Amos 3:7" },
          { ref: "Ephesians 4:11-13" },
        ],
        commentary: "God gives prophets not to replace Scripture but to apply its timeless truths to the specific challenges of each generation. The Spirit of Prophecy writings offer practical guidance on health, family, education, church order, and spiritual formation that has shaped and strengthened the Adventist movement for over 150 years. The purpose, as Paul makes clear in Ephesians, is to equip believers for ministry and bring the church to maturity in Christ. Where the Bible charts the course, the gift of prophecy helps navigate the journey.",
      },
    ],
  },
  {
    id: "remnant",
    title: "The Remnant Church",
    category: "Adventist Doctrines",
    overview: "Across Scripture, God has always preserved a faithful remnant — a people who remain true to Him when the majority drift into compromise or apostasy. In the final chapter of earth's history, Revelation identifies this remnant with striking precision: they keep the commandments of God and hold the testimony of Jesus. The Seventh-day Adventist Church understands itself to be a movement raised up in prophetic fulfilment of this description — not out of arrogance, but out of a sense of sacred responsibility. The remnant is not defined by ethnicity, nationality, or denominational label alone, but by faithfulness to God's Word and wholehearted participation in His last-day mission.",
    questions: [
      {
        id: "remnant-1",
        question: "What is the remnant and how is it identified in Scripture?",
        verses: [
          { ref: "Revelation 12:17" },
          { ref: "Revelation 14:12" },
          { ref: "Romans 11:5" },
        ],
        commentary: "The biblical concept of a remnant runs from Noah's family through the seven thousand who had not bowed to Baal, to the exiles who returned from Babylon, to the apostolic community who received the Spirit. In every age, God has a people who remain faithful against the current. Revelation provides the clearest end-time portrait: the remnant keeps God's commandments and holds the testimony of Jesus. These are not vague generalities — they are specific, verifiable marks that help God's people understand their identity and calling.",
      },
      {
        id: "remnant-2",
        question: "What does it mean to 'keep the commandments of God'?",
        verses: [
          { ref: "John 14:15" },
          { ref: "Revelation 14:12" },
          { ref: "1 John 5:3" },
        ],
        commentary: "Commandment-keeping is not legalism — it is love in action. Jesus redefined the law not as a burden to bear but as a glad response to grace already received. The remnant keeps all of God's commandments, including the fourth — the Sabbath — which the first angel's message specifically points to when it calls the world to worship the Creator. Obedience is the evidence of genuine faith, not the cause of salvation. The remnant does not keep the commandments to be saved; they keep them because they are saved and deeply love the God who saved them.",
      },
      {
        id: "remnant-3",
        question: "What is the mission of the remnant in earth's final hours?",
        verses: [
          { ref: "Revelation 14:6-7" },
          { ref: "Matthew 24:14" },
          { ref: "Isaiah 58:1" },
        ],
        commentary: "The remnant church is not a retreat community — it is a mission force. The three angels' messages of Revelation 14 constitute the most urgent proclamation entrusted to any generation: worship the Creator, come out of confusion, and stand faithful in the crisis ahead. This message must reach every nation, tribe, language, and people before Christ returns. Every member of the remnant is a messenger. The mission is not optional or reserved for ordained ministers; it is the calling of every person who understands the times and loves their neighbours enough to warn them.",
      },
      {
        id: "remnant-4",
        question: "How can I live faithfully as part of God's remnant today?",
        verses: [
          { ref: "Ephesians 4:11-13" },
          { ref: "2 Timothy 3:16-17" },
          { ref: "Jude 1:3" },
        ],
        commentary: "Living as the remnant is not about institutional belonging — it is about personal faithfulness, theological clarity, and missional courage. Study Scripture deeply so you are not deceived. Remain rooted in a community of believers who hold the full counsel of God's Word. Share your faith graciously and consistently. Contend earnestly for the faith — not with arrogance, but with love and conviction. In a world racing toward compromise, the remnant is called to be a people who stand — not because they are better, but because they are grounded in the Word and empowered by the Spirit.",
      },
    ],
  },
];

export function searchTouchpoints(query: string): TouchPointTopic[] {
  const lower = query.toLowerCase();
  return TOUCHPOINTS_DATA.filter(t =>
    t.title.toLowerCase().includes(lower) ||
    t.category.toLowerCase().includes(lower) ||
    t.overview.toLowerCase().includes(lower) ||
    t.questions.some(q => q.question.toLowerCase().includes(lower))
  );
}
