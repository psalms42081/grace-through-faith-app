import { eq, sql } from "drizzle-orm";
import { resources } from "../shared/schema";

export async function seedResources(database: any): Promise<void> {
  const existing = await database.select({ id: resources.id }).from(resources).limit(1);
  if (existing.length > 0) {
    console.log("[seed] Resources already seeded, skipping.");
    return;
  }

  console.log("[seed] Seeding initial resources...");

  await database.insert(resources).values([
    {
      slug: "the-sabbath-gods-gift-of-rest",
      title: "The Sabbath: God's Gift of Rest",
      description: "A foundational study exploring the biblical Sabbath from creation to the new earth, discovering why God set apart the seventh day and what it means for believers today.",
      resourceType: "topical-study",
      category: "doctrine",
      tier: "free",
      contentJson: {
        title: "The Sabbath: God's Gift of Rest",
        introduction: "From the very first week of earth's history, God established a rhythm of work and rest. The seventh-day Sabbath is not merely a rule to follow but a gift to receive — a weekly invitation to step away from our labor and step into God's presence. This study explores the Sabbath's origin, its significance throughout Scripture, and its meaning for Seventh-day Adventist believers today.",
        scriptureFoundation: [
          {
            reference: "Genesis 2:1-3",
            text: "Thus the heavens and the earth were finished, and all the host of them. And on the seventh day God ended his work which he had made; and he rested on the seventh day from all his work which he had made. And God blessed the seventh day, and sanctified it.",
            explanation: "God rested not because He was tired, but to establish a sacred pattern. By blessing and sanctifying the seventh day, He set it apart as holy time — a perpetual memorial of creation."
          },
          {
            reference: "Exodus 20:8-11",
            text: "Remember the sabbath day, to keep it holy. Six days shalt thou labour, and do all thy work: But the seventh day is the sabbath of the LORD thy God.",
            explanation: "The fourth commandment links the Sabbath directly to creation. God commands us to 'remember' because this truth can be forgotten. The Sabbath is rooted not in Jewish tradition but in God's creative act for all humanity."
          },
          {
            reference: "Isaiah 58:13-14",
            text: "If thou turn away thy foot from the sabbath, from doing thy pleasure on my holy day; and call the sabbath a delight, the holy of the LORD, honourable...",
            explanation: "Isaiah reveals the Sabbath as a delight, not a burden. When we honor the Sabbath, God promises joy and spiritual nourishment. The Sabbath is meant to be the highlight of our week."
          },
          {
            reference: "Mark 2:27-28",
            text: "And he said unto them, The sabbath was made for man, and not man for the sabbath: Therefore the Son of man is Lord also of the sabbath.",
            explanation: "Jesus affirmed the Sabbath's purpose as a blessing for humanity while claiming lordship over it. He did not abolish the Sabbath but restored its true meaning from legalistic distortions."
          },
          {
            reference: "Hebrews 4:9-10",
            text: "There remaineth therefore a rest to the people of God. For he that is entered into his rest, he also hath ceased from his own works, as God did from his.",
            explanation: "The Greek word 'sabbatismos' (Sabbath-rest) indicates a continuing Sabbath observance for God's people. The weekly Sabbath points forward to the eternal rest we will enjoy with God."
          },
          {
            reference: "Revelation 14:7",
            text: "Saying with a loud voice, Fear God, and give glory to him; for the hour of his judgment is come: and worship him that made heaven, and earth, and the sea, and the fountains of waters.",
            explanation: "The first angel's message echoes the language of the fourth commandment, calling all people back to worship the Creator. In the last days, the Sabbath becomes a sign of loyalty to God."
          }
        ],
        historicalContext: "The seventh-day Sabbath has been observed continuously from creation through the patriarchs, the nation of Israel, the early church, and into the present day. Jesus kept the Sabbath (Luke 4:16), the apostles kept it (Acts 13:14, 42-44; 17:2; 18:4), and the Sabbath will be kept in the new earth (Isaiah 66:23). The change from Saturday to Sunday worship occurred gradually through human tradition, not divine command, beginning in the second and third centuries as the church moved away from its Jewish roots. Seventh-day Adventists, along with other Sabbath-keeping Christians, have restored this truth as part of the end-time message of Revelation 14.",
        applicationQuestions: [
          "How can I prepare for the Sabbath so that it truly becomes a delight rather than an obligation?",
          "What activities help me connect with God most deeply on Sabbath?",
          "How does Sabbath keeping demonstrate my trust in God as Creator and Provider?",
          "In what ways does the Sabbath serve as a weekly reminder of God's grace?",
          "How can I share the beauty of the Sabbath with others who may not yet understand its significance?"
        ],
        prayerPrompts: [
          "Thank God for the gift of Sabbath rest and ask Him to help you experience it more fully.",
          "Pray for a deeper understanding of what it means to cease from your own works and rest in God's grace.",
          "Ask God to help you make Sabbath a delight for your family and those around you."
        ],
        furtherStudy: [
          "The Desire of Ages, chapters 29 and 30 — Christ's Sabbath teaching and healing",
          "The Great Controversy, chapters 25-26 — The Sabbath through history",
          "Fundamental Belief #20: The Sabbath"
        ]
      },
      ageGroup: "adult",
      estimatedMinutes: 25,
      tags: ["sabbath", "doctrine", "creation", "commandments", "foundational"],
      status: "published",
      publishedAt: new Date(),
      generatedBy: "manual",
    },
    {
      slug: "family-week-of-prayer",
      title: "Week of Prayer: Family Edition",
      description: "A 5-day family worship plan designed to draw families closer to God and each other through prayer, Scripture, and age-appropriate activities.",
      resourceType: "family-worship",
      category: "family",
      tier: "free",
      contentJson: {
        theme: "Drawing Near to God as a Family",
        totalDays: 5,
        days: [
          {
            day: 1,
            title: "God Made Our Family",
            reading: "Genesis 1:26-28; Psalm 127:3",
            activity: "Each family member draws or writes one thing they love about every other family member. Share these with each other during worship.",
            questions: {
              children: "What is your favorite thing about our family?",
              teen: "How do you see God's love reflected in our family relationships?",
              adult: "How can we better reflect God's character in our home this week?"
            },
            songSuggestion: "SDA Hymnal #655 — 'Happy the Home When God Is There'",
            prayerFocus: "Thank God for your family and ask Him to bless each member by name."
          },
          {
            day: 2,
            title: "Talking with God",
            reading: "Matthew 6:5-13; Philippians 4:6-7",
            activity: "Create a family prayer jar — each person writes prayer requests on slips of paper. Draw one each morning and evening to pray for together.",
            questions: {
              children: "What is one thing you want to talk to God about today?",
              teen: "What makes prayer feel real to you? What makes it feel distant?",
              adult: "How can we build a more consistent family prayer life?"
            },
            songSuggestion: "SDA Hymnal #483 — 'I Need Thee Every Hour'",
            prayerFocus: "Ask God to teach your family to pray with sincerity and faith."
          },
          {
            day: 3,
            title: "God's Word Is Our Guide",
            reading: "Psalm 119:105; 2 Timothy 3:16-17",
            activity: "Together, memorize Psalm 119:105. Younger children can learn the first part. Practice saying it together each evening for the rest of the week.",
            questions: {
              children: "If the Bible is like a lamp, what does that mean for us?",
              teen: "What passage of Scripture has been most meaningful to you recently?",
              adult: "How can we make Scripture reading a more natural part of family life?"
            },
            songSuggestion: "SDA Hymnal #272 — 'Give Me the Bible'",
            prayerFocus: "Pray that God's Word would become living and active in each family member's heart."
          },
          {
            day: 4,
            title: "Serving Others Together",
            reading: "Galatians 5:13-14; Matthew 25:35-40",
            activity: "Plan one act of service your family can do together this week — prepare a meal for someone, write encouraging notes, or visit someone who is lonely.",
            questions: {
              children: "Who is someone we could help this week? What could we do?",
              teen: "How does serving others change the way you see the world?",
              adult: "What barriers keep our family from serving others more regularly?"
            },
            songSuggestion: "SDA Hymnal #581 — 'When We Walk with the Lord'",
            prayerFocus: "Ask God to open your eyes to the needs around you and give your family a servant's heart."
          },
          {
            day: 5,
            title: "Looking Forward to Heaven",
            reading: "Revelation 21:1-5; John 14:1-3",
            activity: "Each family member describes or draws what they're most excited about in heaven. Share and discuss together.",
            questions: {
              children: "What do you think heaven will be like? Who do you want to see there?",
              teen: "How does the hope of Jesus' return affect the way you live today?",
              adult: "How can the blessed hope shape our family's priorities and values?"
            },
            songSuggestion: "SDA Hymnal #213 — 'Jesus Is Coming Again'",
            prayerFocus: "Thank God for the promise of a new heaven and earth. Ask Him to keep the blessed hope alive in your family's hearts."
          }
        ]
      },
      ageGroup: null,
      estimatedMinutes: 20,
      tags: ["family", "prayer", "worship", "kids-friendly", "week-of-prayer"],
      status: "published",
      publishedAt: new Date(),
      generatedBy: "manual",
    },
    {
      slug: "understanding-the-sanctuary",
      title: "Understanding the Heavenly Sanctuary",
      description: "Explore the sanctuary doctrine — from the earthly tabernacle to Christ's ministry in the heavenly sanctuary — and understand why it matters for your faith today.",
      resourceType: "topical-study",
      category: "doctrine",
      tier: "pro",
      contentJson: {
        title: "Understanding the Heavenly Sanctuary",
        introduction: "The sanctuary is one of the most beautiful and comprehensive themes in Scripture. From the tabernacle in the wilderness to the heavenly sanctuary where Christ ministers as our High Priest, this doctrine reveals the plan of salvation in vivid detail. For Seventh-day Adventists, the sanctuary message is central to understanding the investigative judgment, the meaning of 1844, and Christ's ongoing work for us.",
        scriptureFoundation: [
          {
            reference: "Exodus 25:8-9",
            text: "And let them make me a sanctuary; that I may dwell among them. According to all that I shew thee, after the pattern of the tabernacle.",
            explanation: "God instructed Moses to build the sanctuary as a copy of the heavenly original. The earthly sanctuary was a teaching tool — every element pointed to Christ and His saving work."
          },
          {
            reference: "Hebrews 8:1-2",
            text: "Now of the things which we have spoken this is the sum: We have such an high priest, who is set on the right hand of the throne of the Majesty in the heavens; A minister of the sanctuary, and of the true tabernacle, which the Lord pitched, and not man.",
            explanation: "Jesus is our High Priest in the heavenly sanctuary. His ministry there is real, not symbolic. He intercedes for us continually."
          },
          {
            reference: "Daniel 8:14",
            text: "And he said unto me, Unto two thousand and three hundred days; then shall the sanctuary be cleansed.",
            explanation: "This prophecy, understood through the day-year principle, points to 1844 and the beginning of the investigative judgment — when Christ entered the Most Holy Place of the heavenly sanctuary."
          },
          {
            reference: "Hebrews 9:24",
            text: "For Christ is not entered into the holy places made with hands, which are the figures of the true; but into heaven itself, now to appear in the presence of God for us.",
            explanation: "The earthly sanctuary was a figure, a model. Christ entered the true sanctuary in heaven to minister on our behalf."
          },
          {
            reference: "Revelation 11:19",
            text: "And the temple of God was opened in heaven, and there was seen in his temple the ark of his testament.",
            explanation: "John sees the heavenly temple with the ark of the covenant — confirming that God's law, including the Sabbath commandment, is preserved in heaven."
          }
        ],
        historicalContext: "The sanctuary doctrine became central to Adventist identity after the Great Disappointment of October 22, 1844. Through careful Bible study, early Adventists understood that the prophecy of Daniel 8:14 did not point to Christ's return to earth, but to the beginning of a new phase of His ministry in the Most Holy Place of the heavenly sanctuary. This understanding, supported by the book of Hebrews and the writings of Ellen G. White, provided the foundation for the investigative judgment teaching and the unique Adventist understanding of Christ's current work as our High Priest.",
        applicationQuestions: [
          "How does knowing that Christ is actively interceding for you in the heavenly sanctuary affect your confidence in prayer?",
          "What does the sanctuary teach us about the seriousness of sin and the completeness of God's plan to deal with it?",
          "How does the investigative judgment demonstrate God's fairness and transparency?",
          "In what ways does the sanctuary message strengthen your assurance of salvation?",
          "How can understanding the sanctuary help you explain your faith to others?"
        ],
        prayerPrompts: [
          "Thank Jesus for His ongoing ministry as your High Priest in the heavenly sanctuary.",
          "Ask God to give you a deeper understanding of how the sanctuary reveals His character of love and justice.",
          "Pray for confidence in the judgment, knowing that Christ stands as your Advocate."
        ],
        furtherStudy: [
          "The Great Controversy, chapters 23-24 — 'What Is the Sanctuary?' and 'In the Holy of Holies'",
          "Christ in His Sanctuary — Ellen G. White compilation",
          "Fundamental Belief #24: Christ's Ministry in the Heavenly Sanctuary"
        ]
      },
      ageGroup: "adult",
      estimatedMinutes: 30,
      tags: ["sanctuary", "doctrine", "prophecy", "judgment", "high-priest", "1844"],
      status: "published",
      publishedAt: new Date(),
      generatedBy: "manual",
    }
  ]);

  console.log("[seed] Seeded 3 initial resources (2 free, 1 pro).");
}
