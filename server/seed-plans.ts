import { db } from "./db";
import { devotionalPlans, devotionalDays } from "../shared/schema";
import { eq } from "drizzle-orm";

const PLANS = [
  {
    title: "Foundations of Faith",
    description: "Explore the bedrock truths of Christian faith through key passages that define what it means to believe.",
    totalDays: 7,
    theme: "faith",
    category: "foundations" as const,
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 10,
    days: [
      { dayNumber: 1, title: "What Is Faith?", bookId: 58, chapter: 11, passageLabel: "Hebrews 11:1-6", reflectionQuestions: ["What does it mean to have faith in things unseen?", "How does faith differ from mere hope?"], prayerPrompt: "Lord, increase my faith today." },
      { dayNumber: 2, title: "Faith Like Abraham", bookId: 1, chapter: 12, passageLabel: "Genesis 12:1-9", reflectionQuestions: ["What did Abraham leave behind?", "How can you step out in faith today?"], prayerPrompt: "Give me courage to follow You into the unknown." },
      { dayNumber: 3, title: "Faith That Moves Mountains", bookId: 40, chapter: 17, passageLabel: "Matthew 17:14-21", reflectionQuestions: ["What mountains in your life need moving?", "How big does faith need to be?"], prayerPrompt: "Help me trust You even with mustard-seed faith." },
      { dayNumber: 4, title: "Walking by Faith", bookId: 47, chapter: 5, passageLabel: "2 Corinthians 5:1-10", reflectionQuestions: ["What does it mean to walk by faith, not sight?", "Where do you rely too much on what you can see?"], prayerPrompt: "Teach me to trust Your unseen hand." },
      { dayNumber: 5, title: "The Shield of Faith", bookId: 49, chapter: 6, passageLabel: "Ephesians 6:10-18", reflectionQuestions: ["How does faith protect you?", "What fiery darts are you facing right now?"], prayerPrompt: "Be my shield and defender today." },
      { dayNumber: 6, title: "Faith and Works", bookId: 59, chapter: 2, passageLabel: "James 2:14-26", reflectionQuestions: ["How do faith and works relate?", "Is your faith producing action?"], prayerPrompt: "Let my faith be alive and active." },
      { dayNumber: 7, title: "The Author of Faith", bookId: 58, chapter: 12, passageLabel: "Hebrews 12:1-3", reflectionQuestions: ["What race has God set before you?", "How does Jesus perfect your faith?"], prayerPrompt: "Fix my eyes on You, Jesus, the author and finisher of my faith." },
    ],
  },
  {
    title: "A Life of Prayer",
    description: "Learn to deepen your prayer life through Scripture's greatest examples and teachings on communion with God.",
    totalDays: 7,
    theme: "prayer",
    category: "foundations" as const,
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 12,
    days: [
      { dayNumber: 1, title: "The Lord's Prayer", bookId: 40, chapter: 6, passageLabel: "Matthew 6:5-15", reflectionQuestions: ["What does this prayer teach about God's priorities?", "Which line speaks most to you today?"], prayerPrompt: "Our Father, teach me to pray as You taught the disciples." },
      { dayNumber: 2, title: "Persistent Prayer", bookId: 42, chapter: 18, passageLabel: "Luke 18:1-8", reflectionQuestions: ["Why does God want us to persist in prayer?", "What have you stopped praying about?"], prayerPrompt: "Give me persistence, Lord, even when answers seem delayed." },
      { dayNumber: 3, title: "Hannah's Desperate Prayer", bookId: 9, chapter: 1, passageLabel: "1 Samuel 1:1-20", reflectionQuestions: ["What can you learn from Hannah's honesty before God?", "What burdens do you need to pour out?"], prayerPrompt: "Lord, I pour out my heart before You." },
      { dayNumber: 4, title: "Daniel's Faithful Prayer", bookId: 27, chapter: 6, passageLabel: "Daniel 6:1-23", reflectionQuestions: ["What made Daniel's prayer life so powerful?", "What threatens your prayer time?"], prayerPrompt: "Help me be faithful in prayer, no matter the cost." },
      { dayNumber: 5, title: "Praying in the Spirit", bookId: 49, chapter: 6, passageLabel: "Ephesians 6:18-20", reflectionQuestions: ["What does it mean to pray in the Spirit?", "How can you pray for others more intentionally?"], prayerPrompt: "Holy Spirit, guide my prayers today." },
      { dayNumber: 6, title: "Jesus in Gethsemane", bookId: 40, chapter: 26, passageLabel: "Matthew 26:36-46", reflectionQuestions: ["What does Jesus' prayer reveal about surrender?", "Can you pray 'not my will, but Yours'?"], prayerPrompt: "Father, not my will but Yours be done." },
      { dayNumber: 7, title: "Praying Without Ceasing", bookId: 52, chapter: 5, passageLabel: "1 Thessalonians 5:16-24", reflectionQuestions: ["How can you pray without ceasing in practical terms?", "What would change if you were in constant conversation with God?"], prayerPrompt: "Make my life a constant prayer to You." },
    ],
  },
  {
    title: "Wisdom for Life",
    description: "Discover the practical wisdom of Scripture for navigating relationships, decisions, and daily challenges.",
    totalDays: 7,
    theme: "wisdom",
    category: "foundations" as const,
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 10,
    days: [
      { dayNumber: 1, title: "The Beginning of Wisdom", bookId: 20, chapter: 1, passageLabel: "Proverbs 1:1-7", reflectionQuestions: ["What is the fear of the Lord?", "How do you seek wisdom in your daily life?"], prayerPrompt: "Lord, give me a heart that fears and honors You." },
      { dayNumber: 2, title: "Ask God for Wisdom", bookId: 59, chapter: 1, passageLabel: "James 1:2-8", reflectionQuestions: ["How do trials produce wisdom?", "Do you ask God for wisdom generously?"], prayerPrompt: "I ask You for wisdom today — pour it out generously." },
      { dayNumber: 3, title: "Solomon's Request", bookId: 11, chapter: 3, passageLabel: "1 Kings 3:5-14", reflectionQuestions: ["Why did God honor Solomon's request for wisdom?", "What would you ask God for if He offered anything?"], prayerPrompt: "Give me an understanding heart, Lord." },
      { dayNumber: 4, title: "The Wise and Foolish Builders", bookId: 40, chapter: 7, passageLabel: "Matthew 7:24-29", reflectionQuestions: ["What foundation are you building your life on?", "Where do you hear God's words but not act on them?"], prayerPrompt: "Help me be a doer of Your Word, not just a hearer." },
      { dayNumber: 5, title: "Wisdom vs. Folly", bookId: 20, chapter: 9, passageLabel: "Proverbs 9:1-12", reflectionQuestions: ["How does wisdom call to you?", "What foolish paths are tempting you?"], prayerPrompt: "Open my ears to wisdom's call." },
      { dayNumber: 6, title: "The Wisdom from Above", bookId: 59, chapter: 3, passageLabel: "James 3:13-18", reflectionQuestions: ["What characterizes godly wisdom?", "Is your wisdom pure, peaceable, and gentle?"], prayerPrompt: "Fill me with wisdom from above." },
      { dayNumber: 7, title: "Walking Wisely", bookId: 49, chapter: 5, passageLabel: "Ephesians 5:15-20", reflectionQuestions: ["How can you make the most of your time?", "What does it look like to walk wisely today?"], prayerPrompt: "Teach me to number my days and walk in wisdom." },
    ],
  },
  {
    title: "God's Unfailing Love",
    description: "Experience the depth, width, and height of God's love through the most powerful passages in Scripture.",
    totalDays: 7,
    theme: "love",
    category: "foundations" as const,
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 10,
    days: [
      { dayNumber: 1, title: "For God So Loved", bookId: 43, chapter: 3, passageLabel: "John 3:16-21", reflectionQuestions: ["What motivated God to send His Son?", "How does God's love change your view of yourself?"], prayerPrompt: "Thank You for loving me so much, Father." },
      { dayNumber: 2, title: "Nothing Can Separate Us", bookId: 45, chapter: 8, passageLabel: "Romans 8:31-39", reflectionQuestions: ["What in your life makes you feel separated from God's love?", "How does this passage address that fear?"], prayerPrompt: "Help me rest in Your inseparable love." },
      { dayNumber: 3, title: "The Love Chapter", bookId: 46, chapter: 13, passageLabel: "1 Corinthians 13:1-13", reflectionQuestions: ["Which quality of love challenges you most?", "How can you show this love today?"], prayerPrompt: "Shape my love to look like Yours." },
      { dayNumber: 4, title: "Love One Another", bookId: 43, chapter: 13, passageLabel: "John 13:31-35", reflectionQuestions: ["Why is love the mark of discipleship?", "Who needs your love most right now?"], prayerPrompt: "Give me a heart that loves as You love." },
      { dayNumber: 5, title: "Love Your Enemies", bookId: 40, chapter: 5, passageLabel: "Matthew 5:43-48", reflectionQuestions: ["Who is hardest for you to love?", "How does loving enemies reflect God's character?"], prayerPrompt: "Give me strength to love even those who hurt me." },
      { dayNumber: 6, title: "God Is Love", bookId: 62, chapter: 4, passageLabel: "1 John 4:7-21", reflectionQuestions: ["If God is love, what does that mean for how He sees you?", "How does being loved enable you to love others?"], prayerPrompt: "Let Your perfect love cast out my fears." },
      { dayNumber: 7, title: "The Greatest Commandment", bookId: 40, chapter: 22, passageLabel: "Matthew 22:34-40", reflectionQuestions: ["How do you love God with all your heart, soul, and mind?", "Who is your neighbor?"], prayerPrompt: "Help me love You and love others with everything I have." },
    ],
  },
  {
    title: "Living in Hope",
    description: "Find renewed hope in God's promises — even in the darkest seasons, His light breaks through.",
    totalDays: 5,
    theme: "hope",
    category: "foundations" as const,
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 10,
    days: [
      { dayNumber: 1, title: "Hope in God's Plans", bookId: 24, chapter: 29, passageLabel: "Jeremiah 29:11-14", reflectionQuestions: ["What plans does God have for you?", "How does this promise give you hope for the future?"], prayerPrompt: "Lord, I trust that Your plans for me are good." },
      { dayNumber: 2, title: "Hope That Does Not Disappoint", bookId: 45, chapter: 5, passageLabel: "Romans 5:1-5", reflectionQuestions: ["How does suffering produce hope?", "When has difficulty deepened your trust in God?"], prayerPrompt: "Pour out Your love in my heart through the Holy Spirit." },
      { dayNumber: 3, title: "A Living Hope", bookId: 60, chapter: 1, passageLabel: "1 Peter 1:3-9", reflectionQuestions: ["What makes our hope 'living'?", "How is your faith being refined?"], prayerPrompt: "Thank You for the living hope I have through Christ's resurrection." },
      { dayNumber: 4, title: "Hope in the Valley", bookId: 19, chapter: 23, passageLabel: "Psalm 23:1-6", reflectionQuestions: ["What valley are you walking through?", "How is God your shepherd in this season?"], prayerPrompt: "Even in the shadow of death, I will not fear, for You are with me." },
      { dayNumber: 5, title: "The God of Hope", bookId: 45, chapter: 15, passageLabel: "Romans 15:13", reflectionQuestions: ["What would it look like to overflow with hope?", "How can you share hope with someone today?"], prayerPrompt: "Fill me with all joy and peace in believing, that I may abound in hope." },
    ],
  },
  {
    title: "Strength in Weakness",
    description: "Discover how God's power is made perfect in weakness — finding supernatural strength for every challenge.",
    totalDays: 5,
    theme: "faith,strength",
    category: "foundations" as const,
    difficultyLevel: "intermediate",
    estimatedMinutesPerDay: 12,
    days: [
      { dayNumber: 1, title: "Power in Weakness", bookId: 47, chapter: 12, passageLabel: "2 Corinthians 12:7-10", reflectionQuestions: ["Where do you feel weakest?", "How might God's power show through your weakness?"], prayerPrompt: "Lord, let Your strength be made perfect in my weakness." },
      { dayNumber: 2, title: "I Can Do All Things", bookId: 50, chapter: 4, passageLabel: "Philippians 4:10-13", reflectionQuestions: ["What does Paul mean by 'all things'?", "Where do you need Christ's strength today?"], prayerPrompt: "I can do all things through Christ who strengthens me." },
      { dayNumber: 3, title: "Renewing Your Strength", bookId: 23, chapter: 40, passageLabel: "Isaiah 40:28-31", reflectionQuestions: ["Are you running, walking, or waiting right now?", "How do you wait on the Lord?"], prayerPrompt: "Renew my strength as I wait on You." },
      { dayNumber: 4, title: "Be Strong and Courageous", bookId: 6, chapter: 1, passageLabel: "Joshua 1:1-9", reflectionQuestions: ["What task feels overwhelming to you?", "How does God's presence change your courage?"], prayerPrompt: "I will be strong and courageous because You are with me." },
      { dayNumber: 5, title: "The Lord Is My Strength", bookId: 19, chapter: 27, passageLabel: "Psalm 27:1-6", reflectionQuestions: ["Of whom shall you be afraid?", "What does it mean for God to be your light and salvation?"], prayerPrompt: "You are my light, my salvation, my stronghold." },
    ],
  },
  {
    title: "Finding Peace",
    description: "In a world of anxiety and noise, discover the peace that surpasses all understanding.",
    totalDays: 5,
    theme: "peace,comfort",
    category: "foundations" as const,
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 10,
    days: [
      { dayNumber: 1, title: "Peace I Leave with You", bookId: 43, chapter: 14, passageLabel: "John 14:25-31", reflectionQuestions: ["How is Jesus' peace different from the world's?", "What is troubling your heart?"], prayerPrompt: "Lord, let Your peace guard my heart and mind." },
      { dayNumber: 2, title: "The Peace of God", bookId: 50, chapter: 4, passageLabel: "Philippians 4:4-9", reflectionQuestions: ["What are you anxious about right now?", "How can prayer replace anxiety?"], prayerPrompt: "I bring my anxieties to You and receive Your peace." },
      { dayNumber: 3, title: "Be Still and Know", bookId: 19, chapter: 46, passageLabel: "Psalm 46:1-11", reflectionQuestions: ["What does it mean to be still before God?", "Where do you need to stop striving?"], prayerPrompt: "Help me be still and know that You are God." },
      { dayNumber: 4, title: "Perfect Peace", bookId: 23, chapter: 26, passageLabel: "Isaiah 26:1-4", reflectionQuestions: ["What does it mean to keep your mind stayed on God?", "How can you fix your thoughts on Him?"], prayerPrompt: "Keep me in perfect peace as I trust in You." },
      { dayNumber: 5, title: "Peacemakers", bookId: 40, chapter: 5, passageLabel: "Matthew 5:1-12", reflectionQuestions: ["How can you be a peacemaker today?", "Which beatitude speaks most to your life right now?"], prayerPrompt: "Make me an instrument of Your peace." },
    ],
  },
  {
    title: "Grace Upon Grace",
    description: "Explore the richness of God's grace — unmerited, transforming, and overflowing for every sinner saved.",
    totalDays: 5,
    theme: "grace,faith",
    category: "foundations" as const,
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 10,
    days: [
      { dayNumber: 1, title: "Saved by Grace", bookId: 49, chapter: 2, passageLabel: "Ephesians 2:1-10", reflectionQuestions: ["What does it mean that salvation is a gift?", "How does grace change your motivation for doing good?"], prayerPrompt: "Thank You for saving me by grace, not by my efforts." },
      { dayNumber: 2, title: "Where Sin Abounded", bookId: 45, chapter: 5, passageLabel: "Romans 5:12-21", reflectionQuestions: ["How does grace exceed sin?", "Where do you need an overflow of grace?"], prayerPrompt: "Let Your grace abound in my life." },
      { dayNumber: 3, title: "The Prodigal Son", bookId: 42, chapter: 15, passageLabel: "Luke 15:11-32", reflectionQuestions: ["Do you identify more with the younger or older son?", "How does the father's response reveal God's grace?"], prayerPrompt: "Father, thank You for running to meet me." },
      { dayNumber: 4, title: "Sufficient Grace", bookId: 47, chapter: 12, passageLabel: "2 Corinthians 12:1-10", reflectionQuestions: ["Is God's grace enough for you today?", "What thorns in your life is grace sustaining you through?"], prayerPrompt: "Your grace is sufficient for me." },
      { dayNumber: 5, title: "Grace and Truth", bookId: 43, chapter: 1, passageLabel: "John 1:1-18", reflectionQuestions: ["How did Jesus bring grace and truth together?", "From His fullness, what grace have you received?"], prayerPrompt: "From Your fullness, I receive grace upon grace." },
    ],
  },
  {
    title: "Psalms of Comfort",
    description: "When life is hard, the Psalms meet you where you are — honest cries, deep comfort, and unshakeable trust.",
    totalDays: 7,
    theme: "comfort,peace,hope",
    category: "foundations" as const,
    difficultyLevel: "beginner",
    estimatedMinutesPerDay: 8,
    days: [
      { dayNumber: 1, title: "The Lord Is My Shepherd", bookId: 19, chapter: 23, passageLabel: "Psalm 23", reflectionQuestions: ["What does it mean for God to restore your soul?", "Where is He leading you beside still waters?"], prayerPrompt: "Lord, You are my shepherd. I shall not want." },
      { dayNumber: 2, title: "God Is Our Refuge", bookId: 19, chapter: 46, passageLabel: "Psalm 46", reflectionQuestions: ["What storms are raging around you?", "How is God your refuge?"], prayerPrompt: "Be my refuge and strength today." },
      { dayNumber: 3, title: "Out of the Depths", bookId: 19, chapter: 130, passageLabel: "Psalm 130", reflectionQuestions: ["Have you ever cried to God from the depths?", "How does waiting for the Lord feel?"], prayerPrompt: "Out of the depths I cry to You, Lord." },
      { dayNumber: 4, title: "A Broken Spirit", bookId: 19, chapter: 51, passageLabel: "Psalm 51:1-17", reflectionQuestions: ["What does a clean heart look like?", "How does God view a broken and contrite spirit?"], prayerPrompt: "Create in me a clean heart, O God." },
      { dayNumber: 5, title: "The Lord Is Near", bookId: 19, chapter: 34, passageLabel: "Psalm 34:1-18", reflectionQuestions: ["When have you tasted and seen that God is good?", "How is God near to the brokenhearted?"], prayerPrompt: "Draw near to me, Lord, for my heart is broken." },
      { dayNumber: 6, title: "My Help Comes from the Lord", bookId: 19, chapter: 121, passageLabel: "Psalm 121", reflectionQuestions: ["Where do you lift your eyes?", "How does God watch over you day and night?"], prayerPrompt: "My help comes from the Lord, maker of heaven and earth." },
      { dayNumber: 7, title: "Praise in All Circumstances", bookId: 19, chapter: 150, passageLabel: "Psalm 150", reflectionQuestions: ["What can you praise God for right now?", "How does praise shift your perspective?"], prayerPrompt: "Let everything that has breath praise the Lord!" },
    ],
  },
  {
    title: "The Sermon on the Mount",
    description: "Jesus' most famous teaching — a radical vision for kingdom living that still challenges and inspires today.",
    totalDays: 7,
    theme: "wisdom,faith",
    category: "foundations" as const,
    difficultyLevel: "intermediate",
    estimatedMinutesPerDay: 15,
    days: [
      { dayNumber: 1, title: "The Beatitudes", bookId: 40, chapter: 5, passageLabel: "Matthew 5:1-16", reflectionQuestions: ["Which beatitude challenges you most?", "How can you be salt and light today?"], prayerPrompt: "Lord, make me a blessing to the world around me." },
      { dayNumber: 2, title: "The Law Fulfilled", bookId: 40, chapter: 5, passageLabel: "Matthew 5:17-48", reflectionQuestions: ["How does Jesus go beyond the letter of the law?", "Where does anger or lust need to be addressed in your heart?"], prayerPrompt: "Transform my heart, not just my behavior." },
      { dayNumber: 3, title: "Secret Righteousness", bookId: 40, chapter: 6, passageLabel: "Matthew 6:1-18", reflectionQuestions: ["Do you do good deeds to be seen?", "How can you serve God in secret?"], prayerPrompt: "Father, let my giving, praying, and fasting be for You alone." },
      { dayNumber: 4, title: "Treasure in Heaven", bookId: 40, chapter: 6, passageLabel: "Matthew 6:19-34", reflectionQuestions: ["Where is your treasure?", "What are you anxious about that God already knows?"], prayerPrompt: "Help me seek Your kingdom first." },
      { dayNumber: 5, title: "Do Not Judge", bookId: 40, chapter: 7, passageLabel: "Matthew 7:1-14", reflectionQuestions: ["What planks are in your own eye?", "How do you choose the narrow gate daily?"], prayerPrompt: "Help me examine my own heart before judging others." },
      { dayNumber: 6, title: "Good Fruit", bookId: 40, chapter: 7, passageLabel: "Matthew 7:15-23", reflectionQuestions: ["What fruit is your life producing?", "How do you know a true follower of Christ?"], prayerPrompt: "Let my life bear fruit that honors You." },
      { dayNumber: 7, title: "Built on the Rock", bookId: 40, chapter: 7, passageLabel: "Matthew 7:24-29", reflectionQuestions: ["What foundation are you building on?", "Are you hearing AND doing?"], prayerPrompt: "Help me build my life on the solid rock of Your Word." },
    ],
  },
];

