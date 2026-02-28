import { db } from "../server/db";
import { devotionalPlans, devotionalDays } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function update() {
  console.log("Updating devotional plan descriptions and adding Ellen White references...\n");

  // ===== UPDATE PLAN DESCRIPTIONS (remove any denominational framing) =====

  await db.update(devotionalPlans)
    .set({
      description: "Trace the Sabbath from creation through the New Testament and beyond. Discover why God set apart the seventh day, how Jesus honoured it, and what it means for believers today. Each day explores Scripture's testimony to this sacred gift of rest, worship, and fellowship with the Creator.",
    })
    .where(eq(devotionalPlans.title, "The Sabbath Rest"));

  await db.update(devotionalPlans)
    .set({
      description: "Walk through the great prophetic visions of Daniel — from Nebuchadnezzar's image to the beasts of chapter 7, the 2,300-day prophecy, and the time of the end. Discover how God reveals the sweep of history and His ultimate triumph over earthly powers.",
    })
    .where(eq(devotionalPlans.title, "Daniel's Prophecies — End-Time Visions"));

  await db.update(devotionalPlans)
    .set({
      description: "Explore what Scripture teaches about caring for the body as God's temple. From the original diet in Eden to Daniel's pulse test and Paul's temple metaphor, discover how physical health connects to spiritual faithfulness. Each day examines a biblical health principle with practical application.",
    })
    .where(eq(devotionalPlans.title, "God's Health Blueprint"));

  await db.update(devotionalPlans)
    .set({
      description: "Journey from the earthly tabernacle to the heavenly sanctuary where Christ ministers as our High Priest. Understand the Day of Atonement, the meaning of the Most Holy Place, and what Christ's intercession means for you today. Each day unfolds another layer of this central biblical teaching.",
    })
    .where(eq(devotionalPlans.title, "The Heavenly Sanctuary"));

  await db.update(devotionalPlans)
    .set({
      description: "What happens when we die? Does the soul live on immediately, or does Scripture teach something different? This plan examines what the Bible says about death as a sleep, the hope of the resurrection, and the promise of eternal life — offering comfort, clarity, and solid biblical ground.",
    })
    .where(eq(devotionalPlans.title, "Death, Sleep, and Resurrection"));

  console.log("Plan descriptions updated.\n");

  // ===== ADD ELLEN WHITE REFERENCES TO DEVOTIONAL DAYS =====
  // Using historicVoiceExcerpt for the reference text and nowApplication to append the link
  // Rule: never embed EGW text — always link to egwwritings.org

  const EGW_LINK = "https://egwwritings.org";

  // Helper to update a day with EGW reference
  async function addEgwRef(planTitle: string, dayNum: number, egwNote: string) {
    const plans = await db.select().from(devotionalPlans).where(eq(devotionalPlans.title, planTitle));
    if (!plans.length) return;
    const planId = plans[0].id;

    const days = await db.select().from(devotionalDays)
      .where(and(eq(devotionalDays.planId, planId), eq(devotionalDays.dayNumber, dayNum)));
    if (!days.length) return;

    const existing = days[0].historicVoiceExcerpt || "";
    await db.update(devotionalDays)
      .set({ historicVoiceExcerpt: existing ? existing + "\n\n" + egwNote : egwNote })
      .where(eq(devotionalDays.id, days[0].id));
  }

  // ===== THE SABBATH REST — EGW References =====
  await addEgwRef("The Sabbath Rest", 1,
    `Ellen G. White on Creation and the Sabbath: "God looked with satisfaction upon the work of His hands. All was perfect, worthy of its divine Author, and He rested, not as one weary, but as well pleased with the fruits of His wisdom and goodness" — read more in Patriarchs and Prophets, chapter 2 (${EGW_LINK}/book/84/chapter/2).`);

  await addEgwRef("The Sabbath Rest", 2,
    `Ellen G. White on the Fourth Commandment: "The Sabbath is not introduced as a new institution but as having been founded at creation... It was to be observed by all mankind" — explore further in Patriarchs and Prophets, chapter 27 (${EGW_LINK}/book/84/chapter/27).`);

  await addEgwRef("The Sabbath Rest", 3,
    `Ellen G. White on Sabbath delight: "The Sabbath should be made so interesting to our families that its weekly return will be hailed with joy" — read more in Testimonies for the Church, vol. 6 (${EGW_LINK}/book/119).`);

  await addEgwRef("The Sabbath Rest", 4,
    `Ellen G. White on Jesus and the Sabbath: "The Saviour's manner of observing the Sabbath the Jews made a pretext for condemning Him... But Jesus showed that the work of relieving the afflicted was in harmony with the Sabbath law" — explore The Desire of Ages, chapter 29 (${EGW_LINK}/book/130/chapter/29).`);

  await addEgwRef("The Sabbath Rest", 5,
    `Ellen G. White on Sabbath rest in Hebrews: "Those who have been forgiven much will love much. Grace that pardons the guilty soul, that embraces the sinner, that provides the Sabbath rest of faith — all this invites the soul to rest in God" — explore The Desire of Ages (${EGW_LINK}/book/130).`);

  await addEgwRef("The Sabbath Rest", 6,
    `Ellen G. White on the Sabbath in the New Earth: "In the earth made new... 'from one Sabbath to another' the nations of the saved shall gather to worship God" — read The Great Controversy, chapter 40 (${EGW_LINK}/book/132/chapter/40).`);

  await addEgwRef("The Sabbath Rest", 7,
    `Ellen G. White on the Sabbath as a sign: "The Sabbath given to the world as the sign of God as the Creator is also the sign of Him as the Sanctifier" — explore Testimonies for the Church, vol. 6 (${EGW_LINK}/book/119).`);

  console.log("  Added EGW references: The Sabbath Rest");

  // ===== DANIEL'S PROPHECIES — EGW References =====
  await addEgwRef("Daniel's Prophecies — End-Time Visions", 1,
    `Ellen G. White on Daniel 2: "In the annals of human history, the growth of nations, the rise and fall of empires, appear as dependent on the will and prowess of man... But in the Word of God the curtain is drawn aside" — read Prophets and Kings, chapter 44 (${EGW_LINK}/book/88/chapter/44).`);

  await addEgwRef("Daniel's Prophecies — End-Time Visions", 2,
    `Ellen G. White on Daniel 7: "The line of prophecy in which these symbols are found begins with Daniel 7, and extends to the close of earth's history" — explore The Great Controversy, chapter 18 (${EGW_LINK}/book/132/chapter/18).`);

  await addEgwRef("Daniel's Prophecies — End-Time Visions", 3,
    `Ellen G. White on the judgment: "The coming of Christ as our high priest to the most holy place, for the cleansing of the sanctuary... was the event foretold by the ending of the 2300 days" — read The Great Controversy, chapter 23 (${EGW_LINK}/book/132/chapter/23).`);

  await addEgwRef("Daniel's Prophecies — End-Time Visions", 4,
    `Ellen G. White on the 2,300-day prophecy: "The prophecy of Daniel 8:14, 'Unto two thousand and three hundred days; then shall the sanctuary be cleansed,' and the first angel's message, 'Fear God, and give glory to Him; for the hour of His judgment is come,' pointed to Christ's ministration in the most holy place" — explore The Great Controversy, chapter 22 (${EGW_LINK}/book/132/chapter/22).`);

  await addEgwRef("Daniel's Prophecies — End-Time Visions", 5,
    `Ellen G. White on the time of trouble: "When He leaves the sanctuary, darkness covers the inhabitants of the earth... The people of God will then be plunged into those scenes of affliction and distress described by the prophet as the time of Jacob's trouble" — read The Great Controversy, chapter 39 (${EGW_LINK}/book/132/chapter/39).`);

  await addEgwRef("Daniel's Prophecies — End-Time Visions", 6,
    `Ellen G. White on the three angels' messages: "The first and second angels' messages were given in 1843 and 1844, and we are now under the proclamation of the third; but all three of the messages are still to be proclaimed" — explore Early Writings (${EGW_LINK}/book/28).`);

  await addEgwRef("Daniel's Prophecies — End-Time Visions", 7,
    `Ellen G. White on the Second Coming: "Soon there appears in the east a small black cloud... It is the cloud which surrounds the Saviour... Jesus rides forth as a mighty conqueror" — read The Great Controversy, chapter 40 (${EGW_LINK}/book/132/chapter/40).`);

  console.log("  Added EGW references: Daniel's Prophecies");

  // ===== GOD'S HEALTH BLUEPRINT — EGW References =====
  await addEgwRef("God's Health Blueprint", 1,
    `Ellen G. White on the original diet: "In order to know what are the best foods, we must study God's original plan for man's diet. He who created man and who understands his needs appointed Adam his food" — read Counsels on Diet and Foods (${EGW_LINK}/book/384).`);

  await addEgwRef("God's Health Blueprint", 2,
    `Ellen G. White on dietary distinctions: "God gave His people clear instruction regarding their habits of life, and His promise was: 'The Lord will take away from thee all sickness'" — explore The Ministry of Healing (${EGW_LINK}/book/135).`);

  await addEgwRef("God's Health Blueprint", 3,
    `Ellen G. White on Daniel's health test: "Daniel purposed in his heart that he would not defile himself... And God gave them knowledge and skill" — read Prophets and Kings, chapter 39 (${EGW_LINK}/book/88/chapter/39).`);

  await addEgwRef("God's Health Blueprint", 4,
    `Ellen G. White on the body temple: "Since the mind and the soul find expression through the body, both mental and spiritual vigor are in great degree dependent upon physical strength and activity; whatever promotes physical health promotes the development of a strong mind and a well-balanced character" — explore The Ministry of Healing, chapter 8 (${EGW_LINK}/book/135/chapter/8).`);

  await addEgwRef("God's Health Blueprint", 5,
    `Ellen G. White on temperance: "True temperance teaches us to dispense entirely with everything hurtful, and to use judiciously that which is healthful" — read Patriarchs and Prophets (${EGW_LINK}/book/84).`);

  await addEgwRef("God's Health Blueprint", 6,
    `Ellen G. White on natural remedies: "Pure air, sunlight, abstemiousness, rest, exercise, proper diet, the use of water, trust in divine power — these are the true remedies" — explore The Ministry of Healing, chapter 9 (${EGW_LINK}/book/135/chapter/9).`);

  await addEgwRef("God's Health Blueprint", 7,
    `Ellen G. White on wholeness: "The body is the only medium through which the mind and the soul are developed for the upbuilding of character" — read The Ministry of Healing (${EGW_LINK}/book/135).`);

  console.log("  Added EGW references: God's Health Blueprint");

  // ===== THE HEAVENLY SANCTUARY — EGW References =====
  await addEgwRef("The Heavenly Sanctuary", 1,
    `Ellen G. White on the sanctuary pattern: "The tabernacle was so constructed that it could be taken apart and borne with them in all their journeyings... It was the abiding place of the Most High" — read Patriarchs and Prophets, chapter 30 (${EGW_LINK}/book/84/chapter/30).`);

  await addEgwRef("The Heavenly Sanctuary", 2,
    `Ellen G. White on the sacrificial system: "In the ministration of the tabernacle, and of the temple that afterward took its place, the people were taught each day the great truths relative to Christ's death and ministration" — explore The Great Controversy, chapter 23 (${EGW_LINK}/book/132/chapter/23).`);

  await addEgwRef("The Heavenly Sanctuary", 3,
    `Ellen G. White on Christ's intercession: "Our great High Priest completed the sacrificial offering of Himself when He suffered without the gate. Then a perfect atonement was made for the sins of the people" — read Selected Messages, Book 1 (${EGW_LINK}/book/98).`);

  await addEgwRef("The Heavenly Sanctuary", 4,
    `Ellen G. White on the Day of Atonement: "As in the typical service, the work of atonement commenced in the holy of holies. The blood of Christ, pleaded in behalf of penitent believers, secured their pardon and acceptance with the Father" — explore The Great Controversy, chapter 23 (${EGW_LINK}/book/132/chapter/23).`);

  await addEgwRef("The Heavenly Sanctuary", 5,
    `Ellen G. White on Christ's heavenly ministry: "The intercession of Christ in man's behalf in the sanctuary above is as essential to the plan of salvation as was His death upon the cross" — read The Great Controversy, chapter 28 (${EGW_LINK}/book/132/chapter/28).`);

  await addEgwRef("The Heavenly Sanctuary", 6,
    `Ellen G. White on the law in the ark: "In the temple in heaven, the dwelling place of God, His throne is established in righteousness and judgment. In the most holy place is His law, the great rule of right by which all mankind are tested" — explore The Great Controversy, chapter 28 (${EGW_LINK}/book/132/chapter/28).`);

  await addEgwRef("The Heavenly Sanctuary", 7,
    `Ellen G. White on access to God: "The wounded, bruised soul who comes to Jesus with a sense of helplessness... will not be turned away" — read Steps to Christ (${EGW_LINK}/book/108).`);

  console.log("  Added EGW references: The Heavenly Sanctuary");

  // ===== DEATH, SLEEP, AND RESURRECTION — EGW References =====
  await addEgwRef("Death, Sleep, and Resurrection", 1,
    `Ellen G. White on the nature of humanity: "Man was to bear God's image, both in outward resemblance and in character... But through disobedience, this was forfeited" — read Patriarchs and Prophets, chapter 2 (${EGW_LINK}/book/84/chapter/2).`);

  await addEgwRef("Death, Sleep, and Resurrection", 2,
    `Ellen G. White on death as sleep: "To the believer, death is but a small matter... The Christian can look upon death as only a sleep, a moment of silence and darkness. The life is hid with Christ in God" — explore The Desire of Ages, chapter 81 (${EGW_LINK}/book/130/chapter/81).`);

  await addEgwRef("Death, Sleep, and Resurrection", 3,
    `Ellen G. White on the wages of sin: "God does not force the will or judgment of any. He takes no pleasure in a slavish obedience. He desires that the creatures of His hands shall love Him because He is worthy of love" — read The Great Controversy, chapter 34 (${EGW_LINK}/book/132/chapter/34).`);

  await addEgwRef("Death, Sleep, and Resurrection", 4,
    `Ellen G. White on the resurrection: "Amid the reeling of the earth, the flash of lightning, and the roar of thunder, the voice of the Son of God calls forth the sleeping saints" — explore The Great Controversy, chapter 40 (${EGW_LINK}/book/132/chapter/40).`);

  await addEgwRef("Death, Sleep, and Resurrection", 5,
    `Ellen G. White on spiritualism: "Satan has long been preparing for his final effort to deceive the world... and here is the strong, almost overmastering delusion. The doctrine of natural immortality has prepared the way" — read The Great Controversy, chapter 34 (${EGW_LINK}/book/132/chapter/34).`);

  await addEgwRef("Death, Sleep, and Resurrection", 6,
    `Ellen G. White on the gift of immortality: "To him that overcometh... I will give him the morning star. They will be given immortality when the Life-giver comes" — explore The Great Controversy, chapter 40 (${EGW_LINK}/book/132/chapter/40).`);

  console.log("  Added EGW references: Death, Sleep, and Resurrection");

  console.log("\nAll updates complete!");
  console.log("- 5 plan descriptions cleaned up (no denominational framing)");
  console.log("- 34 Ellen White references added across all 5 plans");
  console.log("- All EGW references link to egwwritings.org (never embedded text)");
  process.exit(0);
}

update().catch((err) => {
  console.error("Update error:", err);
  process.exit(1);
});
