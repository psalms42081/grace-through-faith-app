export interface TouchPointQuestion {
  id: string;
  question: string;
  verses: { ref: string; text: string }[];
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
          { ref: "Psalm 27:10", text: "Even if my father and mother abandon me, the LORD will hold me close." },
          { ref: "Isaiah 49:15-16", text: "Can a mother forget her nursing child? Can she feel no love for the child she has borne? But even if that were possible, I would not forget you! See, I have written your name on the palms of my hands." },
        ],
        commentary: "Abandonment is never a reflection of your worth in God's eyes. While human relationships can fail, God's love for you is unconditional and permanent. He has engraved you on the palms of His hands — you are always on His mind and in His care. Your value comes from being created in God's image, not from the actions of others.",
      },
      {
        id: "abandonment-2",
        question: "How can I heal from my abandonment?",
        verses: [
          { ref: "Psalm 34:18", text: "The LORD is close to the brokenhearted; he rescues those whose spirits are crushed." },
          { ref: "Psalm 147:3", text: "He heals the brokenhearted and bandages their wounds." },
          { ref: "2 Corinthians 1:3-4", text: "God is our merciful Father and the source of all comfort. He comforts us in all our troubles so that we can comfort others." },
        ],
        commentary: "Healing begins when we bring our pain to God rather than hiding it. He specializes in mending broken hearts. The process takes time, but God promises to be near you in your darkest moments. As you experience His comfort, you gain the ability to help others who face similar pain — your wound becomes your ministry.",
      },
      {
        id: "abandonment-3",
        question: "Is there a difference between rejection, betrayal, and abandonment?",
        verses: [
          { ref: "Matthew 12:23-24", text: "The crowd was amazed and asked, 'Could it be that Jesus is the Son of David, the Messiah?' But when the Pharisees heard about the miracle, they said, 'No wonder he can cast out demons. He gets his power from Satan, the prince of demons.'" },
          { ref: "Mark 14:10-11", text: "Then Judas Iscariot, one of the twelve disciples, went to the leading priests to arrange to betray Jesus to them. They were delighted when they heard why he had come, and they promised to give him money." },
          { ref: "Mark 14:43-50", text: "Immediately, even as Jesus said this, Judas, one of the twelve disciples, arrived with a crowd of men armed with swords and clubs. . . . Then all his disciples deserted him and ran away." },
        ],
        commentary: "Jesus experienced all three forms of relational pain. The Pharisees rejected Him — refusing to accept who He was. Judas betrayed Him — deliberately turning against someone who had trusted him. The disciples abandoned Him — fleeing when things got difficult. Jesus understands every form of relational hurt you experience because He endured them all. In His resurrection, He showed that no rejection, betrayal, or abandonment has the final word.",
      },
      {
        id: "abandonment-4",
        question: "Where is God during my difficult times?",
        verses: [
          { ref: "Deuteronomy 31:8", text: "Do not be afraid or discouraged, for the LORD will personally go ahead of you. He will be with you; he will neither fail you nor abandon you." },
          { ref: "Psalm 23:4", text: "Even when I walk through the darkest valley, I will not be afraid, for you are close beside me." },
          { ref: "Romans 8:38-39", text: "Nothing can ever separate us from God's love. Neither death nor life, neither angels nor demons, neither our fears for today nor our worries about tomorrow — not even the powers of hell can separate us from God's love." },
        ],
        commentary: "God is not distant during your suffering — He is closer than ever. The darkest valleys are where His presence becomes most real. Nothing in all creation has the power to separate you from His love. When you cannot feel Him, remember that feelings are not facts. His promise stands: He will never leave you or forsake you.",
      },
      {
        id: "abandonment-5",
        question: "Other people have abandoned me — why hasn't God?",
        verses: [
          { ref: "Lamentations 3:22-23", text: "The faithful love of the LORD never ends! His mercies never cease. Great is his faithfulness; his mercies begin afresh each morning." },
          { ref: "Hebrews 13:5", text: "God has said, 'I will never fail you. I will never abandon you.'" },
        ],
        commentary: "Human love is conditional and limited. God's love is unconditional and inexhaustible. People abandon because of their own brokenness, selfishness, or weakness. God cannot abandon you because faithfulness is central to His very nature. Every morning His mercies are renewed — not because you earned them, but because He is who He is.",
      },
      {
        id: "abandonment-6",
        question: "In what circumstances might God abandon me?",
        verses: [
          { ref: "Romans 8:1", text: "There is no condemnation for those who belong to Christ Jesus." },
          { ref: "John 6:37", text: "Those the Father has given me will come to me, and I will never reject them." },
        ],
        commentary: "The simple and beautiful answer is: none. God will never abandon you. There is no sin so great, no failure so deep, no wandering so far that it can exhaust God's grace. While we may walk away from Him, He never walks away from us. Like the father in the prodigal son story, He watches for our return with open arms.",
      },
      {
        id: "abandonment-7",
        question: "Promises from God",
        verses: [
          { ref: "Isaiah 41:10", text: "Don't be afraid, for I am with you. Don't be discouraged, for I am your God. I will strengthen you and help you. I will hold you up with my victorious right hand." },
          { ref: "Matthew 28:20", text: "And be sure of this: I am with you always, even to the end of the age." },
          { ref: "Joshua 1:9", text: "Be strong and courageous! Do not be afraid or discouraged. For the LORD your God is with you wherever you go." },
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
          { ref: "John 8:36", text: "So if the Son sets you free, you are truly free." },
          { ref: "2 Corinthians 5:17", text: "Anyone who belongs to Christ has become a new person. The old life is gone; a new life has begun!" },
          { ref: "Philippians 4:13", text: "I can do everything through Christ, who gives me strength." },
        ],
        commentary: "Absolutely. God's power is greater than any addiction. Freedom may come as a sudden breakthrough or as a gradual journey, but God's promise is clear: He can make you new. This doesn't mean temptation disappears, but His strength becomes available to you moment by moment.",
      },
      {
        id: "addiction-2",
        question: "Why do I keep falling back into the same patterns?",
        verses: [
          { ref: "Romans 7:19", text: "I want to do what is good, but I don't. I don't want to do what is wrong, but I do it anyway." },
          { ref: "Galatians 5:17", text: "The sinful nature wants to do evil, which is just the opposite of what the Spirit wants." },
          { ref: "1 John 1:9", text: "If we confess our sins to him, he is faithful and just to forgive us our sins and to cleanse us from all wickedness." },
        ],
        commentary: "Paul himself described this very struggle. Relapse doesn't mean failure — it means you're in a battle. Each time you fall, God's grace meets you right there. Don't let shame keep you from returning to Him. Confession and community break the cycle of secrecy that feeds addiction.",
      },
      {
        id: "addiction-3",
        question: "How can I find the strength to overcome?",
        verses: [
          { ref: "2 Corinthians 12:9", text: "My grace is all you need. My power works best in weakness." },
          { ref: "James 5:16", text: "Confess your sins to each other and pray for each other so that you may be healed." },
          { ref: "Psalm 119:11", text: "I have hidden your word in my heart, that I might not sin against you." },
        ],
        commentary: "Three keys: First, admit your weakness — God's power shows up when you stop pretending you can do it alone. Second, bring others into your struggle through trusted fellowship. Third, fill your mind with Scripture so that when temptation comes, truth is ready. Recovery is a daily choice empowered by God's daily grace.",
      },
      {
        id: "addiction-4",
        question: "Does God still love me even though I struggle?",
        verses: [
          { ref: "Romans 5:8", text: "God showed his great love for us by sending Christ to die for us while we were still sinners." },
          { ref: "Romans 8:1", text: "There is no condemnation for those who belong to Christ Jesus." },
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
          { ref: "Ephesians 4:26-27", text: "'Don't sin by letting anger control you.' Don't let the sun go down while you are still angry, for anger gives a foothold to the devil." },
          { ref: "James 1:19-20", text: "Understand this, my dear brothers and sisters: You must all be quick to listen, slow to speak, and slow to get angry. Human anger does not produce the righteousness God desires." },
        ],
        commentary: "Feeling anger is not sinful — it's a natural human emotion that even God experiences. The sin comes when anger controls us rather than us controlling it. Paul's instruction is practical: deal with anger quickly, don't let it fester overnight, and don't let it become a tool the enemy uses against you.",
      },
      {
        id: "anger-2",
        question: "How can I control my temper?",
        verses: [
          { ref: "Proverbs 15:1", text: "A gentle answer deflects anger, but harsh words make tempers flare." },
          { ref: "Proverbs 29:11", text: "Fools vent their anger, but the wise quietly hold it back." },
          { ref: "Galatians 5:22-23", text: "The Holy Spirit produces this kind of fruit in our lives: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control." },
        ],
        commentary: "Self-control is a fruit of the Spirit, not just a skill to develop. Ask God daily for His Spirit to produce patience in you. When anger rises, pause before responding. A soft word has remarkable power to defuse conflict. The wisest people aren't those who never feel anger — they're the ones who choose how to respond to it.",
      },
      {
        id: "anger-3",
        question: "What should I do when I am angry at God?",
        verses: [
          { ref: "Psalm 13:1-2", text: "O LORD, how long will you forget me? Forever? How long will you look the other way? How long must I struggle with anguish in my soul, with sorrow in my heart every day?" },
          { ref: "Psalm 62:8", text: "Pour out your heart to him, for God is our refuge." },
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
          { ref: "Philippians 4:6-7", text: "Don't worry about anything; instead, pray about everything. Tell God what you need, and thank him for all he has done. Then you will experience God's peace, which exceeds anything we can understand." },
          { ref: "Matthew 6:25-27", text: "That is why I tell you not to worry about everyday life — whether you have enough food and drink, or enough clothes to wear. Isn't life more than food, and your body more than clothing? Look at the birds. They don't plant or harvest or store food in barns, for your heavenly Father feeds them. And aren't you far more valuable to him than they are?" },
          { ref: "1 Peter 5:7", text: "Give all your worries and cares to God, for he cares about you." },
        ],
        commentary: "God doesn't scold you for feeling anxious — He invites you to bring your anxiety to Him. The antidote to worry is prayer combined with thanksgiving. When you turn your worries into prayers, something supernatural happens: a peace that defies logic settles over your heart. You are far more valuable to God than the birds He faithfully feeds every day.",
      },
      {
        id: "anxiety-2",
        question: "How can I find peace when everything feels uncertain?",
        verses: [
          { ref: "Isaiah 26:3", text: "You will keep in perfect peace all who trust in you, all whose thoughts are fixed on you." },
          { ref: "Psalm 46:1-2", text: "God is our refuge and strength, always ready to help in times of trouble. So we will not fear, even if earthquakes come and the mountains crumble into the sea." },
          { ref: "John 14:27", text: "I am leaving you with a gift — peace of mind and heart. And the peace I give is a gift the world cannot give. So don't be troubled or afraid." },
        ],
        commentary: "Peace doesn't come from controlling your circumstances — it comes from trusting the One who controls all things. Fix your mind on God's character: His faithfulness, His sovereignty, His love for you. The peace Jesus gives is different from the world's peace. It doesn't depend on things going well; it holds steady even when everything shakes.",
      },
      {
        id: "anxiety-3",
        question: "Is it wrong to seek professional help for anxiety?",
        verses: [
          { ref: "Proverbs 11:14", text: "Without wise leadership, a nation falls; there is safety in having many advisers." },
          { ref: "Proverbs 12:15", text: "Fools think their own way is right, but the wise listen to others." },
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
          { ref: "Ephesians 4:32", text: "Be kind to each other, tenderhearted, forgiving one another, just as God through Christ has forgiven you." },
          { ref: "Matthew 6:14-15", text: "If you forgive those who sin against you, your heavenly Father will forgive you. But if you refuse to forgive others, your Father will not forgive your sins." },
          { ref: "Colossians 3:13", text: "Make allowance for each other's faults, and forgive anyone who offends you. Remember, the Lord forgave you, so you must forgive others." },
        ],
        commentary: "We forgive because we have been forgiven. When we consider the magnitude of what God has forgiven us, forgiving others becomes not just duty but gratitude. Unforgiveness is like drinking poison and expecting the other person to get sick — it hurts you more than anyone. Forgiveness sets you free.",
      },
      {
        id: "forgiveness-2",
        question: "How can I forgive when I still feel the pain?",
        verses: [
          { ref: "Mark 11:25", text: "When you are praying, first forgive anyone you are holding a grudge against, so that your Father in heaven will forgive your sins, too." },
          { ref: "Luke 23:34", text: "Jesus said, 'Father, forgive them, for they don't know what they are doing.'" },
        ],
        commentary: "Forgiveness is a decision, not a feeling. You may need to choose forgiveness daily — even hourly — until your emotions catch up with your choice. Jesus forgave from the cross while in excruciating pain. He didn't wait until He felt like it. Start by telling God you're willing to forgive, and ask Him to help you follow through.",
      },
      {
        id: "forgiveness-3",
        question: "Does forgiving mean I have to trust the person again?",
        verses: [
          { ref: "Proverbs 4:23", text: "Guard your heart above all else, for it determines the course of your life." },
          { ref: "Matthew 10:16", text: "Look, I am sending you out as sheep among wolves. So be as shrewd as snakes and harmless as doves." },
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
          { ref: "1 Thessalonians 4:13-14", text: "We want you to know what will happen to the believers who have died so you will not grieve like people who have no hope. For since we believe that Jesus died and was raised to life again, we also believe that when Jesus returns, God will bring back with him the believers who have died." },
          { ref: "Revelation 21:4", text: "He will wipe every tear from their eyes, and there will be no more death or sorrow or crying or pain. All these things are gone forever." },
        ],
        commentary: "Christians grieve, but not without hope. The promise of resurrection means that death is not goodbye forever — it is 'see you later.' Let yourself grieve fully; don't rush the process. But lift your eyes to the hope that one day every tear will be wiped away and you will be reunited with those who trusted in Christ.",
      },
      {
        id: "grief-2",
        question: "Is it okay to question God in my grief?",
        verses: [
          { ref: "Psalm 88:1-2", text: "O LORD, God of my salvation, I cry out to you by day. I come to you at night. Now hear my prayer; listen to my cry." },
          { ref: "Job 3:11", text: "Why wasn't I born dead? Why didn't I die as I came from the womb?" },
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
          { ref: "Psalm 139:1-4", text: "O LORD, you have examined my heart and know everything about me. You know when I sit down or stand up. You know my thoughts even when I'm far away. You see me when I travel and when I rest at home. You know everything I do." },
          { ref: "Genesis 16:13", text: "She gave this name to the LORD who spoke to her: 'You are the God who sees me.'" },
        ],
        commentary: "Hagar, alone in the desert and pregnant, discovered that God saw her in her loneliest moment. She called Him 'El Roi' — the God who sees. He sees you too. Every silent tear, every sleepless night, every moment you feel invisible — God is watching over you with tender care. You are fully known and deeply loved.",
      },
      {
        id: "loneliness-2",
        question: "How can I find genuine community?",
        verses: [
          { ref: "Hebrews 10:24-25", text: "Let us think of ways to motivate one another to acts of love and good works. And let us not neglect our meeting together, as some people do, but encourage one another." },
          { ref: "Ecclesiastes 4:9-10", text: "Two people are better off than one, for they can help each other succeed. If one person falls, the other can reach out and help." },
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
          { ref: "Jeremiah 29:11", text: "'For I know the plans I have for you,' says the LORD. 'They are plans for good and not for disaster, to give you a future and a hope.'" },
          { ref: "Ephesians 2:10", text: "We are God's masterpiece. He has created us anew in Christ Jesus, so we can do the good things he planned for us long ago." },
          { ref: "Psalm 139:16", text: "Every day of my life was recorded in your book. Every moment was laid out before a single day had passed." },
        ],
        commentary: "God is not indifferent to the details of your life. He has specific good works prepared for you to walk in. You are His masterpiece — a one-of-a-kind creation with a one-of-a-kind calling. The adventure of faith is discovering what He has already prepared for you and stepping into it with courage.",
      },
      {
        id: "purpose-2",
        question: "How do I discover my calling?",
        verses: [
          { ref: "Proverbs 3:5-6", text: "Trust in the LORD with all your heart; do not depend on your own understanding. Seek his will in all you do, and he will show you which path to take." },
          { ref: "Romans 12:6-8", text: "In his grace, God has given us different gifts for doing certain things well." },
          { ref: "Micah 6:8", text: "The LORD has told you what is good, and this is what he requires of you: to do what is right, to love mercy, and to walk humbly with your God." },
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
          { ref: "2 Timothy 1:7", text: "God has not given us a spirit of fear and timidity, but of power, love, and self-discipline." },
          { ref: "Isaiah 41:10", text: "Don't be afraid, for I am with you. Don't be discouraged, for I am your God. I will strengthen you and help you." },
          { ref: "Psalm 56:3", text: "When I am afraid, I will put my trust in you." },
        ],
        commentary: "Courage is not the absence of fear — it's choosing to trust God in the midst of it. The psalmist didn't say 'I'm never afraid.' He said 'When I am afraid, I will trust.' Start there. Acknowledge your fear honestly, then choose trust. God promises His power, His presence, and His help — that's more than enough.",
      },
      {
        id: "fear-2",
        question: "What about the fear of death?",
        verses: [
          { ref: "Psalm 23:4", text: "Even when I walk through the darkest valley, I will not be afraid, for you are close beside me." },
          { ref: "1 Corinthians 15:55-57", text: "'O death, where is your victory? O death, where is your sting?' For sin is the sting that results in death. . . . But thank God! He gives us victory over sin and death through our Lord Jesus Christ." },
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
          { ref: "Genesis 2:24", text: "This explains why a man leaves his father and mother and is joined to his wife, and the two are united into one." },
          { ref: "Ephesians 5:25-28", text: "Husbands, love your wives, just as Christ loved the church. He gave up his life for her. . . . husbands ought to love their wives as they love their own bodies." },
        ],
        commentary: "Marriage is a covenant of self-giving love that mirrors Christ's relationship with the church. It's designed to be a place of deep intimacy, mutual support, and shared mission. God's design is not about power or control but about sacrificial love that puts the other person's needs alongside your own.",
      },
      {
        id: "marriage-2",
        question: "How do we handle conflict in marriage?",
        verses: [
          { ref: "Ephesians 4:26-27", text: "Don't sin by letting anger control you. Don't let the sun go down while you are still angry, for anger gives a foothold to the devil." },
          { ref: "Proverbs 15:1", text: "A gentle answer deflects anger, but harsh words make tempers flare." },
          { ref: "1 Peter 4:8", text: "Most important of all, continue to show deep love for each other, for love covers a multitude of sins." },
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
          { ref: "Psalm 27:14", text: "Wait patiently for the LORD. Be brave and courageous. Yes, wait patiently for the LORD." },
          { ref: "Isaiah 40:31", text: "Those who trust in the LORD will find new strength. They will soar high on wings like eagles. They will run and not grow weary. They will walk and not faint." },
          { ref: "Habakkuk 2:3", text: "This vision is for a future time. It describes the end, and it will be fulfilled. If it seems slow in coming, wait patiently, for it will surely take place." },
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
          { ref: "1 Corinthians 10:13", text: "The temptations in your life are no different from what others experience. And God is faithful. He will not allow the temptation to be more than you can stand. When you are tempted, he will show you a way out so that you can endure." },
          { ref: "James 4:7", text: "Resist the devil, and he will flee from you." },
          { ref: "Matthew 4:4", text: "Jesus answered, 'It is written: Man shall not live on bread alone, but on every word that comes from the mouth of God.'" },
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
          { ref: "Romans 8:28", text: "We know that God causes everything to work together for the good of those who love God and are called according to his purpose for them." },
          { ref: "James 1:2-4", text: "Dear brothers and sisters, when troubles of any kind come your way, consider it an opportunity for great joy. For you know that when your faith is tested, your endurance has a chance to grow." },
          { ref: "2 Corinthians 4:17", text: "For our present troubles are small and won't last very long. Yet they produce for us a glory that vastly outweighs them and will last forever!" },
        ],
        commentary: "God doesn't waste pain. Every trial is an opportunity for faith to grow deeper and stronger. This doesn't mean suffering is good — it means God can bring good from it. The perspective of eternity helps: our present troubles, though real and painful, are producing an eternal weight of glory that far exceeds the cost.",
      },
      {
        id: "suffering-2",
        question: "How can I endure my current trial?",
        verses: [
          { ref: "Hebrews 12:1-2", text: "Let us run with endurance the race God has set before us. We do this by keeping our eyes on Jesus, the champion who initiates and perfects our faith." },
          { ref: "Psalm 34:17-19", text: "The LORD hears his people when they call to him for help. He rescues them from all their troubles. The LORD is close to the brokenhearted." },
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
          { ref: "1 Thessalonians 5:18", text: "Be thankful in all circumstances, for this is God's will for you who belong to Christ Jesus." },
          { ref: "Psalm 100:4", text: "Enter his gates with thanksgiving; go into his courts with praise. Give thanks to him and praise his name." },
          { ref: "Colossians 3:15-17", text: "And let the peace that comes from Christ rule in your hearts. . . . And always be thankful." },
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
          { ref: "Matthew 6:9-13", text: "'Our Father in heaven, hallowed be your name, your kingdom come, your will be done, on earth as it is in heaven. Give us today our daily bread. And forgive us our debts, as we also have forgiven our debtors. And lead us not into temptation, but deliver us from the evil one.'" },
          { ref: "Romans 8:26", text: "The Holy Spirit helps us in our weakness. For example, we don't know what God wants us to pray for. But the Holy Spirit prays for us with groanings that cannot be expressed in words." },
        ],
        commentary: "Jesus gave us a model prayer that covers worship, submission, provision, forgiveness, and protection. But prayer is not about perfection — even when you don't know what to say, the Holy Spirit intercedes for you. Simply start talking to God like you would a trusted friend. He's listening.",
      },
      {
        id: "prayer-2",
        question: "Does God always answer prayer?",
        verses: [
          { ref: "1 John 5:14-15", text: "We are confident that he hears us whenever we ask for anything that pleases him. And since we know he hears us when we make our requests, we also know that he will give us what we ask for." },
          { ref: "2 Corinthians 12:8-9", text: "Three different times I begged the Lord to take it away. Each time he said, 'My grace is all you need.'" },
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
          { ref: "2 Corinthians 5:17", text: "Anyone who belongs to Christ has become a new person. The old life is gone; a new life has begun!" },
          { ref: "1 Peter 2:9", text: "You are a chosen people. You are royal priests, a holy nation, God's very own possession." },
          { ref: "Ephesians 1:4-5", text: "Even before he made the world, God loved us and chose us in Christ to be holy and without fault in his eyes. God decided in advance to adopt us into his own family by bringing us to himself through Jesus Christ." },
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
          { ref: "Philippians 4:11-13", text: "I have learned how to be content with whatever I have. I know how to live on almost nothing or with everything. I have learned the secret of living in every situation. . . . I can do everything through Christ, who gives me strength." },
          { ref: "Hebrews 13:5", text: "Don't love money; be satisfied with what you have. For God has said, 'I will never fail you. I will never abandon you.'" },
          { ref: "1 Timothy 6:6-8", text: "True godliness with contentment is itself great wealth. After all, we brought nothing with us when we came into the world, and we can't take anything with us when we leave it." },
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
          { ref: "Proverbs 10:9", text: "People with integrity walk safely, but those who follow crooked paths will be exposed." },
          { ref: "Proverbs 11:3", text: "Honesty guides good people; dishonesty destroys treacherous people." },
          { ref: "Luke 16:10", text: "If you are faithful in little things, you will be faithful in large ones. But if you are dishonest in little things, you won't be honest with greater responsibilities." },
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
          { ref: "Mark 9:24", text: "The father instantly cried out, 'I do believe, but help me overcome my unbelief!'" },
          { ref: "Jude 1:22", text: "You must show mercy to those whose faith is wavering." },
          { ref: "Psalm 13:1-2", text: "O LORD, how long will you forget me? Forever? How long will you look the other way?" },
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
          { ref: "2 Corinthians 9:6-7", text: "Remember this — a farmer who plants only a few seeds will get a small crop. But the one who plants generously will get a generous crop. You must each decide in your heart how much to give. And don't give reluctantly or in response to pressure. For God loves a cheerful giver." },
          { ref: "Luke 6:38", text: "Give, and you will receive. Your gift will return to you in full — pressed down, shaken together to make room for more, running over, and poured into your lap." },
          { ref: "Proverbs 11:25", text: "The generous will prosper; those who refresh others will themselves be refreshed." },
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
          { ref: "Psalm 42:11", text: "Why am I discouraged? Why is my heart so sad? I will put my hope in God! I will praise him again — my Savior and my God!" },
          { ref: "1 Kings 19:4-5", text: "He sat down under a solitary broom tree and prayed that he might die. 'I have had enough, LORD,' he said. Then he lay down and slept. But as he was sleeping, an angel touched him and told him, 'Get up and eat!'" },
          { ref: "Isaiah 53:3", text: "He was despised and rejected — a man of sorrows, acquainted with deepest grief." },
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
          { ref: "Proverbs 3:5-6", text: "Trust in the LORD with all your heart; do not depend on your own understanding. Seek his will in all you do, and he will show you which path to take." },
          { ref: "Isaiah 55:8-9", text: "'My thoughts are nothing like your thoughts,' says the LORD. 'And my ways are far beyond anything you could imagine.'" },
          { ref: "Romans 11:33", text: "Oh, how great are God's riches and wisdom and knowledge! How impossible it is for us to understand his decisions and his ways!" },
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
          { ref: "Philippians 2:3-5", text: "Don't be selfish; don't try to impress others. Be humble, thinking of others as better than yourselves. Don't look out only for your own interests, but take an interest in others, too. You must have the same attitude that Christ Jesus had." },
          { ref: "James 4:6", text: "God opposes the proud but gives grace to the humble." },
          { ref: "Micah 6:8", text: "The LORD has told you what is good: to do what is right, to love mercy, and to walk humbly with your God." },
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
          { ref: "Proverbs 22:6", text: "Direct your children onto the right path, and when they are older, they will not leave it." },
          { ref: "Deuteronomy 6:6-7", text: "You must commit yourselves wholeheartedly to these commands that I am giving you today. Repeat them again and again to your children. Talk about them when you are at home and when you are on the road, when you are going to bed and when you are getting up." },
          { ref: "Ephesians 6:4", text: "Fathers, do not provoke your children to anger by the way you treat them. Rather, bring them up with the discipline and instruction that comes from the Lord." },
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
          { ref: "Romans 15:13", text: "I pray that God, the source of hope, will fill you completely with joy and peace because you trust in him. Then you will overflow with confident hope through the power of the Holy Spirit." },
          { ref: "Jeremiah 29:11", text: "'For I know the plans I have for you,' says the LORD. 'They are plans for good and not for disaster, to give you a future and a hope.'" },
          { ref: "Hebrews 6:19", text: "This hope is a strong and trustworthy anchor for our souls." },
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
          { ref: "Exodus 20:8-10", text: "Remember to observe the Sabbath day by keeping it holy. You have six days each week for your ordinary work, but the seventh day is a Sabbath day of rest dedicated to the LORD your God." },
          { ref: "Mark 2:27", text: "Then Jesus said to them, 'The Sabbath was made to meet the needs of people, and not people to meet the requirements of the Sabbath.'" },
          { ref: "Hebrews 4:9-10", text: "So there is a special rest still waiting for the people of God. For all who have entered into God's rest have rested from their labors, just as God did after creating the world." },
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
          { ref: "Micah 6:8", text: "The LORD has told you what is good, and this is what he requires of you: to do what is right, to love mercy, and to walk humbly with your God." },
          { ref: "Isaiah 1:17", text: "Learn to do good. Seek justice. Help the oppressed. Defend the cause of orphans. Fight for the rights of widows." },
          { ref: "Proverbs 31:8-9", text: "Speak up for those who cannot speak for themselves; ensure justice for those being crushed. Yes, speak up for the poor and helpless, and see that they get justice." },
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
          { ref: "Colossians 3:23-24", text: "Work willingly at whatever you do, as though you were working for the Lord rather than for people. Remember that the Lord will give you an inheritance as your reward, and that the Master you are serving is Christ." },
          { ref: "Proverbs 16:3", text: "Commit your actions to the LORD, and your plans will succeed." },
          { ref: "Ecclesiastes 9:10", text: "Whatever you do, do well." },
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
          { ref: "Exodus 25:8", text: "Have the people of Israel build me a holy sanctuary so I can live among them." },
          { ref: "Hebrews 8:1-2", text: "Here is the main point: We have a High Priest who sat down in the place of honor beside the throne of the majestic God in heaven. There he ministers in the heavenly Tabernacle, the true place of worship that was built by the Lord and not by human hands." },
        ],
        commentary: "God's deepest desire has always been to dwell with His people. The earthly sanctuary was a shadow of the heavenly reality where Christ now ministers. It matters because it reveals the full scope of salvation — not just forgiveness at the cross, but ongoing intercession and ultimate vindication of God's character.",
      },
      {
        id: "sanctuary-2",
        question: "How does the sanctuary reveal Jesus?",
        verses: [
          { ref: "John 1:29", text: "Look! The Lamb of God who takes away the sin of the world!" },
          { ref: "Hebrews 9:11-12", text: "So Christ has now become the High Priest over all the good things that have come. He has entered that greater, more perfect Tabernacle in heaven. With his own blood — not the blood of goats and calves — he entered the Most Holy Place once for all time and secured our redemption forever." },
          { ref: "John 14:6", text: "I am the way, the truth, and the life. No one can come to the Father except through me." },
        ],
        commentary: "Every element of the sanctuary points to Christ. He is the sacrificial Lamb at the altar of burnt offering, the Bread of Life on the table of showbread, the Light of the World on the lampstand, and our Intercessor at the altar of incense. The veil torn at His death opened the way into God's presence for all who believe.",
      },
      {
        id: "sanctuary-3",
        question: "What is Christ doing in the heavenly sanctuary now?",
        verses: [
          { ref: "Hebrews 7:25", text: "Therefore he is able, once and forever, to save those who come to God through him. He lives forever to intercede with God on their behalf." },
          { ref: "1 John 2:1", text: "My dear children, I am writing this to you so that you will not sin. But if anyone does sin, we have an advocate who pleads our case before the Father. He is Jesus Christ, the one who is truly righteous." },
          { ref: "Hebrews 4:15-16", text: "This High Priest of ours understands our weaknesses, for he faced all of the same testings we do, yet he did not sin. So let us come boldly to the throne of our gracious God." },
        ],
        commentary: "Right now, Jesus is not distant or disengaged. He is actively interceding for you in heaven's sanctuary. He applies the merits of His sacrifice to your daily struggles, weaknesses, and failures. Because He was tempted in every way yet without sin, He understands your battles and invites you to come boldly — not timidly — to the throne of grace.",
      },
      {
        id: "sanctuary-4",
        question: "What does the Day of Atonement teach us?",
        verses: [
          { ref: "Leviticus 16:30", text: "On that day offerings of purification will be made for you, and you will be cleansed in the LORD's presence from all your sins." },
          { ref: "Daniel 8:14", text: "He said to me, 'It will take 2,300 evenings and mornings; then the holy place will be properly restored.'" },
          { ref: "Revelation 14:7", text: "Fear God and give glory to Him, for the hour of His judgment has come. Worship Him who made the heavens and the earth and sea and springs of water." },
        ],
        commentary: "The Day of Atonement was the most solemn day of the Israelite year — a day of cleansing, judgment, and restoration. Adventists understand that since 1844, Christ has been engaged in a final work of atonement in the Most Holy Place of the heavenly sanctuary. This is not about condemnation but about vindicating God's people and demonstrating the fairness of His character before the universe.",
      },
      {
        id: "sanctuary-5",
        question: "How does the sanctuary give me assurance today?",
        verses: [
          { ref: "Hebrews 10:19-22", text: "And so, dear brothers and sisters, we can boldly enter heaven's Most Holy Place because of the blood of Jesus. By his death, Jesus opened a new and life-giving way through the curtain into the Most Holy Place. And since we have a great High Priest who rules over God's house, let us go right into the presence of God with sincere hearts fully trusting him." },
          { ref: "Romans 8:34", text: "Who then will condemn us? No one — for Christ Jesus died for us and was raised to life for us, and he is sitting in the place of honor at God's right hand, pleading for us." },
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
          { ref: "John 14:1-3", text: "Don't let your hearts be troubled. Trust in God, and trust also in me. There is more than enough room in my Father's home. If this were not so, would I have told you that I am going to prepare a place for you? When everything is ready, I will come and get you, so that you will always be with me where I am." },
          { ref: "Acts 1:10-11", text: "As they strained to see him rising into heaven, two white-robed men suddenly stood among them. 'Men of Galilee,' they said, 'why are you standing here staring into heaven? Jesus has been taken from you into heaven, but someday he will return from heaven in the same way you saw him go!'" },
          { ref: "Revelation 22:20", text: "He who is the faithful witness to all these things says, 'Yes, I am coming soon!' Amen! Come, Lord Jesus!" },
        ],
        commentary: "Jesus Himself promised to return. Angels confirmed it. The apostles taught it. Revelation closes with it. The second coming is the most frequently mentioned doctrine in the New Testament. It is not wishful thinking — it is a covenant promise from the One who has never broken a promise.",
      },
      {
        id: "second-coming-2",
        question: "What will the second coming look like?",
        verses: [
          { ref: "Matthew 24:27", text: "For as the lightning flashes in the east and shines to the west, so it will be when the Son of Man comes." },
          { ref: "Revelation 1:7", text: "Look! He comes with the clouds of heaven. And everyone will see him — even those who pierced him. And all the nations of the world will mourn for him. Yes! Amen!" },
          { ref: "1 Thessalonians 4:16-17", text: "For the Lord himself will come down from heaven with a commanding shout, with the voice of the archangel, and with the trumpet call of God. First, the believers who have died will rise from their graves. Then, together with them, we who are still alive and remain on the earth will be caught up in the clouds to meet the Lord in the air." },
        ],
        commentary: "The second coming will be unmistakable. It will be visible like lightning across the sky, audible with shouts and trumpets, and universal — every eye will see Him. There will be no secret about it. Christ will come in blazing glory, surrounded by angels, and the entire earth will witness it. This truth protects us from deceptions that claim He has already come secretly.",
      },
      {
        id: "second-coming-3",
        question: "What are the signs that Jesus is coming soon?",
        verses: [
          { ref: "Matthew 24:6-8", text: "You will hear of wars and threats of wars, but don't panic. Yes, these things must take place, but the end won't follow immediately. Nation will go to war against nation, and kingdom against kingdom. There will be famines and earthquakes in many parts of the world. But all this is only the first of the birth pains." },
          { ref: "2 Timothy 3:1-5", text: "In the last days there will be very difficult times. For people will love only themselves and their money. They will be boastful and proud, scoffing at God, disobedient to their parents, and ungrateful. They will consider nothing sacred." },
          { ref: "Matthew 24:14", text: "And the Good News about the Kingdom will be preached throughout the whole world, so that all nations will hear it; and then the end will come." },
        ],
        commentary: "Jesus gave us signs not to set dates but to keep us watchful and hopeful. The moral decay, natural disasters, wars, and global proclamation of the gospel we see today all point to His soon return. These signs are not meant to frighten us — they are meant to assure us that God is still in control and that He is keeping His promise.",
      },
      {
        id: "second-coming-4",
        question: "How should I live in light of Christ's return?",
        verses: [
          { ref: "Titus 2:12-13", text: "And we are instructed to turn from godless living and sinful pleasures. We should live in this evil world with wisdom, righteousness, and devotion to God, while we look forward with hope to that wonderful day when the glory of our great God and Savior, Jesus Christ, will be revealed." },
          { ref: "2 Peter 3:11-12", text: "Since everything around us is going to be destroyed like this, what holy and godly lives you should live, looking forward to the day of God and hurrying it along." },
        ],
        commentary: "The hope of Christ's return is not an excuse to sit idle — it is the greatest motivation for holy living. When you truly believe Jesus is coming, it changes how you treat people, how you spend your time, and what you prioritise. We are to live with wisdom and devotion, not in fear but in joyful anticipation.",
      },
      {
        id: "second-coming-5",
        question: "What happens to believers when Jesus returns?",
        verses: [
          { ref: "1 Corinthians 15:51-53", text: "But let me reveal to you a wonderful secret. We will not all die, but we will all be transformed! It will happen in a moment, in the blink of an eye, when the last trumpet is blown. For when the trumpet sounds, those who have died will be raised to live forever. And we who are living will also be transformed." },
          { ref: "Philippians 3:20-21", text: "But we are citizens of heaven, where the Lord Jesus Christ lives. And we are eagerly waiting for him to return as our Savior. He will take our weak mortal bodies and change them into glorious bodies like his own." },
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
          { ref: "Revelation 14:6-7", text: "And I saw another angel flying through the sky, carrying the eternal Good News to proclaim to the people who belong to this world — to every nation, tribe, language, and people. 'Fear God,' he shouted. 'Give glory to him. For the time has come when he will sit as judge. Worship him who made the heavens, the earth, the sea, and all the springs of water.'" },
          { ref: "Ecclesiastes 12:13", text: "Here now is my final conclusion: Fear God and obey his commands, for this is everyone's duty." },
        ],
        commentary: "The first angel proclaims the everlasting gospel and calls every human to worship God as Creator. In an age of evolution and secularism, this is a radical declaration: there IS a Creator, and He deserves our reverence. The language echoes the fourth commandment — Sabbath keeping is an act of acknowledging God as the One who made all things. The hour of judgment has arrived, and the invitation is urgent but gracious.",
      },
      {
        id: "three-angels-2",
        question: "What is the second angel's message?",
        verses: [
          { ref: "Revelation 14:8", text: "Then another angel followed him through the sky, shouting, 'Babylon is fallen — that great city is fallen — because she made all the nations of the world drink the wine of her passionate immorality.'" },
          { ref: "Revelation 18:4", text: "Then I heard another voice calling from heaven, 'Come away from her, my people. Do not take part in her sins, or you will be punished with her.'" },
        ],
        commentary: "Babylon represents religious confusion and false teachings that have led people away from biblical truth. The second angel declares that these systems of error are collapsing. God lovingly calls His people out of confusion and back to His Word. This is not an attack on sincere believers in other traditions — it is a call to examine every teaching by Scripture alone.",
      },
      {
        id: "three-angels-3",
        question: "What is the third angel's message?",
        verses: [
          { ref: "Revelation 14:9-10", text: "Then a third angel followed them, shouting, 'Anyone who worships the beast and his statue or who accepts his mark on the forehead or on the hand must drink the wine of God's anger.'" },
          { ref: "Revelation 14:12", text: "This calls for patient endurance on the part of the people of God who keep his commands and remain faithful to Jesus." },
        ],
        commentary: "The third angel warns against compromising with false worship systems. The mark of the beast is not a barcode or a microchip — it represents a choice to follow human authority over God's authority. Those who remain faithful are characterised by two things: they keep God's commandments and they hold to the faith of Jesus. Obedience and trust in Christ go hand in hand.",
      },
      {
        id: "three-angels-4",
        question: "Why are these messages relevant today?",
        verses: [
          { ref: "Matthew 24:24", text: "For false messiahs and false prophets will rise up and perform great signs and wonders so as to deceive, if possible, even God's chosen ones." },
          { ref: "2 Thessalonians 2:9-10", text: "This man will come to do the work of Satan with counterfeit power and signs and miracles. He will use every kind of evil deception to fool those on their way to destruction." },
          { ref: "Revelation 12:17", text: "And the dragon was angry at the woman and declared war against the rest of her children — all who keep God's commandments and maintain their testimony for Jesus." },
        ],
        commentary: "These messages become more urgent as history moves toward its climax. In a world of growing spiritual deception, competing truth claims, and pressure to compromise, the three angels' messages provide clarity. They remind us that the great controversy between Christ and Satan is real, the stakes are eternal, and God has given us everything we need to stand firm.",
      },
      {
        id: "three-angels-5",
        question: "How do I share these messages with love?",
        verses: [
          { ref: "1 Peter 3:15", text: "Instead, you must worship Christ as Lord of your life. And if someone asks about your hope as a believer, always be ready to explain it. But do this in a gentle and respectful way." },
          { ref: "Colossians 4:5-6", text: "Live wisely among those who are not believers, and make the most of every opportunity. Let your conversation be gracious and attractive so that you will have the right response for everyone." },
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
          { ref: "1 Corinthians 6:19-20", text: "Don't you realize that your body is the temple of the Holy Spirit, who lives in you and was given to you by God? You do not belong to yourself, for God bought you with a high price. So you must honor God with your body." },
          { ref: "3 John 1:2", text: "Dear friend, I hope all is well with you and that you are as healthy in body as you are strong in spirit." },
          { ref: "1 Corinthians 10:31", text: "So whether you eat or drink, or whatever you do, do it all for the glory of God." },
        ],
        commentary: "God created you as an integrated whole — body, mind, and spirit are inseparably connected. What affects one affects all. Your body is not a prison for the soul but a temple for God's Spirit. Caring for your health is an act of worship and a response to the incredible price God paid to redeem you. He wants you to thrive, not merely survive.",
      },
      {
        id: "health-2",
        question: "What does the Bible teach about diet?",
        verses: [
          { ref: "Genesis 1:29", text: "Then God said, 'Look! I have given you every seed-bearing plant throughout the earth and all the fruit trees for your food.'" },
          { ref: "Daniel 1:12-15", text: "Please test us for ten days on a diet of vegetables and water. At the end of the ten days, Daniel and his three friends looked healthier and better nourished than the young men who had been eating the food assigned by the king." },
          { ref: "Leviticus 11:1-3", text: "Then the LORD said to Moses and Aaron, 'Give the following instructions to the people of Israel. Of all the land animals, these are the ones you may use for food.'" },
        ],
        commentary: "God's original diet in Eden was plant-based — fruits, grains, nuts, and vegetables. After the flood, clean meats were permitted, but the ideal remains. Daniel's experience shows that God's dietary principles produce observable health benefits. Many Adventists choose vegetarianism not as law but as wisdom — honouring the original design while enjoying the abundance God provides.",
      },
      {
        id: "health-3",
        question: "How does rest and Sabbath relate to health?",
        verses: [
          { ref: "Exodus 20:8-10", text: "Remember to observe the Sabbath day by keeping it holy. You have six days each week for your ordinary work, but the seventh day is a Sabbath day of rest dedicated to the LORD your God." },
          { ref: "Mark 6:31", text: "Then Jesus said, 'Let's go off by ourselves to a quiet place and rest awhile.' He said this because there were so many people coming and going that Jesus and his apostles didn't even have time to eat." },
          { ref: "Psalm 127:2", text: "It is useless for you to work so hard from early morning until late at night, anxiously working for food to eat; for God gives rest to his loved ones." },
        ],
        commentary: "Rest is not laziness — it is a divine prescription. God Himself rested on the seventh day, not because He was tired but to model the rhythm of work and rest that humans need. The weekly Sabbath is God's gift of time — a sanctuary in time where we cease striving, connect with God, and allow our bodies and minds to be restored. Modern science confirms what Scripture has always taught: we are designed for rhythmic rest.",
      },
      {
        id: "health-4",
        question: "What about temperance and self-control?",
        verses: [
          { ref: "1 Corinthians 9:25", text: "All athletes are disciplined in their training. They do it to win a prize that will fade away, but we do it for an eternal prize." },
          { ref: "Proverbs 25:28", text: "A person without self-control is like a city with broken-down walls." },
          { ref: "Galatians 5:22-23", text: "But the Holy Spirit produces this kind of fruit in our lives: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control." },
        ],
        commentary: "Temperance means moderation in good things and total abstinence from harmful things. It is not about deprivation but about freedom — the freedom that comes from not being controlled by appetite, addiction, or excess. Self-control is a fruit of the Holy Spirit, which means it is a gift from God, not just willpower. Ask Him for it and He will provide.",
      },
      {
        id: "health-5",
        question: "How does mental and emotional health connect to faith?",
        verses: [
          { ref: "Philippians 4:6-7", text: "Don't worry about anything; instead, pray about everything. Tell God what you need, and thank him for all he has done. Then you will experience God's peace, which exceeds anything we can understand. His peace will guard your hearts and minds as you live in Christ Jesus." },
          { ref: "Proverbs 17:22", text: "A cheerful heart is good medicine, but a broken spirit saps a person's strength." },
          { ref: "Isaiah 26:3", text: "You will keep in perfect peace all who trust in you, all whose thoughts are fixed on you!" },
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
          { ref: "Ecclesiastes 9:5", text: "The living at least know they will die, but the dead know nothing. They have no further reward, and are even forgotten." },
          { ref: "Psalm 146:4", text: "When they breathe their last, they return to the earth, and all their plans die with them." },
          { ref: "John 11:11-14", text: "Then he said, 'Our friend Lazarus has fallen asleep, but now I will go and wake him up.' The disciples said, 'Lord, if he is sleeping, he will soon get better!' They thought Jesus meant Lazarus was simply sleeping, but Jesus meant Lazarus had died. So he told them plainly, 'Lazarus is dead.'" },
        ],
        commentary: "The Bible consistently describes death as a sleep — an unconscious state where there is no thought, no awareness, and no activity. Jesus Himself used this language when speaking of Lazarus. The dead are not watching us from above or suffering below. They are at rest, awaiting the great awakening at Christ's return. This is not a harsh truth — it is a merciful one.",
      },
      {
        id: "state-dead-2",
        question: "Do the dead go immediately to heaven or hell?",
        verses: [
          { ref: "John 5:28-29", text: "Don't be so surprised! Indeed, the time is coming when all the dead in their graves will hear the voice of God's Son, and they will rise again. Those who have done good will rise to experience eternal life, and those who have continued in evil will rise to experience judgment." },
          { ref: "Acts 2:29, 34", text: "Dear brothers, think about this! You can be sure that the patriarch David wasn't referring to himself, for he died and was buried, and his tomb is still here among us. For David did not ascend into heaven." },
          { ref: "1 Thessalonians 4:16", text: "For the Lord himself will come down from heaven with a commanding shout, with the voice of the archangel, and with the trumpet call of God. First, the believers who have died will rise from their graves." },
        ],
        commentary: "If the righteous went to heaven at death, there would be no need for a resurrection or a second coming. The Bible teaches that even King David — a man after God's own heart — has not yet ascended to heaven. The dead await the resurrection when Christ returns. This is not a loss but a promise: the next conscious moment for a person who dies in Christ is seeing His face in glory.",
      },
      {
        id: "state-dead-3",
        question: "Why does this teaching matter practically?",
        verses: [
          { ref: "Deuteronomy 18:10-12", text: "For example, never sacrifice your son or daughter as a burnt offering. And do not let your people practice fortune-telling, or use sorcery, or interpret omens, or engage in witchcraft, or cast spells, or function as mediums or psychics, or call forth the spirits of the dead." },
          { ref: "2 Corinthians 11:14", text: "But I am not surprised! Even Satan disguises himself as an angel of light." },
          { ref: "Isaiah 8:19-20", text: "Someone may say to you, 'Let's ask the mediums and those who consult the spirits of the dead.' But shouldn't people ask God for guidance? Should the living seek guidance from the dead? Look to God's instructions and teachings!" },
        ],
        commentary: "Understanding the state of the dead is one of the greatest protections against spiritual deception. If the dead are unconscious, then any spirit claiming to be a departed loved one is a counterfeit — a demonic impersonation. This truth shields us from spiritualism, necromancy, and the great final deception. It also frees us from the cruel doctrine of an ever-burning hell, revealing a God of justice and mercy.",
      },
      {
        id: "state-dead-4",
        question: "What is the resurrection hope?",
        verses: [
          { ref: "1 Corinthians 15:20-22", text: "But in fact, Christ has been raised from the dead. He is the first of a great harvest of all who have died. So you see, just as death came into the world through a man, now the resurrection from the dead has begun through another man. Just as everyone dies because we all belong to Adam, everyone who belongs to Christ will be given new life." },
          { ref: "Job 19:25-26", text: "But as for me, I know that my Redeemer lives, and he will stand upon the earth at last. And after my body has decayed, yet in my body I will see God!" },
        ],
        commentary: "The resurrection is the Bible's true hope for the dead — not an ethereal existence as disembodied spirits but a bodily resurrection in glory. Christ's own resurrection guarantees ours. Job, in his deepest suffering, clung to this hope: 'I know that my Redeemer lives!' The resurrection morning will be the greatest reunion in the history of the universe.",
      },
      {
        id: "state-dead-5",
        question: "How should this truth comfort me in grief?",
        verses: [
          { ref: "1 Thessalonians 4:13-14", text: "And now, dear brothers and sisters, we want you to know what will happen to the believers who have died so you will not grieve like people who have no hope. For since we believe that Jesus died and was raised to life again, we also believe that when Jesus returns, God will bring back with him the believers who have died." },
          { ref: "Revelation 21:4", text: "He will wipe every tear from their eyes, and there will be no more death or sorrow or crying or pain. All these things are gone forever." },
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
          { ref: "Isaiah 14:12-14", text: "How you are fallen from heaven, O shining star, son of the morning! You have been thrown down to the earth. For you said to yourself, 'I will ascend to heaven and set my throne above God's stars. I will preside on the mountain of the gods. I will climb to the highest heavens and be like the Most High.'" },
          { ref: "Ezekiel 28:15, 17", text: "You were blameless in all you did from the day you were created until the day evil was found in you. Your heart was filled with pride because of all your beauty. Your wisdom was corrupted by your love of splendour." },
          { ref: "Revelation 12:7-9", text: "Then there was war in heaven. Michael and his angels fought against the dragon and his angels. And the dragon lost the battle, and he and his angels were forced out of heaven. This great dragon — the ancient serpent called the devil, or Satan, the one deceiving the whole world — was thrown down to the earth with all his angels." },
        ],
        commentary: "The great controversy began not with humanity but with a perfect angel in a perfect heaven. Lucifer's sin was pride — the desire to be equal with God, to receive worship, and to challenge God's government of love. When war broke out in heaven, Satan and his followers were cast to earth. This cosmic conflict explains why a good God allows evil: He is demonstrating before the universe that love, not force, is the foundation of His kingdom.",
      },
      {
        id: "great-controversy-2",
        question: "Why does God allow suffering if He is all-powerful?",
        verses: [
          { ref: "Genesis 3:1-4", text: "The serpent was the shrewdest of all the wild animals the LORD God had made. One day he asked the woman, 'Did God really say you must not eat the fruit from any of the trees in the garden?' 'Of course we may eat fruit from the trees in the garden,' the woman replied. 'It's only the fruit from the tree in the middle of the garden that we are not allowed to eat. God said, \"You must not eat it or even touch it; if you do, you will die.\" You won\\'t die!' the serpent replied to the woman." },
          { ref: "Romans 5:12", text: "When Adam sinned, sin entered the world. Adam's sin brought death, so death spread to everyone, for everyone sinned." },
          { ref: "1 John 3:8", text: "But the Son of God came to destroy the works of the devil." },
        ],
        commentary: "God allows suffering not because He is indifferent but because He respects the freedom He gave His creatures. To destroy evil by force would only prove Satan's accusation that God is a tyrant. Instead, God chose to defeat evil through self-sacrificing love demonstrated at the cross. The suffering we see is the result of sin, not God's will — and Jesus came specifically to destroy the works of the devil.",
      },
      {
        id: "great-controversy-3",
        question: "How did Jesus win the great controversy?",
        verses: [
          { ref: "Colossians 2:15", text: "In this way, he disarmed the spiritual rulers and authorities. He shamed them publicly by his victory over them on the cross." },
          { ref: "Hebrews 2:14", text: "Because God's children are human beings — made of flesh and blood — the Son also became flesh and blood. For only as a human being could he die, and only by dying could he break the power of the devil, who had the power of death." },
          { ref: "John 12:31-32", text: "The time for judging this world has come, when Satan, the ruler of this world, will be cast out. And when I am lifted up from the earth, I will draw everyone to myself." },
        ],
        commentary: "The cross is the decisive battle of the great controversy. There, Jesus publicly defeated Satan — not by force but by dying in our place. Satan's accusations about God's character were forever answered at Calvary: God is not selfish, He is self-sacrificing. God is not unjust, He bore justice Himself. The cross disarmed Satan and drew the whole universe to worship a God who would die for His enemies.",
      },
      {
        id: "great-controversy-4",
        question: "How will the great controversy end?",
        verses: [
          { ref: "Revelation 21:1-4", text: "Then I saw a new heaven and a new earth, for the old heaven and the old earth had disappeared. And I saw the holy city, the new Jerusalem, coming down from God out of heaven. I heard a loud shout from the throne, saying, 'Look, God's home is now among his people! He will live with them, and they will be his people. God himself will be with them. He will wipe every tear from their eyes, and there will be no more death or sorrow or crying or pain.'" },
          { ref: "Revelation 20:10, 14", text: "Then the devil, who had deceived them, was thrown into the lake of fire. Then death and the grave were also thrown into the lake of fire. This lake of fire is the second death." },
          { ref: "Nahum 1:9", text: "Whatever they plot against the LORD, he will bring to an end; trouble will not come a second time." },
        ],
        commentary: "The great controversy ends with the complete eradication of sin, suffering, and death. God does not torture sinners forever — sin and sinners are consumed in the lake of fire and simply cease to exist. Then God creates a new heaven and new earth where He dwells with His people forever. And Nahum's promise guarantees: sin will never rise again. The universe will be safe and joyful for all eternity.",
      },
      {
        id: "great-controversy-5",
        question: "What does this mean for my daily life?",
        verses: [
          { ref: "Ephesians 6:12", text: "For we are not fighting against flesh-and-blood enemies, but against evil rulers and authorities of the unseen world, against mighty powers in this dark world, and against evil spirits in the heavenly places." },
          { ref: "Romans 8:37-39", text: "No, despite all these things, overwhelming victory is ours through Christ, who loved us. And I am convinced that nothing can ever separate us from God's love." },
          { ref: "James 4:7", text: "So humble yourselves before God. Resist the devil, and he will flee from you." },
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
          { ref: "1 Peter 4:10", text: "God has given each of you a gift from his great variety of spiritual gifts. Use them well to serve one another." },
          { ref: "Matthew 25:21", text: "The master was full of praise. 'Well done, my good and faithful servant. You have been faithful in handling this small amount, so now I will give you many more responsibilities. Let's celebrate together!'" },
          { ref: "1 Corinthians 4:2", text: "Now, a person who is put in charge as a manager must be faithful." },
        ],
        commentary: "A steward is someone entrusted with managing what belongs to another. In the biblical vision, God is the owner of everything and we are His managers. This is not a burden but a privilege — God trusts us with His resources and celebrates our faithfulness. The parable of the talents reminds us that faithfulness in small things opens the door to greater responsibility and deeper joy.",
      },
      {
        id: "stewardship-2",
        question: "How can I be a better steward of my time and resources?",
        verses: [
          { ref: "Ephesians 5:15-16", text: "So be careful how you live. Don't live like fools, but like those who are wise. Make the most of every opportunity in these evil days." },
          { ref: "Proverbs 3:9-10", text: "Honor the LORD with your wealth and with the best part of everything you produce. Then he will fill your barns with grain, and your vats will overflow with good wine." },
        ],
        commentary: "Better stewardship starts with intentionality. Honour God first with the best of what you have, not what is left over. Be deliberate about how you spend your hours, your energy, and your money. Ask God each morning how He would have you invest the day. When we prioritise His purposes, He promises provision beyond what we imagined.",
      },
      {
        id: "stewardship-3",
        question: "Does God care about how I manage my finances?",
        verses: [
          { ref: "Luke 16:10-11", text: "If you are faithful in little things, you will be faithful in large ones. But if you are dishonest in little things, you won't be honest with greater responsibilities. And if you are untrustworthy about worldly wealth, who will trust you with the true riches of heaven?" },
          { ref: "Malachi 3:10", text: "Bring all the tithes into the storehouse so there will be enough food in my Temple. If you do, says the LORD of Heaven's Armies, I will open the windows of heaven for you. I will pour out a blessing so great you won't have enough room to take it in!" },
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
          { ref: "Mark 10:45", text: "For even the Son of Man came not to be served but to serve others and to give his life as a ransom for many." },
          { ref: "Galatians 5:13", text: "For you have been called to live in freedom, my brothers and sisters. But don't use your freedom to satisfy your sinful nature. Instead, use your freedom to serve one another in love." },
          { ref: "Matthew 25:40", text: "And the King will say, 'I tell you the truth, when you did it to one of the least of these my brothers and sisters, you were doing it to me!'" },
        ],
        commentary: "Service is the language of love in God's kingdom. Jesus modelled it perfectly — the King of the universe took the posture of a servant. When we serve others, especially those who cannot return the favour, we encounter Christ himself. God calls us to serve not to earn His love, but because His love overflows through us into the lives of others.",
      },
      {
        id: "serving-others-2",
        question: "How can I find meaningful ways to serve in my community?",
        verses: [
          { ref: "1 Peter 4:10", text: "God has given each of you a gift from his great variety of spiritual gifts. Use them well to serve one another." },
          { ref: "James 2:15-17", text: "Suppose you see a brother or sister who has no food or clothing, and you say, 'Good-bye and have a good day; stay warm and eat well' — but then you don't give that person any food or clothing. What good does that do? So you see, faith by itself isn't enough. Unless it produces good deeds, it is dead and useless." },
        ],
        commentary: "God has wired you with unique gifts for a reason. Look around your community — where is there need? Start where you are, with what you have. Feed someone who is hungry, visit someone who is lonely, mentor someone who is lost. Faith without works is dead, but when your faith becomes action, it brings life to everyone it touches.",
      },
      {
        id: "serving-others-3",
        question: "What does servant leadership look like?",
        verses: [
          { ref: "John 13:14-15", text: "And since I, your Lord and Teacher, have washed your feet, you ought to wash each other's feet. I have given you an example to follow. Do as I have done to you." },
          { ref: "Philippians 2:3-4", text: "Don't be selfish; don't try to impress others. Be humble, thinking of others as better than yourselves. Don't look out only for your own interests, but take an interest in others, too." },
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
          { ref: "Isaiah 58:6", text: "No, this is the kind of fasting I want: Free those who are wrongly imprisoned; lighten the burden of those who work for you. Let the oppressed go free, and remove the chains that bind people." },
          { ref: "Matthew 6:16-18", text: "And when you fast, don't make it obvious, as the hypocrites do, for they try to look miserable and disheveled so people will admire them for their fasting. I tell you the truth, that is the only reward they will ever get. But when you fast, comb your hair and wash your face. Then no one will notice that you are fasting, except your Father, who knows what you do in private. And your Father, who sees everything, will reward you." },
          { ref: "Joel 2:12", text: "That is why the LORD says, 'Turn to me now, while there is time. Give me your hearts. Come with fasting, weeping, and mourning.'" },
        ],
        commentary: "God-honoured fasting is not a performance — it is a posture of the heart. Isaiah 58 reveals that true fasting is inseparable from justice and compassion. Jesus assumed His followers would fast ('when you fast,' not 'if'), but He warned against using it for show. Fasting creates holy hunger — a longing for God that nothing else can satisfy.",
      },
      {
        id: "fasting-2",
        question: "How should I begin fasting?",
        verses: [
          { ref: "Matthew 4:1-2", text: "Then Jesus was led by the Spirit into the wilderness to be tempted there by the devil. For forty days and forty nights he fasted and became very hungry." },
          { ref: "Acts 13:2-3", text: "One day as these men were worshiping the Lord and fasting, the Holy Spirit said, 'Appoint Barnabas and Saul for the special work to which I have called them.' So after more fasting and prayer, the men laid their hands on them and sent them on their way." },
        ],
        commentary: "Start simply. You do not need to fast for forty days like Jesus. Begin with a single meal, a full day, or even fasting from media or entertainment. Pair your fast with prayer and Scripture reading — fill the space you create with time in God's presence. The early church fasted before major decisions, and you can follow their example when seeking guidance for important choices in your own life.",
      },
      {
        id: "fasting-3",
        question: "Does fasting still matter today?",
        verses: [
          { ref: "Matthew 9:14-15", text: "One day the disciples of John the Baptist came to Jesus and asked him, 'Why don't your disciples fast like we do and the Pharisees do?' Jesus replied, 'Do wedding guests mourn while celebrating with the groom? Of course not. But someday the groom will be taken away from them, and then they will fast.'" },
          { ref: "Daniel 10:2-3", text: "When this vision came to me, I, Daniel, had been in mourning for three whole weeks. All that time I had eaten no rich food. No meat or wine crossed my lips, and I used no fragrant lotions until those three weeks had passed." },
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
          { ref: "Romans 6:3-4", text: "Or have you forgotten that when we were joined with Christ Jesus in baptism, we joined him in his death? For we died and were buried with Christ by baptism. And just as Christ was raised from the dead by the glorious power of the Father, now we also may live new lives." },
          { ref: "Matthew 28:19-20", text: "Therefore, go and make disciples of all the nations, baptizing them in the name of the Father and the Son and the Holy Spirit. Teach these new disciples to obey all the commands I have given you." },
          { ref: "Acts 2:38", text: "Peter replied, 'Each of you must repent of your sins and turn to God, and be baptized in the name of Jesus Christ for the forgiveness of your sins. Then you will receive the gift of the Holy Spirit.'" },
        ],
        commentary: "Baptism is the outward expression of an inward transformation. When you go under the water, you are symbolically buried with Christ; when you rise, you emerge into new life. Jesus himself was baptised, and He commanded His followers to do the same. It is an act of obedience, a testimony to the world, and a beautiful beginning to your public walk with God.",
      },
      {
        id: "baptism-2",
        question: "What does baptism by immersion represent?",
        verses: [
          { ref: "Colossians 2:12", text: "For you were buried with Christ when you were baptized. And with him you were raised to new life because you trusted the mighty power of God, who raised Christ from the dead." },
          { ref: "Mark 1:9-10", text: "One day Jesus came from Nazareth in Galilee, and John baptized him in the Jordan River. As Jesus came up out of the water, he saw the heavens splitting apart and the Holy Spirit descending on him like a dove." },
        ],
        commentary: "Baptism by immersion tells the gospel story with your body — burial and resurrection. When Jesus was baptised in the Jordan, He went down into the water and came up out of it. This is the pattern of New Testament baptism. Going fully under the water represents the complete death of the old life; rising up represents the complete newness of the life Christ gives.",
      },
      {
        id: "baptism-3",
        question: "When should I be baptised?",
        verses: [
          { ref: "Acts 8:36-37", text: "As they rode along, they came to some water, and the eunuch said, 'Look! There's some water! Why can't I be baptized?'" },
          { ref: "Acts 22:16", text: "What are you waiting for? Get up and be baptized. Have your sins washed away by calling on the name of the Lord." },
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
          { ref: "Luke 9:23", text: "Then he said to the crowd, 'If any of you wants to be my follower, you must give up your own way, take up your cross daily, and follow me.'" },
          { ref: "John 8:31-32", text: "Jesus said to the people who believed in him, 'You are truly my disciples if you remain faithful to my teachings. And you will know the truth, and the truth will set you free.'" },
          { ref: "Matthew 4:19", text: "Jesus called out to them, 'Come, follow me, and I will show you how to fish for people!'" },
        ],
        commentary: "A disciple is not simply someone who agrees with Jesus — it is someone who follows Him. Jesus calls us to deny ourselves, take up our cross, and walk in His footsteps daily. This is not a one-time decision but a daily surrender. The reward is freedom, purpose, and the privilege of being shaped by the greatest Teacher who ever lived.",
      },
      {
        id: "discipleship-2",
        question: "How do I grow as a disciple?",
        verses: [
          { ref: "2 Timothy 2:15", text: "Work hard so you can present yourself to God and receive his approval. Be a good worker, one who does not need to be ashamed and who correctly explains the word of truth." },
          { ref: "Hebrews 5:14", text: "Solid food is for those who are mature, who through training have the skill to recognize the difference between right and wrong." },
          { ref: "Psalm 119:105", text: "Your word is a lamp to guide my feet and a light for my path." },
        ],
        commentary: "Growth in discipleship comes through consistent spiritual habits: studying Scripture, prayer, worship, fellowship, and service. Like physical fitness, spiritual maturity does not happen overnight. It requires training, discipline, and patience. But as you invest time in God's Word and in community with other believers, you will find your ability to discern God's voice and follow His leading grows stronger every day.",
      },
      {
        id: "discipleship-3",
        question: "How do I make disciples of others?",
        verses: [
          { ref: "Matthew 28:19-20", text: "Therefore, go and make disciples of all the nations, baptizing them in the name of the Father and the Son and the Holy Spirit. Teach these new disciples to obey all the commands I have given you." },
          { ref: "2 Timothy 2:2", text: "You have heard me teach things that have been confirmed by many reliable witnesses. Now teach these truths to other trustworthy people who will be able to pass them on to others." },
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
          { ref: "John 3:16", text: "For this is how God loved the world: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life." },
          { ref: "Romans 5:8", text: "But God showed his great love for us by sending Christ to die for us while we were still sinners." },
          { ref: "1 John 3:1", text: "See how very much our Father loves us, for he calls us his children, and that is what we are!" },
        ],
        commentary: "God's love is not based on your performance — He loved you while you were still far from Him. The cross is the ultimate measurement of His love: He gave everything so you could have everything. You are not merely tolerated by God; you are cherished, chosen, and called His child. Let that truth sink deep into your heart today.",
      },
      {
        id: "gods-love-2",
        question: "Can anything separate me from God's love?",
        verses: [
          { ref: "Romans 8:38-39", text: "And I am convinced that nothing can ever separate us from God's love. Neither death nor life, neither angels nor demons, neither our fears for today nor our worries about tomorrow — not even the powers of hell can separate us from God's love that is revealed in Christ Jesus our Lord." },
          { ref: "Psalm 139:7-10", text: "I can never escape from your Spirit! I can never get away from your presence! If I go up to heaven, you are there; if I go down to the grave, you are there. If I ride the wings of the morning, if I dwell by the farthest oceans, even there your hand will guide me, and your strength will support me." },
        ],
        commentary: "Paul's declaration in Romans 8 is one of the most powerful promises in all of Scripture. No failure, no fear, no force in all creation can pry you from God's loving grip. His love is not fragile — it is unbreakable. Even when you cannot feel it, His love surrounds you. There is nowhere you can go where His presence will not find you.",
      },
      {
        id: "gods-love-3",
        question: "How do I experience God's love in daily life?",
        verses: [
          { ref: "Jeremiah 31:3", text: "Long ago the LORD said to Israel: 'I have loved you, my people, with an everlasting love. With unfailing love I have drawn you to myself.'" },
          { ref: "Zephaniah 3:17", text: "For the LORD your God is living among you. He is a mighty savior. He will take delight in you with gladness. With his love, he will calm all your fears. He will rejoice over you with joyful songs." },
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
          { ref: "Ephesians 2:8-9", text: "God saved you by his grace when you believed. And you can't take credit for this; it is a gift from God. Salvation is not a reward for the good things we have done, so none of us can boast about it." },
          { ref: "Titus 3:5", text: "He saved us, not because of the righteous things we had done, but because of his mercy. He washed away our sins, giving us a new birth and new life through the Holy Spirit." },
          { ref: "Romans 3:23-24", text: "For everyone has sinned; we all fall short of God's glorious standard. Yet God, in his grace, freely makes us right in his sight. He did this through Christ Jesus when he freed us from the penalty for our sins." },
        ],
        commentary: "Grace is not something you earn — it is something you receive with open hands. Every person has sinned and fallen short, which means every person needs grace. The beautiful news is that God offers it freely, generously, and without conditions. Grace does not make light of sin; it takes sin so seriously that God paid the price himself so you would not have to.",
      },
      {
        id: "gods-grace-2",
        question: "Is there a limit to God's grace?",
        verses: [
          { ref: "Romans 5:20", text: "God's law was given so that all people could see how sinful they were. But as people sinned more and more, God's wonderful grace became more abundant." },
          { ref: "Lamentations 3:22-23", text: "The faithful love of the LORD never ends! His mercies never cease. Great is his faithfulness; his mercies begin afresh each morning." },
          { ref: "2 Corinthians 12:9", text: "Each time he said, 'My grace is all you need. My power works best in weakness.' So now I am glad to boast about my weaknesses, so that the power of Christ can work through me." },
        ],
        commentary: "Where sin increases, grace increases even more. There is no sin so deep, no failure so great, no wandering so far that God's grace cannot reach you. His mercies are new every morning — fresh, unused, and waiting for you. When Paul pleaded for relief from his weakness, God did not remove it; He gave him grace sufficient for every moment. That same grace is yours today.",
      },
      {
        id: "gods-grace-3",
        question: "How does grace change the way I live?",
        verses: [
          { ref: "Titus 2:11-12", text: "For the grace of God has been revealed, bringing salvation to all people. And we are instructed to turn from godless living and sinful pleasures. We should live in this evil world with wisdom, righteousness, and devotion to God." },
          { ref: "2 Corinthians 5:17", text: "This means that anyone who belongs to Christ has become a new person. The old life is gone; a new life has begun!" },
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
          { ref: "Matthew 28:19", text: "Therefore, go and make disciples of all the nations, baptizing them in the name of the Father and the Son and the Holy Spirit." },
          { ref: "2 Corinthians 13:14", text: "May the grace of the Lord Jesus Christ, the love of God, and the fellowship of the Holy Spirit be with you all." },
          { ref: "Genesis 1:26", text: "Then God said, 'Let us make human beings in our image, to be like us.'" },
        ],
        commentary: "From the very first chapter of Genesis, God speaks in the plural: 'Let us make human beings in our image.' Throughout Scripture, Father, Son, and Holy Spirit are each identified as God, yet there is only one God. The baptismal formula Jesus gave His disciples names all three Persons equally. This is not a contradiction — it is a revelation of God's nature that goes beyond what our finite minds can fully grasp.",
      },
      {
        id: "trinity-2",
        question: "Why does the Trinity matter for my faith?",
        verses: [
          { ref: "John 14:16-17", text: "And I will ask the Father, and he will give you another Advocate, who will never leave you. He is the Holy Spirit, who leads into all truth." },
          { ref: "Ephesians 2:18", text: "Now all of us can come to the Father through the same Holy Spirit because of what Christ has done for us." },
          { ref: "1 John 4:8", text: "But anyone who does not love does not know God, for God is love." },
        ],
        commentary: "The Trinity matters because it means God has always been relational — Father, Son, and Spirit have loved one another from eternity. Love is not something God decided to do; it is who He is. Because God is a Trinity, you were created for relationship. Through Christ, in the power of the Spirit, you have access to the Father. All three Persons of the Godhead are actively involved in your salvation and your daily walk.",
      },
      {
        id: "trinity-3",
        question: "How do the Father, Son, and Holy Spirit work together?",
        verses: [
          { ref: "John 15:26", text: "But I will send you the Advocate — the Spirit of truth. He will come to you from the Father and will testify all about me." },
          { ref: "Romans 8:11", text: "The Spirit of God, who raised Jesus from the dead, lives in you. And just as God raised Christ Jesus from the dead, he will give life to your mortal bodies by this same Spirit living within you." },
          { ref: "John 5:19", text: "So Jesus explained, 'I tell you the truth, the Son can do nothing by himself. He does only what he sees the Father doing. Whatever the Father does, the Son also does.'" },
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
          { ref: "Joel 2:28", text: "Then, after doing all those things, I will pour out my Spirit upon all people. Your sons and daughters will prophesy. Your old men will dream dreams, and your young men will see visions." },
          { ref: "Acts 2:17-18", text: "'In the last days,' God says, 'I will pour out my Spirit upon all people. Your sons and daughters will prophesy. Your young men will see visions, and your old men will dream dreams. In those days I will pour out my Spirit even on my servants — men and women alike — and they will prophesy.'" },
          { ref: "1 Corinthians 12:28", text: "Here are some of the parts God has appointed for the church: first are apostles, second are prophets, third are teachers, then those who do miracles, those who have the gift of healing, those who can help others, those who have the gift of leadership, those who speak in unknown languages." },
        ],
        commentary: "God promised the prophetic gift not only for ancient Israel but for the last days of earth's history. Peter explicitly applied Joel's prophecy to the outpouring of the Holy Spirit. The New Testament lists prophecy among the ongoing spiritual gifts given for the health and mission of the church. Expecting prophecy to cease before the end of time contradicts both the promise of Joel and the pattern of how God has always guided His people — through those He raises up to speak for Him.",
      },
      {
        id: "prophecy-2",
        question: "What is the 'testimony of Jesus' and how does it identify God's remnant?",
        verses: [
          { ref: "Revelation 12:17", text: "And the dragon was angry at the woman and declared war against the rest of her children — all who keep God's commandments and maintain their testimony for Jesus." },
          { ref: "Revelation 19:10", text: "Then he said to me, 'Do not worship me! I am a servant of God, just like you and your brothers and sisters who testify about their faith in Jesus. Worship only God. For the essence of prophecy is to give a clear witness for Jesus.'" },
          { ref: "Revelation 22:8-9", text: "I, John, am the one who heard and saw all these things. And when I heard and saw them, I fell down to worship at the feet of the angel who showed them to me. But he said, 'No, don't worship me. I am a servant of God, just like you and your brothers the prophets, as well as all who obey what is written in this book. Worship only God!'" },
        ],
        commentary: "Revelation 19:10 is the interpretive key: 'the testimony of Jesus is the spirit of prophecy.' The remnant church is identified not only by commandment-keeping but by possessing the prophetic gift — the spirit of prophecy active in its midst. This is not a minor detail but a defining characteristic. God in His mercy marks His last-day people by the same gift that guided ancient Israel: the living voice of prophecy, directing attention away from itself and always pointing to Jesus.",
      },
      {
        id: "prophecy-3",
        question: "How do we test whether a prophet is genuine?",
        verses: [
          { ref: "1 Thessalonians 5:20-21", text: "Do not scoff at prophecies, but test everything that is said. Hold on to what is good." },
          { ref: "Isaiah 8:20", text: "Look to God's instructions and teachings! People who contradict his word are completely in the dark." },
          { ref: "Matthew 7:15-16", text: "Beware of false prophets who come disguised as harmless sheep but are really vicious wolves. You can identify them by their fruit, that is, by the way they act." },
        ],
        commentary: "God never asks us to accept prophets uncritically — He commands us to test them. Scripture gives us four clear tests: Does the prophet's message align with Scripture? Do their predictions come true? Does their life bear the fruit of the Spirit? And do they point people to God and His Word? Ellen White's ministry passes each of these tests. She consistently directed people to the Bible as the supreme authority and lived a life of dedicated service. We should neither dismiss prophecy with scepticism nor accept it without discernment.",
      },
      {
        id: "prophecy-4",
        question: "How does the Spirit of Prophecy practically guide God's people today?",
        verses: [
          { ref: "Proverbs 29:18", text: "When people do not accept divine guidance, they run wild. But whoever obeys the law is joyful." },
          { ref: "Amos 3:7", text: "Indeed, the Sovereign LORD never does anything until he reveals his plans to his servants the prophets." },
          { ref: "Ephesians 4:11-13", text: "Now these are the gifts Christ gave to the church: the apostles, the prophets, the evangelists, and the pastors and teachers. Their responsibility is to equip God's people to do his work and build up the church, the body of Christ. This will continue until we all come to such unity in our faith and knowledge of God's Son that we will be mature in the Lord, measuring up to the full and complete standard of Christ." },
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
          { ref: "Revelation 12:17", text: "And the dragon was angry at the woman and declared war against the rest of her children — all who keep God's commandments and maintain their testimony for Jesus." },
          { ref: "Revelation 14:12", text: "This calls for patient endurance on the part of the people of God who keep his commands and remain faithful to Jesus." },
          { ref: "Romans 11:5", text: "It is the same today, for a few of the people of Israel have remained faithful because of God's grace — his undeserved kindness in choosing them." },
        ],
        commentary: "The biblical concept of a remnant runs from Noah's family through the seven thousand who had not bowed to Baal, to the exiles who returned from Babylon, to the apostolic community who received the Spirit. In every age, God has a people who remain faithful against the current. Revelation provides the clearest end-time portrait: the remnant keeps God's commandments and holds the testimony of Jesus. These are not vague generalities — they are specific, verifiable marks that help God's people understand their identity and calling.",
      },
      {
        id: "remnant-2",
        question: "What does it mean to 'keep the commandments of God'?",
        verses: [
          { ref: "John 14:15", text: "If you love me, obey my commandments." },
          { ref: "Revelation 14:12", text: "This calls for patient endurance on the part of the people of God who keep his commands and remain faithful to Jesus." },
          { ref: "1 John 5:3", text: "Loving God means keeping his commandments, and his commandments are not burdensome." },
        ],
        commentary: "Commandment-keeping is not legalism — it is love in action. Jesus redefined the law not as a burden to bear but as a glad response to grace already received. The remnant keeps all of God's commandments, including the fourth — the Sabbath — which the first angel's message specifically points to when it calls the world to worship the Creator. Obedience is the evidence of genuine faith, not the cause of salvation. The remnant does not keep the commandments to be saved; they keep them because they are saved and deeply love the God who saved them.",
      },
      {
        id: "remnant-3",
        question: "What is the mission of the remnant in earth's final hours?",
        verses: [
          { ref: "Revelation 14:6-7", text: "And I saw another angel flying through the sky, carrying the eternal Good News to proclaim to the people who belong to this world — to every nation, tribe, language, and people. 'Fear God,' he shouted. 'Give glory to him. For the time has come when he will sit as judge. Worship him who made the heavens, the earth, the sea, and all the springs of water.'" },
          { ref: "Matthew 24:14", text: "And the Good News about the Kingdom will be preached throughout the whole world, so that all nations will hear it; and then the end will come." },
          { ref: "Isaiah 58:1", text: "Shout with the voice of a trumpet blast. Shout aloud! Don't be polite. Tell my people Israel of their sins!" },
        ],
        commentary: "The remnant church is not a retreat community — it is a mission force. The three angels' messages of Revelation 14 constitute the most urgent proclamation entrusted to any generation: worship the Creator, come out of confusion, and stand faithful in the crisis ahead. This message must reach every nation, tribe, language, and people before Christ returns. Every member of the remnant is a messenger. The mission is not optional or reserved for ordained ministers; it is the calling of every person who understands the times and loves their neighbours enough to warn them.",
      },
      {
        id: "remnant-4",
        question: "How can I live faithfully as part of God's remnant today?",
        verses: [
          { ref: "Ephesians 4:11-13", text: "Now these are the gifts Christ gave to the church: the apostles, the prophets, the evangelists, and the pastors and teachers. Their responsibility is to equip God's people to do his work and build up the church, the body of Christ. This will continue until we all come to such unity in our faith and knowledge of God's Son that we will be mature in the Lord." },
          { ref: "2 Timothy 3:16-17", text: "All Scripture is inspired by God and is useful to teach us what is true and to make us realize what is wrong in our lives. It corrects us when we are wrong and teaches us to do what is right. God uses it to prepare and equip his people to do every good work." },
          { ref: "Jude 1:3", text: "Dear friends, I had been eagerly planning to write to you about the salvation we all share. But now I find that I must write about something else, urging you to defend the faith that God has entrusted once for all time to his holy people." },
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