async function seedPlans() {
  console.log("Seeding devotional plans...");

  for (const plan of PLANS) {
    const existing = await db
      .select()
      .from(devotionalPlans)
      .where(eq(devotionalPlans.title, plan.title));

    if (existing.length > 0) {
      console.log(`  Skipping "${plan.title}" (already exists)`);
      continue;
    }

    const [inserted] = await db
      .insert(devotionalPlans)
      .values({
        title: plan.title,
        description: plan.description,
        totalDays: plan.totalDays,
        theme: plan.theme,
        category: plan.category || "thematic",
        difficultyLevel: plan.difficultyLevel,
        estimatedMinutesPerDay: plan.estimatedMinutesPerDay,
        // Seed presence alone is not evidence of human authorship review.
        isPublished: false,
        provenance: "legacy_unclassified",
      })
      .returning();

    console.log(`  Created plan: "${plan.title}" (${inserted.id})`);

    for (const day of plan.days) {
      await db.insert(devotionalDays).values({
        planId: inserted.id,
        dayNumber: day.dayNumber,
        title: day.title,
        bookId: day.bookId,
        chapter: day.chapter,
        passageLabel: day.passageLabel,
        reflectionQuestions: day.reflectionQuestions,
        prayerPrompt: day.prayerPrompt,
      });
    }

    console.log(`    Added ${plan.days.length} days`);
  }

  console.log("Done seeding plans!");
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
