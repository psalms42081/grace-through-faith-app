import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  kidsCollections,
  kidsStories,
  kidsQuizQuestions,
  kidsBadges,
} from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  console.log("Seeding Kids Club content...");

  const [godMade] = await db
    .insert(kidsCollections)
    .values({
      title: "God Made Everything",
      description:
        "Discover the wonderful world God created! From the stars in the sky to the fish in the sea, learn how God made it all with love.",
      ageGroup: "little_lambs",
      icon: "flower",
      storyCount: 5,
      orderIndex: 0,
      published: true,
    })
    .returning();

  const [heroes] = await db
    .insert(kidsCollections)
    .values({
      title: "Heroes of Faith",
      description:
        "Meet brave men and women who trusted God even when things were scary. Their stories show us how to be brave too!",
      ageGroup: "little_lambs",
      icon: "shield",
      storyCount: 5,
      orderIndex: 1,
      published: true,
    })
    .returning();

  const [genesis] = await db
    .insert(kidsCollections)
    .values({
      title: "Journey Through Genesis",
      description:
        "Explore the book of beginnings! From creation to Joseph in Egypt, follow God's plan for His people through the first book of the Bible.",
      ageGroup: "young_disciples",
      icon: "book-open",
      storyCount: 5,
      orderIndex: 0,
      published: true,
    })
    .returning();

  const [gospel] = await db
    .insert(kidsCollections)
    .values({
      title: "The Gospel Story",
      description:
        "Walk alongside Jesus through His life, ministry, death, and resurrection. Discover why He came and what His sacrifice means for you.",
      ageGroup: "young_disciples",
      icon: "cross",
      storyCount: 5,
      orderIndex: 1,
      published: true,
    })
    .returning();

  const [faithIdentity] = await db
    .insert(kidsCollections)
    .values({
      title: "Faith & Identity",
      description:
        "Explore what it means to find your identity in Christ. These stories tackle real issues teens face — peer pressure, self-doubt, and standing for your beliefs when the world pushes back.",
      ageGroup: "young_disciples_plus",
      icon: "compass",
      storyCount: 4,
      orderIndex: 0,
      published: true,
    })
    .returning();

  const [heroesConviction] = await db
    .insert(kidsCollections)
    .values({
      title: "Heroes of Conviction",
      description:
        "Meet biblical heroes who refused to compromise — Daniel in a pagan empire, Esther risking her life, David facing impossible odds, and Joseph enduring betrayal. Their stories speak directly to the challenges you face today.",
      ageGroup: "young_disciples_plus",
      icon: "shield",
      storyCount: 4,
      orderIndex: 1,
      published: true,
    })
    .returning();

  console.log("Collections created.");

  const storyData = [
    {
      title: "God Made the Light",
      scriptureRef: "Genesis 1:1-5",
      bookId: 1,
      chapter: 1,
      ageGroup: "little_lambs",
      collectionId: godMade.id,
      orderInCollection: 0,
      storyText:
        "A long, long time ago, before there were trees or animals or people, there was nothing at all. It was very, very dark everywhere. But God was there! God is always there.\n\nGod looked at the darkness and He had a wonderful idea. He said, 'Let there be light!' And guess what happened? Light appeared! Bright, beautiful, warm light filled everything. It was like the biggest sunrise you have ever seen, but even more amazing.\n\nGod looked at the light and He smiled. 'This is good,' God said. He loved what He had made. God called the light 'Day' and the darkness 'Night.' When the light shone, it was daytime. When it was dark, it was nighttime — perfect for sleeping!\n\nDo you know what is so special about this? God made light just by speaking! He did not need a flashlight or a lamp. He just said the words, and it happened. That is how powerful God is.\n\nEvery morning when you see the sun come up and the sky turns pink and orange, you can remember that God made the very first light. He made it because He wanted to share something beautiful with you. God loves making wonderful things, and He made light so you could see all the other amazing things He created.\n\nWhen you turn on a light at night and the darkness goes away, think about God. He is the one who made light. And just like light chases away the dark, God is always with you, even when you feel afraid.",
      memoryVerse: "God said, 'Let there be light,' and there was light.",
      memoryVerseRef: "Genesis 1:3",
      thinkQuestions: [
        "What did God make on the very first day?",
        "How did God make the light?",
        "What do you think about when you see a beautiful sunrise?",
      ],
      prayerPrompt:
        "Dear God, thank You for making the light. Thank You that every morning the sun comes up because You made it that way. Help me to remember that You are always with me, even in the dark. Amen.",
      activitySuggestion:
        "Go outside with a grown-up and watch the sunrise or sunset together. Talk about how God made the first light and all the beautiful colors in the sky.",
      estimatedMinutes: 5,
    },
    {
      title: "God Made the Animals",
      scriptureRef: "Genesis 1:20-25",
      bookId: 1,
      chapter: 1,
      ageGroup: "little_lambs",
      collectionId: godMade.id,
      orderInCollection: 1,
      storyText:
        "After God made the sky and the land and the oceans and the plants, He had another wonderful idea. He wanted to fill the world with animals!\n\nFirst, God made all the fish and the sea creatures. Big whales that splash in the ocean. Tiny little fish with shiny scales. Funny octopuses with eight wiggly arms. Dolphins that jump and play in the waves. God filled the whole ocean with amazing creatures!\n\nThen God made all the birds. Eagles that fly so high they almost touch the clouds. Little hummingbirds that flutter their wings super fast. Owls that hoot at nighttime. Colorful parrots and tiny sparrows. God filled the sky with beautiful birds!\n\nNext, God made all the land animals. Big elephants with long trunks. Fluffy rabbits that hop, hop, hop. Tall giraffes that can eat leaves from the tops of trees. Cuddly puppies and soft kittens. Roaring lions and gentle lambs. Wiggly worms and buzzy bees!\n\nGod looked at all the animals He had made — the swimmers, the flyers, and the walkers — and He said, 'This is good!' God loved every single one of them.\n\nDo you have a favorite animal? God made that animal! He thought of every spot on a ladybug, every stripe on a zebra, and every feather on a peacock. God is so creative and so loving. He made animals because He wanted the world to be full of life and joy.\n\nEvery time you see a bird singing or a puppy wagging its tail, remember that God made it. He made all the animals, and He made them good.",
      memoryVerse: "God made the wild animals and everything that creeps on the ground. And God saw that it was good.",
      memoryVerseRef: "Genesis 1:25",
      thinkQuestions: [
        "What is your favorite animal that God made?",
        "Can you name three animals that swim, three that fly, and three that walk?",
        "Why do you think God made so many different kinds of animals?",
      ],
      prayerPrompt:
        "Dear God, thank You for making all the animals! Thank You for puppies and kittens and fish and birds. You are so creative! Help me to take good care of the animals You made. Amen.",
      activitySuggestion:
        "Draw a picture of your three favorite animals. Tell someone why you think God made each one special.",
      estimatedMinutes: 5,
    },
    {
      title: "God Made Me",
      scriptureRef: "Genesis 1:26-31",
      bookId: 1,
      chapter: 1,
      ageGroup: "little_lambs",
      collectionId: godMade.id,
      orderInCollection: 2,
      storyText:
        "After God made the light, the sky, the land, the oceans, the plants, and all the animals, He saved the very best for last. Do you know what that was? People! God made people — and that includes you!\n\nGod said something very special: 'Let us make people in our image.' That means God made you to be like Him in some wonderful ways. You can think and feel. You can love and be kind. You can create and imagine. You can talk to God!\n\nGod took extra special care when He made people. He did not just speak them into being like the stars or the fish. The Bible tells us that God formed the first person with His own hands, gently and carefully, the way an artist makes something very precious.\n\nAnd when God looked at everything He had made — the stars, the oceans, the animals, and especially the people — He did not just say it was good. He said it was VERY good!\n\nDo you know what that means? It means that you are very good. God made you on purpose. He chose the color of your eyes and the sound of your laugh. He knows how many hairs are on your head! You are not an accident. You are a masterpiece made by the greatest artist ever — God Himself.\n\nEvery single person you see — your family, your friends, people at the store — they are all made by God too. That is why we treat everyone with kindness and love. Because every person is special to God.\n\nYou are loved. You are wanted. You are made in the image of God. And that makes you very, very special.",
      memoryVerse: "God created man in His own image.",
      memoryVerseRef: "Genesis 1:27",
      thinkQuestions: [
        "What does it mean to be made in God's image?",
        "What makes you special and unique?",
        "How can you show kindness to other people who are also made by God?",
      ],
      prayerPrompt:
        "Dear God, thank You for making me! Thank You that I am special and loved. Help me to remember that every person I meet is special to You too. Help me to be kind to everyone. Amen.",
      activitySuggestion:
        "Look in a mirror and say, 'God made me and I am special!' Then draw a picture of yourself and write 'Made by God' at the top.",
      estimatedMinutes: 5,
    },
    {
      title: "God Made the Flowers and Trees",
      scriptureRef: "Genesis 1:11-13",
      bookId: 1,
      chapter: 1,
      ageGroup: "little_lambs",
      collectionId: godMade.id,
      orderInCollection: 3,
      storyText:
        "After God made the dry land and the oceans, the land looked very bare and brown. There were no flowers, no trees, no grass — nothing green at all. But God had a beautiful plan!\n\nGod said, 'Let the land grow plants and trees!' And right away, the most wonderful things started to happen. Green grass pushed up out of the ground. Tiny flowers began to bloom in every color you can think of — red, yellow, purple, blue, pink, and white!\n\nTrees grew tall and strong with big green leaves. Some trees grew apples. Some grew oranges. Some grew bananas and peaches and cherries. Yummy! God made fruit trees so people and animals would have delicious food to eat.\n\nGod also made bushes with berries, vines with grapes, and fields of wheat that could be made into bread. He made giant sunflowers that turn their faces toward the sun. He made tiny daisies and roses that smell so sweet.\n\nHave you ever held a flower up close and looked at it really carefully? Each petal is so soft and perfectly shaped. The colors are so beautiful. That is because God designed every single one. He painted every petal. He shaped every leaf.\n\nGod looked at all the plants and flowers and trees and said, 'This is good.' The whole earth was becoming a beautiful garden, all because of God's love and creativity.\n\nThe next time you see a pretty flower or a big tall tree, remember — God made that! He made the whole world beautiful because He loves beauty, and He loves you.",
      memoryVerse: "Then God said, 'Let the land produce plants.' And it was so.",
      memoryVerseRef: "Genesis 1:11",
      thinkQuestions: [
        "What is your favorite flower or tree?",
        "Why do you think God made so many different colors of flowers?",
        "What is your favorite fruit that grows on trees?",
      ],
      prayerPrompt:
        "Dear God, thank You for flowers and trees and all the beautiful plants. Thank You for fruits and vegetables that keep us healthy. Help me to enjoy and take care of the beautiful world You made. Amen.",
      activitySuggestion:
        "Go on a nature walk and collect leaves or flowers. Press them in a book and make a 'God Made These' nature journal.",
      estimatedMinutes: 5,
    },
    {
      title: "God Made the Stars and Moon",
      scriptureRef: "Genesis 1:14-19",
      bookId: 1,
      chapter: 1,
      ageGroup: "little_lambs",
      collectionId: godMade.id,
      orderInCollection: 4,
      storyText:
        "Have you ever looked up at the sky at night? What do you see? Stars! Lots and lots of twinkling stars. And the big, bright moon shining down. God made all of those!\n\nOn the fourth day of creation, God made the sun, the moon, and all the stars. The sun is a giant ball of light that keeps us warm and helps plants grow. Without the sun, the world would be cold and dark. God knew we needed it!\n\nGod also made the moon. The moon is like a nightlight in the sky. Sometimes it is a big round circle, and sometimes it is just a tiny sliver. But it is always there, shining gently in the darkness.\n\nAnd then there are the stars! God made more stars than anyone could ever count. Billions and billions of them! Some are so far away that their light takes years and years to reach your eyes. Every twinkle you see is a star that God placed in the sky.\n\nThe Bible says that God knows every single star by name. He calls each one! If God cares about every star in the sky, just imagine how much He cares about you. You are worth more to God than all the stars put together.\n\nGod made the sun to rule the day and the moon to rule the night. He set them in the sky like a giant clock, marking days and seasons and years. God thinks of everything!\n\nTonight, if it is clear outside, ask a grown-up to take you out and look at the stars. As you look up at that big sky full of lights, remember that the same God who hung every star in space loves you and is watching over you right now.",
      memoryVerse: "He counts the number of the stars; He calls them all by name.",
      memoryVerseRef: "Psalm 147:4",
      thinkQuestions: [
        "How many stars do you think God made?",
        "What does the moon look like tonight?",
        "If God knows every star by name, what does that tell you about how much He loves you?",
      ],
      prayerPrompt:
        "Dear God, the stars are so beautiful! Thank You for the sun that keeps us warm and the moon that shines at night. You are so big and so powerful. Thank You that even though You made billions of stars, You still love me. Amen.",
      activitySuggestion:
        "On a clear night, lie on a blanket outside and count as many stars as you can. Talk about how God knows every single one by name.",
      estimatedMinutes: 5,
    },
    {
      title: "Noah Trusts God",
      scriptureRef: "Genesis 6:9-22",
      bookId: 1,
      chapter: 6,
      ageGroup: "little_lambs",
      collectionId: heroes.id,
      orderInCollection: 0,
      storyText:
        "Noah was a good man who loved God. He talked to God and listened to God every day. But the people around Noah were not being good. They were mean and selfish and had forgotten all about God.\n\nGod was very sad about this. He told Noah, 'I am going to send a big flood to wash the earth clean. But I will keep you and your family safe because you trust me. I want you to build a very big boat called an ark.'\n\nNoah had never built a boat before! But he trusted God. So Noah started building. He cut down big trees. He measured and hammered and sawed. Day after day, week after week, Noah kept building.\n\nThe people around him laughed. 'Why are you building a boat on dry land? That is silly!' they said. But Noah did not stop. He trusted God.\n\nWhen the ark was finished, it was HUGE! God told Noah to bring two of every kind of animal onto the ark. Can you imagine? Two elephants, two giraffes, two bunnies, two birds, two of everything! Noah and his family helped all the animals onto the big boat.\n\nThen the rain started. It rained and rained and rained. Water covered the whole earth. But Noah, his family, and all the animals were safe and dry inside the ark, just like God had promised.\n\nAfter a long time, the rain stopped. The water went down. Noah sent out a dove, and it came back with a green leaf. Land was appearing! When everyone came out of the ark, God put a beautiful rainbow in the sky. 'I promise,' God said, 'I will never flood the whole earth again.'\n\nEvery time you see a rainbow, remember God's promise and Noah's trust. When God asks you to do something, even if it seems hard or silly to others, you can trust Him — just like Noah did.",
      memoryVerse: "Noah did everything just as God commanded him.",
      memoryVerseRef: "Genesis 6:22",
      thinkQuestions: [
        "Why do you think Noah kept building even when people laughed at him?",
        "What does a rainbow remind us about God?",
        "Can you think of a time when you had to trust someone even though it was hard?",
      ],
      prayerPrompt:
        "Dear God, help me to be brave like Noah. Even when other people do not understand, help me to listen to You and obey. Thank You for always keeping Your promises. Amen.",
      activitySuggestion:
        "Build a boat out of cardboard or blocks. Gather toy animals and pretend to load them onto the ark, two by two!",
      estimatedMinutes: 6,
    },
    {
      title: "David and the Giant",
      scriptureRef: "1 Samuel 17:32-50",
      bookId: 9,
      chapter: 17,
      ageGroup: "little_lambs",
      collectionId: heroes.id,
      orderInCollection: 1,
      storyText:
        "David was a young shepherd boy. He took care of his father's sheep on the green hills. He was not big or strong like a soldier. He was just a boy with a sling and some stones. But David loved God with all his heart.\n\nOne day, David went to visit his big brothers who were soldiers in the army. When he got there, he saw something scary. A GIANT man named Goliath was standing on the other side of the valley. Goliath was so tall that he made everyone else look tiny!\n\nGoliath shouted, 'Send someone to fight me! If they win, we will be your servants. If I win, you will be ours!' Every single soldier was afraid. Nobody wanted to fight the giant.\n\nBut David was not afraid. Do you know why? Because David knew that God was bigger than any giant. 'I will fight him!' David said.\n\nKing Saul tried to give David heavy armor, but it was too big. David took it off. Instead, he picked up five smooth stones from a stream and put them in his pouch. He held his sling in his hand.\n\nGoliath laughed when he saw David. 'You are just a little boy!' he roared.\n\nBut David said, 'You come to me with a sword and a spear, but I come to you in the name of the Lord!'\n\nDavid put a stone in his sling. He swung it around and around and let it fly. WHOOSH! The stone hit Goliath right on the forehead, and the giant fell down with a mighty CRASH!\n\nDavid did not win because he was big or strong. He won because God was with him. And God is with you too. When you face something that feels as big as a giant — like a new school, a hard test, or being afraid of the dark — remember David. God is bigger than any giant you will ever face.",
      memoryVerse: "The Lord who delivered me from the paw of the lion will deliver me from this giant.",
      memoryVerseRef: "1 Samuel 17:37",
      thinkQuestions: [
        "Why was David not afraid of Goliath?",
        "What is something in your life that feels as big as a giant?",
        "How can you trust God when you are afraid?",
      ],
      prayerPrompt:
        "Dear God, help me to be brave like David. When I face things that feel really big and scary, remind me that You are bigger. Thank You for always being with me. Amen.",
      activitySuggestion:
        "Find five smooth stones outside. Hold them and remember how David trusted God. Talk about your own 'giants' and how God can help you with them.",
      estimatedMinutes: 6,
    },
    {
      title: "Daniel and the Lions",
      scriptureRef: "Daniel 6:10-23",
      bookId: 27,
      chapter: 6,
      ageGroup: "little_lambs",
      collectionId: heroes.id,
      orderInCollection: 2,
      storyText:
        "Daniel was a man who loved God very, very much. Three times every single day, Daniel would kneel down by his window, look up toward heaven, and pray. He thanked God for His goodness and asked God for help. Daniel never, ever missed his prayer time.\n\nBut some jealous men did not like Daniel. They went to the king and tricked him into making a new law: 'No one is allowed to pray to anyone except the king for thirty days. If they do, they will be thrown into the den of lions!' The king signed the law.\n\nWhen Daniel heard about the new law, did he stop praying? No way! Daniel opened his window, knelt down, and prayed to God — just like he always did. He was not going to stop talking to God, no matter what.\n\nThe jealous men caught Daniel praying and told the king. The king was very sad because he liked Daniel, but he had to follow his own law. Daniel was thrown into the den of hungry lions!\n\nBut Daniel was not alone in that dark den. God sent an angel to shut the lions' mouths! The lions did not hurt Daniel at all. He sat there all night with the lions, safe and sound, because God was protecting him.\n\nIn the morning, the king ran to the den. 'Daniel! Did your God save you?' he called out.\n\n'Yes!' Daniel answered. 'God sent His angel to shut the lions' mouths. They have not hurt me at all!'\n\nThe king was so happy! He pulled Daniel out and made a new law: everyone should respect Daniel's God, the one true God who saves and rescues.\n\nDaniel was brave because he trusted God. He kept praying even when it was dangerous. You can talk to God anytime, anywhere. He always listens and He always cares.",
      memoryVerse: "My God sent His angel and shut the lions' mouths.",
      memoryVerseRef: "Daniel 6:22",
      thinkQuestions: [
        "Why did Daniel keep praying even though it was against the law?",
        "How did God protect Daniel in the lions' den?",
        "What is your favorite time to talk to God?",
      ],
      prayerPrompt:
        "Dear God, thank You that I can talk to You anytime. Help me to be brave like Daniel and to keep praying even when it is hard. Thank You for always listening to me. Amen.",
      activitySuggestion:
        "Practice praying three times today — in the morning, at lunchtime, and before bed — just like Daniel did!",
      estimatedMinutes: 6,
    },
    {
      title: "Miriam Watches Over Baby Moses",
      scriptureRef: "Exodus 2:1-10",
      bookId: 2,
      chapter: 2,
      ageGroup: "little_lambs",
      collectionId: heroes.id,
      orderInCollection: 3,
      storyText:
        "A long time ago in the land of Egypt, a mean king called Pharaoh made a terrible rule. He said that all baby boys born to the Israelite families had to be thrown into the river. It was a very scary time.\n\nBut one brave mommy had a beautiful baby boy. She loved him so much! She hid him for three whole months, keeping him quiet and safe. But as the baby grew bigger, he became harder to hide.\n\nSo his mommy had a clever idea. She made a little basket-boat out of reeds and covered it with sticky tar so no water could get in. She gently laid her baby inside the basket and placed it in the tall grass by the river. Then she left his big sister, Miriam, to watch over him.\n\nMiriam was very brave. She hid in the bushes nearby and watched the basket carefully. She was not going to let anything happen to her baby brother!\n\nSoon, the princess of Egypt — Pharaoh's own daughter — came to the river to take a bath. She saw the little basket floating in the grass. 'What is that?' she said. Her servant brought it to her, and when the princess opened it, she found the baby! He was crying, and her heart melted.\n\n'This is one of the Israelite babies,' she said softly. She felt sorry for him.\n\nBrave Miriam stepped out from her hiding spot. 'Would you like me to find someone to take care of the baby for you?' she asked.\n\n'Yes!' said the princess.\n\nAnd guess who Miriam brought? The baby's own mommy! So the baby's mommy got to take care of him until he was older, and then he went to live in the palace with the princess. The princess named him Moses, which means 'I drew him out of the water.'\n\nGod used a brave big sister, a clever mommy, and a kind princess to save baby Moses. God had big plans for Moses. And God has big plans for you too! Even kids can be heroes when they trust God.",
      memoryVerse: "The Lord is my helper; I will not be afraid.",
      memoryVerseRef: "Hebrews 13:6",
      thinkQuestions: [
        "How was Miriam brave in this story?",
        "How did God use different people to save baby Moses?",
        "Can you think of a time when you helped someone?",
      ],
      prayerPrompt:
        "Dear God, thank You for using brave people like Miriam and Moses' mommy. Help me to be brave and helpful too. Show me how I can take care of others, even when it is hard. Amen.",
      activitySuggestion:
        "Make a little basket out of paper or a small container. Put a small doll or toy inside and retell the story of baby Moses.",
      estimatedMinutes: 6,
    },
    {
      title: "Esther the Brave Queen",
      scriptureRef: "Esther 4:12-16",
      bookId: 17,
      chapter: 4,
      ageGroup: "little_lambs",
      collectionId: heroes.id,
      orderInCollection: 4,
      storyText:
        "Esther was a young Jewish girl who became the queen of a great big kingdom! She lived in a beautiful palace, wore fancy robes, and had everything she could ever want. But Esther had a secret — she was Jewish, and she had not told the king.\n\nOne day, a very mean man named Haman made a terrible plan. He wanted to hurt all of the Jewish people in the whole kingdom! When Esther's cousin Mordecai heard about the plan, he was very upset. He sent a message to Esther: 'You must go to the king and ask him to save our people!'\n\nBut there was a big problem. In those days, nobody was allowed to go talk to the king unless the king called for them first. If Esther went to the king without being invited, she could be in big trouble. She could even die!\n\nEsther was afraid. But then Mordecai said something very important: 'Maybe God made you queen for this very reason — for such a time as this.'\n\nEsther thought about it. She decided to be brave. She said, 'Tell all the people to pray and go without food for three days. I will do the same. And then I will go to the king. If I die, I die.'\n\nAfter three days of praying, Esther put on her royal robes and walked into the king's throne room. Her heart was pounding. But when the king saw Esther, he smiled and held out his golden scepter. That meant she was welcome!\n\nEsther told the king about Haman's terrible plan. The king was angry at Haman and saved all the Jewish people! Queen Esther's bravery saved everyone!\n\nEsther was brave because she trusted God. She knew that God had put her in that special place for a special reason. And God has put you right where you are for a reason too. You might not be a queen, but you can still be brave and do the right thing, even when it is scary.",
      memoryVerse: "Who knows? Maybe you were made queen for such a time as this.",
      memoryVerseRef: "Esther 4:14",
      thinkQuestions: [
        "What made Esther afraid to go to the king?",
        "What gave Esther the courage to be brave?",
        "How do you think God has put you in a special place to help others?",
      ],
      prayerPrompt:
        "Dear God, thank You for brave Queen Esther. Help me to be brave like her. When I need to do the right thing, even if it is scary, give me courage. Show me the special reason You have put me where I am. Amen.",
      activitySuggestion:
        "Dress up as a king or queen. Act out the story of Esther going to the king. Talk about a time when you needed to be brave.",
      estimatedMinutes: 6,
    },
    {
      title: "In the Beginning: Creation",
      scriptureRef: "Genesis 1:1-2:3",
      bookId: 1,
      chapter: 1,
      ageGroup: "young_disciples",
      collectionId: genesis.id,
      orderInCollection: 0,
      storyText:
        "The very first words of the Bible set the stage for everything that follows: 'In the beginning, God created the heavens and the earth.' Before anything existed — before time itself — God was there. He is eternal, without beginning or end, and He chose to create.\n\nThe earth was formless, empty, and covered in darkness. But the Spirit of God was hovering over the waters, ready to bring order out of chaos. Then God spoke. 'Let there be light,' He said, and light burst into existence. With just His words, God began to shape the universe.\n\nOver six days, God built the world with purpose and beauty. He separated light from darkness, creating day and night. He placed a great expanse between the waters above and below, forming the sky. He gathered the waters together to reveal dry land and commanded the earth to produce plants, trees, flowers, and fruit.\n\nGod filled the sky with the sun, moon, and stars — not just for light but to mark seasons, days, and years. He packed the oceans with fish and sea creatures and filled the skies with birds of every kind. He created land animals — livestock, wild creatures, and everything that crawls on the ground.\n\nThen came the crowning moment. God said, 'Let us make mankind in our image, in our likeness.' He formed the first human from the dust of the ground and breathed life into him. He created male and female, blessed them, and gave them responsibility over all the earth. Humanity was not just another creation — they were made to reflect God's character, to relate to Him, and to care for what He had made.\n\nWhen God surveyed everything, He declared it 'very good.' On the seventh day, God rested — not because He was tired, but to establish a pattern of rest and to celebrate what He had accomplished. The Sabbath was God's gift, a reminder that life is more than work and productivity.\n\nThe creation account tells us three crucial truths: God is powerful enough to create everything from nothing, wise enough to design it with order and beauty, and loving enough to place us at the center of it all. You are not an accident. You are crafted in the image of the Almighty God, and your life has purpose from the very beginning.",
      memoryVerse: "In the beginning God created the heavens and the earth.",
      memoryVerseRef: "Genesis 1:1",
      thinkQuestions: [
        "What does it mean that humans are made 'in God's image'? How does that set us apart from the rest of creation?",
        "Why do you think God rested on the seventh day? What does that teach us about rest?",
        "How does knowing that God created with purpose change the way you see yourself and the world around you?",
      ],
      prayerPrompt:
        "Creator God, You made everything — the stars, the oceans, the animals, and me. Thank You for creating me with purpose and for calling me 'very good.' Help me to live in a way that reflects Your image and to care for the world You entrusted to us. Amen.",
      activitySuggestion:
        "Create a 'Seven Days of Creation' journal. For each day of the week, write about or illustrate one day of creation. On the seventh day, practice Sabbath rest by doing something restful and thanking God for His work.",
      estimatedMinutes: 8,
    },
    {
      title: "The Fall: Sin Enters the World",
      scriptureRef: "Genesis 3:1-24",
      bookId: 1,
      chapter: 3,
      ageGroup: "young_disciples",
      collectionId: genesis.id,
      orderInCollection: 1,
      storyText:
        "God placed the first man, Adam, and the first woman, Eve, in a beautiful garden called Eden. It was paradise — filled with fruit trees, flowing rivers, and the presence of God Himself. They had everything they needed and walked with God in the cool of the day.\n\nGod gave them just one rule: 'You may eat from any tree in the garden, but you must not eat from the tree of the knowledge of good and evil. If you eat from it, you will surely die.' It was a simple boundary set by a loving God.\n\nBut a crafty serpent came to Eve with a question designed to plant doubt: 'Did God really say you cannot eat from any tree in the garden?' Notice how the serpent twisted God's words. God had said they could eat from every tree except one. The serpent made it sound like God was holding something back.\n\nEve corrected the serpent, but then he lied: 'You will not die! God knows that when you eat from it, your eyes will be opened, and you will be like God.' The temptation was powerful — the fruit looked good, it promised wisdom, and it offered independence from God's authority.\n\nEve took the fruit and ate it. She gave some to Adam, who was with her, and he ate too. Immediately, everything changed. They felt shame for the first time and tried to cover themselves. When they heard God walking in the garden, they hid.\n\nGod called out, 'Where are you?' He already knew the answer, but He wanted them to come to Him. Adam blamed Eve. Eve blamed the serpent. Sin had broken the trust between humanity and God.\n\nThere were consequences. Pain, toil, and eventually death entered the world. Adam and Eve were sent out of the garden. But even in this darkest moment, God showed mercy. He made clothes for them from animal skins — the first sacrifice — and He made a promise. One day, an offspring of the woman would crush the serpent's head. This was the first hint of Jesus, the one who would defeat sin and death.\n\nThe story of the Fall teaches us that sin always begins with doubting God's goodness and His Word. But it also teaches us that even when we fail, God does not abandon us. He comes looking for us, He covers our shame, and He already has a plan for our rescue.",
      memoryVerse: "All have sinned and fall short of the glory of God.",
      memoryVerseRef: "Romans 3:23",
      thinkQuestions: [
        "How did the serpent twist God's words to create doubt? How does that happen in our lives today?",
        "What were the consequences of Adam and Eve's choice? What does this teach about the seriousness of sin?",
        "Even in judgment, how did God show grace and mercy to Adam and Eve?",
      ],
      prayerPrompt:
        "Lord, I know that like Adam and Eve, I sometimes choose my own way instead of Yours. Forgive me for the times I doubt Your goodness. Thank You for not abandoning me when I fail. Thank You for Your plan to rescue me through Jesus. Amen.",
      activitySuggestion:
        "Write down one area where you are tempted to doubt God's goodness or His Word. Pray about it and find a Bible verse that speaks truth into that doubt. Keep it somewhere you can see it every day.",
      estimatedMinutes: 8,
    },
    {
      title: "Noah and the Flood",
      scriptureRef: "Genesis 6:9-9:17",
      bookId: 1,
      chapter: 6,
      ageGroup: "young_disciples",
      collectionId: genesis.id,
      orderInCollection: 2,
      storyText:
        "As generations passed after the Fall, humanity grew more and more wicked. Violence filled the earth, and people's thoughts were constantly evil. The Bible says that God was grieved in His heart — the world He had created good had been corrupted by sin.\n\nBut in the middle of all this darkness, one man stood out: Noah. The Bible describes him as 'a righteous man, blameless among the people of his time,' who 'walked faithfully with God.' Noah was not perfect, but he had a relationship with God and lived differently from everyone around him.\n\nGod told Noah His plan: He would send a great flood to cleanse the earth, but He would save Noah, his family, and representatives of every animal species. God gave Noah detailed instructions to build an enormous ark — about 450 feet long, 75 feet wide, and 45 feet high. It would have three decks, a door, and a window.\n\nNoah obeyed. For years, he built the ark in obedience to God while the people around him likely mocked and ridiculed him. Imagine building a massive boat when there was no sign of rain! But Noah's faith was not based on what he could see — it was based on what God had said.\n\nWhen the ark was complete, God brought the animals to Noah — two of every kind, seven pairs of certain clean animals. Noah, his wife, his three sons, and their wives entered the ark. Then God Himself shut the door.\n\nThe rain came. For forty days and forty nights, water poured from the sky and burst from underground springs. The flood covered the entire earth, even the highest mountains. Every living thing outside the ark perished. But inside, Noah and his family were safe.\n\nAfter 150 days, the waters began to recede. The ark came to rest on the mountains of Ararat. Noah sent out a raven and then a dove to test the conditions. When the dove returned with an olive branch, Noah knew the earth was recovering. When it did not return at all, he knew it was time.\n\nGod told Noah to come out of the ark. Noah's first act was to build an altar and worship God. In response, God made a covenant — an unbreakable promise — with Noah and all living creatures: He would never again destroy the earth with a flood. The rainbow became the sign of that covenant, a visible reminder of God's faithfulness.\n\nNoah's story teaches us that obedience to God sometimes means standing alone. It teaches us that God's judgment is real but so is His mercy. And it teaches us that God always preserves a remnant — faithful people through whom His plan continues.",
      memoryVerse: "Noah did everything just as God commanded him.",
      memoryVerseRef: "Genesis 6:22",
      thinkQuestions: [
        "What does it mean to 'walk faithfully with God' like Noah did, especially when everyone around you is going a different direction?",
        "Why do you think God chose to save Noah and his family? What does this tell us about God's character?",
        "How is the rainbow a reminder of both God's judgment and His mercy?",
      ],
      prayerPrompt:
        "Father, give me the faith and courage of Noah. Help me to obey You even when I stand alone, even when I cannot see the outcome. Thank You that Your promises are as sure as the rainbow in the sky. Amen.",
      activitySuggestion:
        "The next time you see a rainbow, stop and thank God for His faithfulness. Write Genesis 6:22 on a card and put it somewhere you will see it as a reminder to do everything God commands.",
      estimatedMinutes: 9,
    },
    {
      title: "Abraham's Test of Faith",
      scriptureRef: "Genesis 22:1-18",
      bookId: 1,
      chapter: 22,
      ageGroup: "young_disciples",
      collectionId: genesis.id,
      orderInCollection: 3,
      storyText:
        "God had promised Abraham a son, and after decades of waiting, that promise was finally fulfilled in Isaac. Abraham loved Isaac deeply — this was the child of the promise, the one through whom God said He would build a great nation. Isaac was everything to Abraham.\n\nThen God tested Abraham in the most difficult way imaginable. 'Take your son, your only son Isaac, whom you love, and go to the land of Moriah. Sacrifice him there as a burnt offering on a mountain I will show you.'\n\nTry to imagine what Abraham felt. This was his beloved son, the miracle child born to him and Sarah in their old age. Everything God had promised was wrapped up in Isaac. How could God ask this?\n\nBut Abraham rose early the next morning. He cut wood for the offering, saddled his donkey, and took Isaac and two servants toward Moriah. He did not argue with God or delay. His faith, built over decades of walking with God, carried him forward.\n\nAfter three days of travel, Abraham saw the mountain in the distance. He told the servants to wait and said something remarkable: 'Stay here. The boy and I will go over there to worship, and then we will come back.' Notice the 'we.' Abraham believed that even if he sacrificed Isaac, God was powerful enough to raise him from the dead. His faith was that strong.\n\nAs they climbed the mountain together, Isaac asked, 'Father, I see the fire and the wood, but where is the lamb for the offering?' Abraham's answer was prophetic: 'God Himself will provide the lamb, my son.'\n\nAbraham built the altar, arranged the wood, and bound Isaac. He raised the knife. At that moment — at the very last second — the angel of the Lord called out, 'Abraham! Do not lay a hand on the boy. Now I know that you fear God, because you have not withheld your son, your only son, from me.'\n\nAbraham looked up and saw a ram caught in a thicket by its horns. God had provided the sacrifice. Abraham named that place 'The Lord Will Provide.' God then reaffirmed His covenant promises: Abraham's descendants would be as numerous as the stars, and through them, all nations would be blessed.\n\nThis story points forward to another Father who would not withhold His only Son. On another hill near the same region, God the Father would offer Jesus — the Lamb of God — as the sacrifice for the sins of the world. But unlike Isaac, there would be no last-minute substitute. Jesus would go all the way to the cross.\n\nAbraham's test teaches us that faith sometimes means trusting God with the thing we love most. It teaches us that God provides. And it foreshadows the greatest act of love in history — the cross.",
      memoryVerse: "Abraham named that place 'The Lord Will Provide.'",
      memoryVerseRef: "Genesis 22:14",
      thinkQuestions: [
        "What do you think was going through Abraham's mind during the three-day journey to Moriah?",
        "How does Abraham's willingness to sacrifice Isaac point forward to God's sacrifice of Jesus?",
        "Is there something in your life that God might be asking you to trust Him with? What makes it hard to let go?",
      ],
      prayerPrompt:
        "Lord, Abraham trusted You with the thing he loved most. Help me to hold everything in my life with open hands, knowing that You are the provider. When my faith is tested, strengthen me to trust Your plan even when I cannot see it. Amen.",
      activitySuggestion:
        "Write the name of something precious to you on a piece of paper. Place it in your Bible at Genesis 22 as a symbol of trusting God with what you love. Pray over it throughout the week.",
      estimatedMinutes: 9,
    },
    {
      title: "Joseph: From Pit to Palace",
      scriptureRef: "Genesis 37, 39-45",
      bookId: 1,
      chapter: 37,
      ageGroup: "young_disciples",
      collectionId: genesis.id,
      orderInCollection: 4,
      storyText:
        "Joseph was the eleventh son of Jacob, but he was his father's favorite. Jacob gave Joseph a special colorful robe, which made his older brothers furiously jealous. To make things worse, Joseph had dreams that suggested his family would one day bow down to him. His brothers' jealousy turned to hatred.\n\nOne day, when Joseph was seventeen, his brothers saw him coming across the fields. 'Here comes the dreamer,' they sneered. They grabbed him, tore off his special robe, and threw him into an empty pit. Then they sold him to a passing caravan of traders heading to Egypt. They dipped his robe in goat's blood and told their father that a wild animal had killed Joseph. Jacob was devastated.\n\nIn Egypt, Joseph was sold as a slave to Potiphar, an officer of Pharaoh. But even as a slave, God was with Joseph. He worked hard and faithfully, and Potiphar put him in charge of his entire household. Then Potiphar's wife falsely accused Joseph, and he was thrown into prison.\n\nEven in prison, God was with Joseph. He interpreted the dreams of two fellow prisoners — a cupbearer and a baker — and his interpretations came true. But the cupbearer, who was restored to his position, forgot about Joseph for two full years.\n\nFinally, Pharaoh himself had disturbing dreams that no one could interpret. The cupbearer remembered Joseph. Pharaoh summoned him, and Joseph — giving all credit to God — interpreted the dreams: seven years of abundant harvests would be followed by seven years of severe famine. Joseph advised Pharaoh to store grain during the good years.\n\nPharaoh was so impressed that he made Joseph the second most powerful man in all of Egypt. Joseph oversaw the storage of grain, and when the famine struck, Egypt was prepared while surrounding nations starved.\n\nThe famine reached Canaan, and Jacob sent his sons to Egypt to buy grain. They came before Joseph — now powerful, dressed in Egyptian clothing, speaking Egyptian — and did not recognize him. But Joseph recognized them. After testing them to see if they had changed, Joseph could no longer contain himself. He wept and revealed his identity: 'I am Joseph, your brother!'\n\nHis brothers were terrified, expecting revenge. But Joseph said something that reveals the heart of the entire story: 'Do not be angry with yourselves for selling me here, because it was to save lives that God sent me ahead of you. You intended to harm me, but God intended it for good, to accomplish what is now being done, the saving of many lives.'\n\nJoseph's story spans thirteen years of suffering — slavery, false accusation, imprisonment, and being forgotten. Yet through it all, God was working. Not a single moment was wasted. Every trial prepared Joseph for the role God had planned for him.\n\nThis story teaches us that God's plan is bigger than our pain. It teaches us that faithfulness in the small, hard places matters. And it teaches us the power of forgiveness — Joseph chose to see God's hand rather than hold onto bitterness.",
      memoryVerse: "You intended to harm me, but God intended it for good.",
      memoryVerseRef: "Genesis 50:20",
      thinkQuestions: [
        "How did Joseph remain faithful to God during years of injustice and suffering? What sustained him?",
        "What does Joseph's statement — 'You intended it for harm, but God intended it for good' — teach us about God's sovereignty?",
        "Is there someone you need to forgive? How does Joseph's example challenge you?",
      ],
      prayerPrompt:
        "God, like Joseph, I sometimes face situations that feel unfair and painful. Help me to trust that You are working even when I cannot see it. Give me the grace to forgive those who hurt me and the faith to believe that You can bring good out of anything. Amen.",
      activitySuggestion:
        "Write Genesis 50:20 on a card or sticky note. Think of a difficult situation in your life and write a prayer on the back, asking God to bring good from it. Keep it as a bookmark in your Bible.",
      estimatedMinutes: 10,
    },
    {
      title: "The Birth of Jesus",
      scriptureRef: "Luke 2:1-20",
      bookId: 42,
      chapter: 2,
      ageGroup: "young_disciples",
      collectionId: gospel.id,
      orderInCollection: 0,
      storyText:
        "For centuries, the people of Israel had been waiting. Prophets had foretold the coming of a Messiah — a Savior who would deliver God's people. They waited through exile, oppression, and four hundred years of prophetic silence. Then, in the most unexpected way, God broke into history.\n\nThe Roman Emperor Augustus issued a decree that everyone in the empire must be registered in a census. This forced a young carpenter named Joseph to travel from Nazareth to Bethlehem, the town of his ancestor David, with his pregnant wife Mary. The journey was about ninety miles — grueling, especially for a woman about to give birth.\n\nWhen they arrived in Bethlehem, the town was overflowing with people. There was no room at the inn. The Son of God, the long-awaited King, would not be born in a palace or even a proper home. Mary gave birth to Jesus and wrapped Him in strips of cloth, laying Him in a manger — a feeding trough for animals. The Creator of the universe entered His own creation in the humblest way possible.\n\nBut the heavens could not contain their joy. That same night, in the fields outside Bethlehem, shepherds were keeping watch over their flocks. Suddenly, an angel of the Lord appeared, and the glory of God blazed around them. The shepherds were terrified.\n\n'Do not be afraid,' the angel said. 'I bring you good news that will cause great joy for all the people. Today in the town of David a Savior has been born to you; He is the Messiah, the Lord. This will be a sign to you: you will find a baby wrapped in cloths and lying in a manger.'\n\nThen the sky exploded with angels — a vast heavenly army praising God: 'Glory to God in the highest heaven, and on earth peace to those on whom His favor rests.'\n\nThe shepherds hurried to Bethlehem and found everything just as the angel had said — Mary, Joseph, and the baby lying in the manger. They spread the word about what they had seen and heard, and everyone who heard it was amazed. Mary treasured all these things, pondering them in her heart.\n\nNotice who received the announcement first: shepherds. They were among the lowest in society — poor, rough, and considered ritually unclean. God did not announce the birth of His Son to kings or priests or scholars. He announced it to the overlooked, the ordinary, the humble. This is the gospel pattern: God's grace flows downward to the lowly.\n\nThe birth of Jesus is the fulfillment of every promise God ever made. The seed of the woman who would crush the serpent (Genesis 3:15), the offspring of Abraham through whom all nations would be blessed (Genesis 12:3), the son of David who would reign forever (2 Samuel 7:16) — all of it culminates in a baby in a manger. God became human. The infinite became an infant. The Word became flesh.",
      memoryVerse: "For unto you is born this day in the city of David a Savior, who is Christ the Lord.",
      memoryVerseRef: "Luke 2:11",
      thinkQuestions: [
        "Why do you think God chose such humble circumstances for the birth of His Son? What does that reveal about His character?",
        "Why were shepherds — social outsiders — the first to hear the good news? What does this tell us about who the gospel is for?",
        "How does the birth of Jesus fulfill the promises God made throughout the Old Testament?",
      ],
      prayerPrompt:
        "Lord Jesus, You left the glory of heaven to be born in a manger. You announced Your arrival not to the powerful but to the humble. Thank You for coming for people like me. Help me to treasure the wonder of the incarnation and to share this good news with everyone I meet. Amen.",
      activitySuggestion:
        "Read the prophecies about Jesus' birth: Isaiah 7:14, Micah 5:2, and Isaiah 9:6. Write down how each one was fulfilled in Luke 2. Reflect on God's faithfulness across centuries.",
      estimatedMinutes: 9,
    },
    {
      title: "Jesus Calls His Disciples",
      scriptureRef: "Mark 1:16-20; Luke 5:1-11",
      bookId: 41,
      chapter: 1,
      ageGroup: "young_disciples",
      collectionId: gospel.id,
      orderInCollection: 1,
      storyText:
        "After His baptism and forty days of testing in the wilderness, Jesus began His public ministry in Galilee. His message was urgent and clear: 'The time has come. The kingdom of God has come near. Repent and believe the good news!'\n\nBut Jesus did not set out to accomplish His mission alone. One of His first acts was to call ordinary people to follow Him. Walking along the shore of the Sea of Galilee, Jesus saw two brothers — Simon (later called Peter) and Andrew — casting their nets into the lake. They were fishermen, working-class men with calloused hands and no religious education.\n\n'Come, follow me,' Jesus said, 'and I will send you out to fish for people.' Immediately — the text emphasizes that word — they left their nets and followed Him. No lengthy deliberation. No negotiation. Something about Jesus' authority and presence compelled them to leave everything.\n\nA little farther along the shore, Jesus saw two more brothers — James and John, the sons of Zebedee — in a boat with their father, mending nets. Jesus called them, and they too left immediately — not just their nets but their father and the family business.\n\nLuke's Gospel provides additional detail about Peter's calling. Jesus borrowed Peter's boat to teach the crowds from the water. Afterward, He told Peter to push out into deep water and let down his nets for a catch. Peter was skeptical — they had fished all night and caught nothing. But he obeyed: 'Because You say so, I will let down the nets.'\n\nThe result was staggering. The nets caught so many fish they began to break. Peter had to call James and John for help, and both boats nearly sank under the weight. Peter fell at Jesus' knees, overwhelmed: 'Go away from me, Lord; I am a sinful man!' He recognized that he was in the presence of someone far greater than a teacher.\n\nJesus responded with grace and purpose: 'Do not be afraid; from now on you will fish for people.' They pulled their boats up on shore, left everything, and followed Him.\n\nJesus did not choose the religious elite. He chose fishermen, tax collectors, and zealots — ordinary people with flaws, doubts, and rough edges. His criteria were not qualifications but willingness. He called them as they were and then transformed them into the foundation of the church.\n\nThe call of the disciples reveals several truths. First, following Jesus requires leaving something behind — comfort, security, identity tied to career or family expectations. Second, Jesus calls us in the middle of our ordinary lives, not after we have perfected ourselves. Third, obedience even when it does not make sense leads to abundance beyond imagination.\n\nJesus is still calling today. He looks at students, athletes, artists, and everyday people and says, 'Follow me.' The question is not whether you are qualified. The question is whether you are willing.",
      memoryVerse: "Come, follow me, and I will send you out to fish for people.",
      memoryVerseRef: "Mark 1:17",
      thinkQuestions: [
        "Why do you think Jesus chose ordinary fishermen rather than religious leaders or scholars?",
        "What did the disciples have to leave behind to follow Jesus? What might you need to leave behind?",
        "How does Peter's reaction — 'Go away from me, Lord; I am a sinful man' — show what happens when we encounter Jesus' holiness?",
      ],
      prayerPrompt:
        "Jesus, You called ordinary people to do extraordinary things. I hear Your call today. Help me to leave behind whatever holds me back and to follow You with the same immediacy as Peter, Andrew, James, and John. Make me a fisher of people. Amen.",
      activitySuggestion:
        "Make a list of three things that might hold you back from fully following Jesus (fear, comfort, busyness, peer pressure). Pray over each one and ask God to help you surrender it. Share your list with a trusted friend or mentor.",
      estimatedMinutes: 9,
    },
    {
      title: "The Parable of the Good Samaritan",
      scriptureRef: "Luke 10:25-37",
      bookId: 42,
      chapter: 10,
      ageGroup: "young_disciples",
      collectionId: gospel.id,
      orderInCollection: 2,
      storyText:
        "A religious expert approached Jesus with a question designed to test Him: 'Teacher, what must I do to inherit eternal life?' Jesus, as He often did, answered with a question: 'What is written in the Law? How do you read it?'\n\nThe expert answered correctly: 'Love the Lord your God with all your heart, soul, strength, and mind, and love your neighbor as yourself.' Jesus affirmed him: 'You have answered correctly. Do this and you will live.'\n\nBut the man, wanting to justify himself, asked a follow-up question: 'And who is my neighbor?' He was looking for a way to limit his responsibility. He wanted to know who he could exclude from his love — who did not count as a neighbor.\n\nJesus responded with one of the most powerful stories ever told.\n\nA man was traveling from Jerusalem to Jericho, a dangerous seventeen-mile road that descended through rocky wilderness — a known hiding place for bandits. Robbers attacked him, stripped him of his clothes, beat him nearly to death, and left him on the roadside.\n\nA priest came down the road. He saw the man — bruised, bleeding, barely alive — and crossed to the other side. A Levite, another religious leader, did the same thing. Both of these men knew God's law. Both would have taught others about loving their neighbor. Yet when the moment demanded action, they chose convenience over compassion.\n\nThen came a Samaritan. This detail would have shocked Jesus' audience. Jews and Samaritans had centuries of hatred between them. Samaritans were considered half-breeds and heretics — the last people a Jewish audience would cast as the hero.\n\nBut the Samaritan stopped. He felt compassion. He knelt beside the wounded man, bandaged his wounds, pouring on oil and wine. He put the man on his own donkey, brought him to an inn, and took care of him. The next day, he gave the innkeeper money and said, 'Look after him. When I return, I will reimburse you for any extra expense.'\n\nJesus asked the expert: 'Which of these three do you think was a neighbor to the man who fell into the hands of robbers?'\n\nThe expert could not even bring himself to say 'the Samaritan.' He answered, 'The one who had mercy on him.'\n\nJesus said, 'Go and do likewise.'\n\nThis parable demolishes every boundary we try to put around love. The question is not 'Who is my neighbor?' — a question that seeks to exclude. The real question is 'Am I being a neighbor?' — a question that demands action. Love is not a feeling or an idea. It is stopping when it is inconvenient, helping someone who is different from you, and spending your own resources for someone else's benefit.\n\nThe priest and the Levite had the right theology but the wrong response. The Samaritan had the right response. Jesus makes clear that what matters is not what you know about God's law but whether you live it.\n\nIn a world that draws lines between who deserves help and who does not, Jesus calls us to cross the road, kneel down, and show mercy — especially to those the world considers unworthy.",
      memoryVerse: "Go and do likewise.",
      memoryVerseRef: "Luke 10:37",
      thinkQuestions: [
        "Why did the priest and the Levite pass by the wounded man? What excuses might they have made?",
        "Why was it significant that the hero of the story was a Samaritan — someone the audience would have despised?",
        "Who are the 'Samaritans' in your world — the people you are tempted to exclude? How can you be a neighbor to them?",
      ],
      prayerPrompt:
        "Lord, break down every wall I have built to limit my love. Forgive me for the times I have crossed to the other side of the road. Give me eyes to see those who are hurting, hands willing to help, and a heart that does not ask 'Who is my neighbor?' but instead asks 'How can I be a neighbor today?' Amen.",
      activitySuggestion:
        "This week, intentionally do one act of kindness for someone outside your usual circle — a stranger, someone from a different background, or someone who might not expect your help. Reflect on how it felt and what you learned about being a neighbor.",
      estimatedMinutes: 10,
    },
    {
      title: "The Cross: Jesus Dies for Us",
      scriptureRef: "Luke 23:26-49",
      bookId: 42,
      chapter: 23,
      ageGroup: "young_disciples",
      collectionId: gospel.id,
      orderInCollection: 3,
      storyText:
        "After three years of teaching, healing, and revealing the kingdom of God, Jesus arrived in Jerusalem for the final time. He knew what was coming. He had told His disciples repeatedly: the Son of Man must suffer, be rejected, be killed, and after three days rise again. But they did not understand.\n\nOn Thursday night, Jesus shared a final meal with His disciples. He broke bread and said, 'This is my body, given for you.' He took the cup and said, 'This cup is the new covenant in my blood, which is poured out for you.' Then He went to the Garden of Gethsemane to pray. His anguish was so great that His sweat became like drops of blood. 'Father, if You are willing, take this cup from me. Yet not my will, but Yours be done.'\n\nJudas, one of the twelve, betrayed Jesus with a kiss. Jesus was arrested, subjected to a series of illegal trials, mocked, beaten, and condemned to death by crucifixion — the most brutal form of execution the Roman Empire had devised.\n\nAs Jesus carried His cross through the streets of Jerusalem, a man named Simon of Cyrene was forced to help carry it. Women along the road wept for Him, but Jesus said, 'Do not weep for me; weep for yourselves and your children.' Even in His suffering, He thought of others.\n\nAt Golgotha — the Place of the Skull — they nailed Jesus to the cross. Roman soldiers drove iron spikes through His wrists and feet and raised the cross upright. Above His head they placed a sign: 'This is the King of the Jews.'\n\nTwo criminals were crucified alongside Him. The crowd mocked: 'He saved others; let Him save Himself if He is God's Messiah.' The soldiers taunted Him. Even one of the criminals hurled insults.\n\nBut the other criminal rebuked the first: 'We are punished justly, for we are getting what our deeds deserve. But this man has done nothing wrong.' Then he said, 'Jesus, remember me when You come into Your kingdom.' Jesus' response was immediate and breathtaking: 'Truly I tell you, today you will be with me in paradise.'\n\nAt noon, darkness covered the whole land for three hours. The curtain of the temple — the thick veil that separated the Holy of Holies from the rest of the temple — tore in two from top to bottom. God was declaring that the barrier between Him and humanity was removed forever.\n\nJesus cried out, 'Father, into Your hands I commit my spirit.' And He breathed His last.\n\nThe Roman centurion who witnessed everything said, 'Surely this was a righteous man.'\n\nThe cross is the center of the Christian faith. Jesus did not die as a victim of circumstances. He chose to lay down His life. He bore the weight of every sin — past, present, and future — so that we would not have to. The righteous died for the unrighteous. The innocent took the punishment of the guilty. The Creator allowed Himself to be killed by His own creation — out of love.\n\nThe torn curtain declared it: access to God is now open. The price has been paid. Forgiveness is available. The cross is not just a historical event — it is an invitation. Come as you are. The door is open.",
      memoryVerse: "Father, forgive them, for they do not know what they are doing.",
      memoryVerseRef: "Luke 23:34",
      thinkQuestions: [
        "Why is the cross central to the Christian faith? What did Jesus accomplish through His death?",
        "What is the significance of the temple curtain tearing in two? What does it mean for our relationship with God?",
        "How does Jesus' prayer — 'Father, forgive them' — challenge the way you respond to those who hurt you?",
      ],
      prayerPrompt:
        "Jesus, You chose the cross for me. You bore the weight of my sin so I could be forgiven. I do not deserve this love, but I receive it with a grateful heart. Help me to live in the freedom You purchased. May I never take Your sacrifice for granted. Amen.",
      activitySuggestion:
        "Spend fifteen minutes in quiet reflection. Read Luke 23:26-49 slowly. Write down three things that stand out to you about Jesus' character in His final hours. Thank Him for each one in prayer.",
      estimatedMinutes: 10,
    },
    {
      title: "He Is Risen: The Resurrection",
      scriptureRef: "Luke 24:1-12; John 20:1-18",
      bookId: 42,
      chapter: 24,
      ageGroup: "young_disciples",
      collectionId: gospel.id,
      orderInCollection: 4,
      storyText:
        "On Friday, they watched Him die. On Saturday, they hid behind locked doors, their hopes shattered. The one they had believed to be the Messiah was dead and buried in a borrowed tomb, sealed with a heavy stone and guarded by Roman soldiers. It was over — or so they thought.\n\nVery early on Sunday morning, while it was still dark, a group of women went to the tomb. Mary Magdalene, Joanna, Mary the mother of James, and others carried spices they had prepared to anoint Jesus' body — a final act of love and devotion. They worried about one thing: 'Who will roll away the stone for us?'\n\nBut when they arrived, the stone was already rolled away. They entered the tomb and found it empty. The body of Jesus was gone. They stood there, confused and frightened.\n\nSuddenly, two men in dazzling white clothes appeared beside them. The women fell to the ground in fear. The angels spoke words that changed history: 'Why do you look for the living among the dead? He is not here; He has risen! Remember how He told you, while He was still in Galilee: The Son of Man must be delivered over to the hands of sinners, be crucified and on the third day be raised again.'\n\nThen they remembered His words. They ran back to tell the apostles, but the men dismissed their report as nonsense. Peter, however, got up and ran to the tomb. He found the strips of linen lying by themselves — the grave clothes neatly folded — and went away, wondering to himself what had happened.\n\nJohn's Gospel gives us the most intimate resurrection encounter. Mary Magdalene stood outside the tomb weeping. Through her tears, she saw someone she thought was the gardener. 'Sir, if you have carried Him away, tell me where you have put Him, and I will get Him.'\n\nJesus said one word: 'Mary.'\n\nShe recognized His voice immediately. 'Rabboni!' she cried — Teacher! She reached out to hold Him, but Jesus said, 'Do not hold on to me, for I have not yet ascended to the Father. Go to my brothers and tell them I am ascending to my Father and your Father, to my God and your God.'\n\nMary Magdalene became the first witness of the resurrection — the first to proclaim the news that forms the foundation of Christianity: 'I have seen the Lord!'\n\nThe resurrection is not just the happy ending to a sad story. It is the foundation of everything. Paul wrote, 'If Christ has not been raised, your faith is futile.' But Christ has been raised. Death could not hold Him. The grave could not keep Him. The power of sin was broken, and a new creation had begun.\n\nBecause Jesus rose, death is no longer the final word. Because Jesus rose, forgiveness is not just a wish but a reality. Because Jesus rose, every promise He ever made is validated. Because Jesus rose, we have hope — not vague optimism, but concrete, resurrection hope — that God will make all things new.\n\nThe empty tomb is the most important place in human history. Not because of what is there, but because of what is not there. He is not here. He has risen. And that changes everything.",
      memoryVerse: "He is not here; He has risen!",
      memoryVerseRef: "Luke 24:6",
      thinkQuestions: [
        "Why is the resurrection the foundation of the Christian faith? What would change if Jesus had not risen?",
        "Why do you think Jesus revealed Himself first to Mary Magdalene — a woman whose testimony would not have been accepted in that culture's courts?",
        "What does the resurrection mean for your daily life? How does it give you hope in the face of death, loss, or discouragement?",
      ],
      prayerPrompt:
        "Risen Lord, You conquered death and the grave. Because You live, I can face tomorrow. Because You live, my sins are forgiven. Because You live, death does not have the last word. Fill me with resurrection hope and help me to live boldly as a witness of Your power. He is risen! He is risen indeed! Amen.",
      activitySuggestion:
        "Read 1 Corinthians 15:3-8 to see Paul's list of resurrection witnesses. Write out Luke 24:6 — 'He is not here; He has risen!' — and place it somewhere you will see it every day as a reminder that the tomb is empty and your hope is secure.",
      estimatedMinutes: 10,
    },
    {
      title: "Who Am I? Identity in Christ",
      scriptureRef: "Ephesians 2:10; Psalm 139:13-16",
      bookId: 49,
      chapter: 2,
      ageGroup: "young_disciples_plus",
      collectionId: faithIdentity.id,
      orderInCollection: 0,
      storyText:
        "You live in a world that constantly tells you who you should be. Social media feeds are full of highlight reels that make you feel like you are never enough — not attractive enough, not popular enough, not talented enough. Classmates define status by followers, likes, and brand names. The pressure to conform is relentless, and it starts the moment you wake up and check your phone.\n\nBut here is a truth that cuts through all of that noise: you were made on purpose, by God, for a purpose.\n\nPsalm 139 says that God knit you together in your mother's womb. He saw your unformed body and wrote every day of your life in His book before a single one of them came to be. You are not an accident, a mistake, or a random collection of cells. You are a masterpiece designed by the Creator of the universe.\n\nEphesians 2:10 takes it further: 'For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.' The Greek word for 'handiwork' is poiema — it is where we get the word 'poem.' You are God's poem, His work of art. And He did not just create you to exist — He created you to do specific things that He planned before you were even born.\n\nSo when the world tells you that your worth depends on your appearance, your grades, your athletic ability, or how many people follow you online — it is lying. Your identity is not found in what you do or what others think of you. Your identity is found in who God says you are.\n\nAnd who does God say you are? You are chosen (1 Peter 2:9). You are loved with an everlasting love (Jeremiah 31:3). You are a child of God (John 1:12). You are forgiven and redeemed (Ephesians 1:7). You are never alone (Matthew 28:20).\n\nThis does not mean life will be easy. You will face moments when you doubt yourself, when you feel invisible, when the gap between who you are and who you want to be feels impossibly wide. In those moments, anchor yourself in what God says, not what the world shouts.\n\nThere was a young man in the Bible named Jeremiah. God called him to be a prophet, but Jeremiah pushed back: 'I am too young! I do not know how to speak!' God's response was firm and tender: 'Do not say you are too young. I knew you before I formed you in the womb. Before you were born, I set you apart.'\n\nGod is saying the same thing to you. Your age does not disqualify you. Your insecurities do not disqualify you. Your past mistakes do not disqualify you. God has already decided who you are — and His opinion is the only one that matters.\n\nThe next time you look in the mirror and the voice of doubt whispers that you are not enough, remember: the God who flung stars into space and carved out ocean floors looked at you and said, 'Very good.' That settles it.",
      memoryVerse: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.",
      memoryVerseRef: "Ephesians 2:10",
      thinkQuestions: [
        "Where do you most often look for your sense of identity — social media, friends, achievements, appearance? How does that compare to what God says about you?",
        "What does it mean to you personally that God calls you His 'handiwork' or 'poem'? How does that change how you see yourself?",
        "Jeremiah felt too young and unqualified. What insecurity or excuse do you use to hold yourself back from what God might be calling you to do?",
        "How can you practically remind yourself of your identity in Christ when the world's messages feel overwhelming?",
      ],
      prayerPrompt:
        "God, thank You that my identity is not based on what the world says about me but on what You say. When I feel like I am not enough, remind me that I am Your handiwork — created with purpose, loved without condition, and chosen before the foundation of the world. Help me to live out of that identity today. Amen.",
      activitySuggestion:
        "Write out five 'I am' statements based on Scripture (e.g., 'I am chosen — 1 Peter 2:9'). Put them on your mirror, in your locker, or as notes on your phone. Read them every morning for a week and notice how it shifts your perspective.",
      estimatedMinutes: 10,
    },
    {
      title: "Standing Alone: When Faith Costs You",
      scriptureRef: "Romans 12:1-2; Matthew 5:10-12",
      bookId: 45,
      chapter: 12,
      ageGroup: "young_disciples_plus",
      collectionId: faithIdentity.id,
      orderInCollection: 1,
      storyText:
        "Following Jesus has never been the popular choice. From the moment He walked the earth, His message divided people. Some were drawn to Him; others wanted Him gone. And He was honest about what following Him would cost: 'If anyone would come after me, let him deny himself, take up his cross, and follow me.'\n\nAs a teenager, you face a version of this every day. Maybe it is the party where everyone is drinking and you know you should not be there. Maybe it is the group chat where someone is being torn apart and everyone is joining in. Maybe it is the moment when a friend asks what you believe and you feel the weight of knowing your answer will make you different.\n\nPeer pressure is not just about drugs and alcohol — those are the obvious ones. The deeper pressure is the constant pull to blend in, to stay quiet, to not make waves. It is the voice that says, 'If you speak up, they will think you are weird. If you say no, you will be left out. If you stand for something, you will stand alone.'\n\nBut Romans 12:2 says, 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.' The word 'conform' means to be molded into a shape by external pressure — like Play-Doh being squeezed into a mold. God is saying: do not let the world squeeze you into its mold. Instead, let Me reshape you from the inside out.\n\nThis is not about being self-righteous or judgmental. It is about having the courage to live differently because you belong to a different kingdom. It is about choosing integrity when nobody is watching and grace when everyone is.\n\nJesus said, 'Blessed are those who are persecuted because of righteousness, for theirs is the kingdom of heaven.' He did not say 'if' you are persecuted — He said 'when.' Standing for your faith will cost you something. It might cost you a friendship, a social circle, or a reputation. But what you gain is infinitely greater: a clear conscience, a deeper relationship with God, and the respect of the people who matter most.\n\nThink about the early Christians. They met in secret, shared everything they had, and many were killed for their faith. They did not follow Jesus because it was convenient — they followed Him because He was worth it. They understood that the approval of God is worth more than the approval of the crowd.\n\nYou are part of that same story. Every time you choose honesty over popularity, kindness over cruelty, or faithfulness over conformity, you are carrying the torch that believers have carried for two thousand years.\n\nIt will not always feel heroic. Sometimes it will feel lonely, awkward, and painful. But you are never truly alone. God promises, 'I will never leave you nor forsake you.' And there are others walking this path — find them, link arms with them, and encourage each other.\n\nThe world needs people who are not for sale. Be one of them.",
      memoryVerse: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind.",
      memoryVerseRef: "Romans 12:2",
      thinkQuestions: [
        "Can you think of a time when you felt pressure to go along with something you knew was wrong? What did you do, and what would you do differently?",
        "What does it look like practically to 'not conform to the pattern of this world' in your school, your friendships, or your online life?",
        "Jesus said those who are persecuted for righteousness are blessed. How can hardship for your faith actually be a blessing?",
        "Who in your life can you 'link arms with' to encourage each other in standing firm? How can you be that person for someone else?",
      ],
      prayerPrompt:
        "Lord, give me the courage to stand firm even when it costs me. Help me not to be squeezed into the world's mold but to be transformed from the inside by Your truth. When I feel alone in my convictions, remind me that You are with me and that Your approval is the only one I need. Amen.",
      activitySuggestion:
        "Identify one area in your life where you have been conforming to pressure instead of following your convictions. Write it down and create a practical plan for how you will respond differently next time. Share it with a trusted mentor or friend who can hold you accountable.",
      estimatedMinutes: 10,
    },
    {
      title: "Real Relationships: Friendship God's Way",
      scriptureRef: "Proverbs 13:20; 1 Corinthians 15:33; John 15:12-15",
      bookId: 20,
      chapter: 13,
      ageGroup: "young_disciples_plus",
      collectionId: faithIdentity.id,
      orderInCollection: 2,
      storyText:
        "Friendships are everything when you are a teenager. Your friends shape your language, your habits, your humor, your decisions, and even your future. The Bible knows this. Proverbs 13:20 says, 'Walk with the wise and become wise, for a companion of fools suffers harm.' And Paul writes bluntly in 1 Corinthians 15:33: 'Do not be misled: bad company corrupts good character.'\n\nThis is not about being snobbish or thinking you are better than anyone. It is about being honest about the reality that the people closest to you will pull you in a direction — either toward God or away from Him. And you will do the same for them.\n\nJesus modeled this perfectly. He was a friend of sinners — He ate with tax collectors, spoke with outcasts, and touched the untouchable. But His inner circle, the twelve disciples, were people He invested in deeply. And even among the twelve, He had three — Peter, James, and John — who were closest. Jesus was inclusive in His love but intentional about His inner circle.\n\nHere is something most people do not talk about: loneliness is one of the biggest struggles teenagers face. Even in a crowded school, you can feel invisible. Even with hundreds of online friends, you can feel disconnected. The ache for real, authentic friendship is not a weakness — it is how God designed you. He said in the beginning, 'It is not good for man to be alone.'\n\nBut here is the tension: the desire for connection can lead you to accept friendships that are toxic, manipulative, or destructive. You might tolerate being disrespected, pressured, or used because the alternative — being alone — feels worse. This is a trap.\n\nGod wants more for you than friendships built on convenience or compromise. He wants you to experience the kind of friendship He described in John 15: 'Greater love has no one than this: to lay down one's life for one's friends.' Jesus called His disciples friends — not servants — because He shared His heart with them.\n\nWhat does a godly friendship look like? It looks like honesty without cruelty. Loyalty without enabling sin. Encouragement without flattery. Accountability without judgment. It looks like two people spurring each other on toward love and good deeds, as Hebrews 10:24 says.\n\nIf you are in friendships that consistently pull you away from God, drain your joy, or pressure you to compromise, it may be time for an honest evaluation. This does not mean cutting everyone off overnight — but it does mean being intentional about who gets the closest seat at your table.\n\nAnd if you feel lonely right now — if the friends you want seem far away — know this: God sees you. He is the friend who sticks closer than a brother (Proverbs 18:24). Ask Him to bring people into your life who will sharpen you as iron sharpens iron. And be willing to be that person for someone else. Sometimes the best way to find a godly friend is to be one.",
      memoryVerse: "Walk with the wise and become wise, for a companion of fools suffers harm.",
      memoryVerseRef: "Proverbs 13:20",
      thinkQuestions: [
        "Think about your closest friendships. Are they pulling you closer to God or further away? Be honest with yourself.",
        "Jesus was a friend of sinners but intentional about His inner circle. How can you love everyone while being wise about who influences you most?",
        "What does real accountability in a friendship look like? Have you experienced it? What would it take to build that kind of trust with someone?",
        "If you are experiencing loneliness, how does knowing that God designed you for community — and that He is with you — change how you approach the search for true friends?",
      ],
      prayerPrompt:
        "Father, thank You for the gift of friendship. Help me to be wise about the people I allow closest to my heart. Give me the courage to set boundaries where I need to and the grace to be a true friend to others. If I am lonely, remind me that You are near and lead me to people who will sharpen me and love me well. Amen.",
      activitySuggestion:
        "Make a list of the five people who most influence your life. Next to each name, write whether they generally pull you toward God or away from Him. Pray over the list and ask God for wisdom about how to invest in or adjust each relationship.",
      estimatedMinutes: 11,
    },
    {
      title: "Purpose and Calling: You Are Here for a Reason",
      scriptureRef: "Jeremiah 29:11; Romans 8:28; Esther 4:14",
      bookId: 24,
      chapter: 29,
      ageGroup: "young_disciples_plus",
      collectionId: faithIdentity.id,
      orderInCollection: 3,
      storyText:
        "One of the most common questions teenagers ask is, 'What am I supposed to do with my life?' It is a big question, and it can feel overwhelming when everyone around you seems to have it figured out — the friend who has known since age eight that she wants to be a doctor, the classmate who is already getting recruited for college sports, the kid posting music online who already has thousands of followers.\n\nBut here is something most adults will not tell you: almost nobody has it figured out at your age. And that is okay. Because God's plan for your life is not a single career choice or a destination — it is a relationship.\n\nJeremiah 29:11 is one of the most quoted verses in the Bible: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.' But most people rip this verse out of its context. God spoke these words to the Israelites while they were in exile in Babylon — displaced, confused, and wondering if God had abandoned them. God was not promising them an easy life. He was promising them that He had not forgotten them and that their story was not over.\n\nThe same is true for you. You might feel displaced right now — unsure of where you fit, uncertain about what comes next. But God has not forgotten you. He is weaving your story with a purpose you cannot fully see yet.\n\nRomans 8:28 adds another layer: 'We know that in all things God works for the good of those who love Him, who have been called according to His purpose.' Notice it says 'all things' — not just the good things. God uses your failures, your detours, your pain, and your waiting seasons as raw material for His purposes.\n\nConsider Joseph. Sold into slavery at seventeen. Falsely accused. Imprisoned for years. But God used every setback to position him exactly where he needed to be to save his family and an entire nation. Joseph could not see it in the pit. He could not see it in prison. But God could.\n\nConsider Esther. An orphan girl who became queen of Persia. She did not choose her circumstances, but when the moment came, Mordecai challenged her: 'Who knows whether you have come to the kingdom for such a time as this?' Esther stepped into her purpose not when everything was safe but when everything was on the line.\n\nYour purpose is not something you have to manufacture or figure out on your own. It unfolds as you walk with God. It reveals itself in the things that break your heart, the talents He has given you, the needs you see around you, and the doors He opens.\n\nHere is practical guidance: instead of asking 'What should I do with my life?' start asking 'What can I do today?' Serve someone. Use your gifts. Show up faithfully. Be excellent in the small things. Purpose is not always a grand revelation — it is often found in faithful obedience, one day at a time.\n\nDo not compare your chapter one to someone else's chapter twenty. God's timing is perfect, even when it feels painfully slow. Trust the Author of your story. He writes better endings than you could ever imagine.",
      memoryVerse: "'For I know the plans I have for you,' declares the Lord, 'plans to prosper you and not to harm you, plans to give you hope and a future.'",
      memoryVerseRef: "Jeremiah 29:11",
      thinkQuestions: [
        "How does knowing the original context of Jeremiah 29:11 — spoken to exiles — change how you understand God's promise for your life?",
        "Joseph and Esther both discovered their purpose through hardship, not comfort. How might your current struggles be part of God's preparation for something bigger?",
        "What gifts, passions, or burdens has God placed in your heart? How might those point toward your calling?",
        "Instead of worrying about the future, what is one thing you can do today to be faithful with what God has already given you?",
      ],
      prayerPrompt:
        "Lord, I confess that I sometimes worry about the future and feel lost about my purpose. Remind me that my calling is not a destination but a daily walk with You. Help me to be faithful in the small things and to trust that You are working all things together for good. Open my eyes to the opportunities around me and give me the courage to step into them. Amen.",
      activitySuggestion:
        "Create a 'Purpose Map.' In the center, write your name. Around it, write four things: (1) What am I good at? (2) What do I care deeply about? (3) What needs do I see around me? (4) What doors has God opened? Look for where these overlap — that is often where purpose lives. Pray over it daily for a week.",
      estimatedMinutes: 12,
    },
    {
      title: "Daniel: Uncompromising in a Hostile World",
      scriptureRef: "Daniel 1:1-21; Daniel 6:1-28",
      bookId: 27,
      chapter: 1,
      ageGroup: "young_disciples_plus",
      collectionId: heroesConviction.id,
      orderInCollection: 0,
      storyText:
        "Daniel was probably around your age — fifteen or sixteen — when his world was ripped apart. The Babylonian Empire invaded Jerusalem, destroyed the temple, and carried away the brightest young men of Judah to be reprogrammed. Daniel was one of them.\n\nThink about what that means. Everything Daniel knew — his home, his community, his way of life, his freedom — was taken from him overnight. He was dragged to a foreign land, given a new name (Belteshazzar, after a Babylonian god), enrolled in a pagan education program, and pressured to abandon everything he believed.\n\nThe Babylonians were not stupid. They knew that if they could reshape these young men's identities, they would have loyal servants for life. It is the same strategy the world uses today — reshape how you think, what you consume, and who you admire, and eventually you will forget who you really are.\n\nBut Daniel drew a line. The first test came with food. The king's table was loaded with rich food and wine — delicacies that would have violated Jewish dietary laws and were likely offered to idols. It seems like a small thing. Who would notice? Who would care? Daniel could have justified it: 'I am in a foreign land. The rules are different here. I need to survive.'\n\nBut Daniel 'resolved in his heart' not to defile himself. That phrase is everything. He made the decision before the pressure came. He did not wait until the food was in front of him to decide — he had already settled it. He proposed an alternative: let them eat vegetables and water for ten days and compare the results. God honored his faithfulness, and Daniel and his friends looked healthier than everyone else.\n\nThis pattern continued throughout Daniel's life. When commanded to stop praying, he opened his window and prayed three times a day, just as he had always done — knowing it would mean the lions' den. When asked to interpret dreams that no one else could, he gave all credit to God. When offered power and position, he remained humble.\n\nThe result? Daniel served with distinction under multiple kings and empires for over sixty years. Babylonian kings rose and fell. The Persian Empire conquered Babylon. Through it all, Daniel remained steady because his identity was not built on his circumstances — it was built on his God.\n\nHere is what Daniel's story teaches you: you do not have to compromise to succeed. The world says you need to go along to get along, that standing out will hold you back. But God honors those who honor Him. Daniel rose to the highest levels of government — not by playing the game but by being faithful.\n\nYou will face your own Babylon. It might be a school culture that mocks your faith. It might be a social environment where everyone is making choices you know are wrong. It might be the constant pressure to water down what you believe so people will accept you.\n\nResolve in your heart — before the pressure comes — who you will be. Decide now what you will not compromise on. Not with arrogance or self-righteousness, but with quiet, unshakeable conviction. Like Daniel, you can be excellent and faithful at the same time. You can serve with integrity in a hostile world. And God will be with you in every lions' den.",
      memoryVerse: "Daniel resolved not to defile himself.",
      memoryVerseRef: "Daniel 1:8",
      thinkQuestions: [
        "Daniel 'resolved in his heart' before the pressure came. What convictions do you need to settle in your heart now, before you face the test?",
        "How is the strategy of Babylon — renaming, re-educating, reshaping identity — similar to pressures you face today from culture, media, or peers?",
        "Daniel was faithful in small things (food choices) before he faced big things (the lions' den). How does faithfulness in small decisions prepare you for larger ones?",
        "Daniel served with excellence in a pagan empire without compromising his faith. How can you be excellent in your school, job, or community while staying true to your beliefs?",
      ],
      prayerPrompt:
        "God of Daniel, give me the same resolve that he had. Help me to settle my convictions before the pressure comes. When I am surrounded by a culture that wants to reshape me, anchor my identity in You alone. Give me the courage to stand and the wisdom to serve with excellence and integrity. Amen.",
      activitySuggestion:
        "Write a personal 'Daniel Resolution' — a list of three to five convictions you will not compromise on, no matter the cost. Examples: 'I will not tear others down to build myself up.' 'I will honor God with my body.' 'I will speak truth even when it is unpopular.' Sign it, date it, and keep it somewhere visible.",
      estimatedMinutes: 12,
    },
    {
      title: "Esther: Courage When Everything Is on the Line",
      scriptureRef: "Esther 4:1-17; Esther 7:1-10",
      bookId: 17,
      chapter: 4,
      ageGroup: "young_disciples_plus",
      collectionId: heroesConviction.id,
      orderInCollection: 1,
      storyText:
        "Esther's story reads like a movie. An orphan girl, raised by her cousin Mordecai, is chosen as queen of the Persian Empire — the most powerful nation on earth. She has beauty, position, and comfort. But she also has a secret: she is Jewish, and she has hidden it on Mordecai's advice.\n\nThen comes the crisis. Haman, the king's highest official, is consumed by hatred for the Jewish people — specifically because Mordecai refuses to bow to him. Haman manipulates King Xerxes into signing a decree authorizing the annihilation of every Jewish man, woman, and child in the empire. A date is set. The execution order is sent to every province. Genocide is coming.\n\nMordecai sends word to Esther: 'You must go to the king and beg for the lives of your people.' But there is a terrifying obstacle. In Persia, anyone who approaches the king uninvited — even the queen — could be executed on the spot unless the king extends his golden scepter. Esther has not been summoned in thirty days. She could die for simply walking into the throne room.\n\nEsther hesitates. And honestly, who can blame her? She is being asked to risk her life — the comfortable, safe, privileged life she has built — for people who do not even know she is one of them. She could stay silent. She could protect herself. Nobody would know.\n\nBut Mordecai's response is one of the most piercing statements in all of Scripture: 'Do not think that because you are in the king's house you alone of all the Jews will escape. For if you remain silent at this time, relief and deliverance for the Jews will arise from another place, but you and your father's family will perish. And who knows but that you have come to your royal position for such a time as this?'\n\nRead that again slowly. Mordecai is saying three things: (1) Your privilege will not protect you forever. (2) God will accomplish His purposes with or without you. (3) Maybe your entire life has been preparation for this exact moment.\n\nEsther's response transforms her from a passive queen into a hero of faith. She calls for a three-day fast among all the Jews and declares: 'I will go to the king, even though it is against the law. And if I perish, I perish.'\n\nThat last phrase — 'if I perish, I perish' — is the sound of someone surrendering their life to something bigger than themselves. Esther decided that the purpose God had for her was worth more than her safety.\n\nShe approached the king. He extended the scepter. Over two carefully planned banquets, Esther exposed Haman's plot. The king was furious. Haman was executed on the very gallows he had built for Mordecai. And the Jewish people were saved.\n\nHere is what Esther's story means for you: God has placed you where you are for a reason. Your school, your family, your city, your generation — none of it is random. There will come moments when staying silent is easier, when speaking up could cost you, when doing the right thing feels terrifying.\n\nIn those moments, remember Esther. She was afraid. She hesitated. She was not some fearless superhero. She was a young woman who decided that obedience to God mattered more than her comfort. And God used her courage to save an entire nation.\n\nYou may never face a life-or-death situation like Esther. But you will face moments that define your character — moments when you can either stay silent or speak up, hide or step forward, protect yourself or serve others. What will you choose?",
      memoryVerse: "And who knows but that you have come to your royal position for such a time as this?",
      memoryVerseRef: "Esther 4:14",
      thinkQuestions: [
        "Esther had privilege and comfort that made it tempting to stay silent. What privileges or comforts in your life might tempt you to avoid doing the right thing?",
        "Mordecai said God would accomplish His purposes with or without Esther. What does that tell you about God's sovereignty and your role in His plan?",
        "Esther's courage was not the absence of fear — she was terrified. How does knowing that even biblical heroes were afraid change how you think about your own fears?",
        "Is there a 'such a time as this' moment in your life right now — a situation where God might be calling you to speak up or take action?",
      ],
      prayerPrompt:
        "God, like Esther, I sometimes prefer comfort over courage. Forgive me for the times I have stayed silent when I should have spoken, or hidden when I should have stepped forward. Help me to see that You have placed me where I am for a purpose. Give me Esther's resolve — 'if I perish, I perish' — and use my life for Your glory. Amen.",
      activitySuggestion:
        "Think of one situation in your life where you have been staying silent when you should speak up — standing up for someone being bullied, sharing your faith with a friend, addressing an injustice, or having a hard conversation. Write out what you would say and practice it. Then ask God for the courage to follow through this week.",
      estimatedMinutes: 13,
    },
    {
      title: "David: The Heart God Sees",
      scriptureRef: "1 Samuel 16:1-13; 1 Samuel 17:32-50",
      bookId: 9,
      chapter: 16,
      ageGroup: "young_disciples_plus",
      collectionId: heroesConviction.id,
      orderInCollection: 2,
      storyText:
        "When God sent the prophet Samuel to anoint the next king of Israel, Samuel went to the house of Jesse in Bethlehem. Jesse had eight sons, and when the eldest, Eliab, walked in — tall, impressive, commanding — Samuel thought, 'Surely this is the one.' He looked like a king.\n\nBut God stopped him cold: 'Do not consider his appearance or his height, for I have rejected him. The Lord does not look at the things people look at. People look at the outward appearance, but the Lord looks at the heart.'\n\nOne by one, seven sons passed before Samuel. Seven rejections. Jesse did not even bother to bring his youngest son in from the fields. David was the runt — the afterthought, the kid nobody expected anything from. He was out tending sheep while his brothers were being considered for the throne.\n\nBut God chose David. The one nobody was looking at. The one his own family overlooked. The kid with the sheep and the sling and the songs.\n\nIf you have ever felt overlooked, underestimated, or dismissed — if you have ever felt like the last one picked, the one nobody expects much from — David's story is for you.\n\nGod does not evaluate you the way the world does. He does not care about your follower count, your athletic ranking, your GPA, or your social status. He looks at your heart. And a heart that is fully devoted to Him is more valuable than all the outward impressions in the world.\n\nBut David's story does not end at his anointing. Before he wore the crown, he faced the giant. Goliath was over nine feet tall, armed to the teeth, and had been terrorizing Israel's army for forty days. Every trained soldier — including David's own brothers — was paralyzed with fear.\n\nDavid was not even a soldier. He was a teenager who had come to bring his brothers lunch. But when he heard Goliath mocking God, something burned inside him. 'Who is this uncircumcised Philistine that he should defy the armies of the living God?'\n\nEveryone tried to talk him out of it. King Saul said he was too young. His brothers accused him of being arrogant. Saul offered him armor that did not fit. But David knew something they had forgotten: the battle belonged to the Lord.\n\n'You come against me with sword and spear and javelin,' David told Goliath, 'but I come against you in the name of the Lord Almighty.' One stone. One sling. One God. The giant fell.\n\nHere is the thing about David that made him extraordinary: it was not his skill with a sling. It was his heart. He wrote songs to God in the wilderness. He trusted God in obscurity before he ever stood on a battlefield. He developed his faith in the small, unseen moments — protecting sheep from lions and bears — long before the spotlight found him.\n\nYour 'shepherd field' season is not wasted time. The moments when nobody is watching — when you are faithful in obscurity, when you worship God with no audience, when you develop your character without recognition — those are the moments that forge the kind of heart God is looking for.\n\nDavid was not perfect. He made devastating mistakes later in life. But God still called him 'a man after my own heart' because David's fundamental posture was always turned toward God. When he failed, he repented. When he was afraid, he worshipped. When he was overlooked, he trusted.\n\nGod is not looking for perfect people. He is looking for people with hearts that are fully His. Be that person.",
      memoryVerse: "The Lord does not look at the things people look at. People look at the outward appearance, but the Lord looks at the heart.",
      memoryVerseRef: "1 Samuel 16:7",
      thinkQuestions: [
        "How does it feel to know that God evaluates your heart, not your outward appearance or achievements? Is that comforting or challenging — and why?",
        "David was overlooked by his own family. Have you ever felt dismissed or underestimated? How does David's story speak into that experience?",
        "David's faith was developed in obscurity — tending sheep, fighting lions and bears with no audience. What 'shepherd field' season are you in right now, and how can you use it to grow?",
        "What does it mean to be 'a person after God's own heart'? What specific changes would that require in your daily life?",
      ],
      prayerPrompt:
        "Lord, You see my heart when the world only sees the outside. Help me to care more about Your evaluation than anyone else's. Use my season of obscurity to shape me. Give me David's courage to face my giants and David's heart to worship You in every circumstance. Make me a person after Your own heart. Amen.",
      activitySuggestion:
        "Spend fifteen minutes in silence this week — no phone, no music, no distractions. Talk to God honestly about what is in your heart. Write down what He reveals. This practice of intentional quiet is how David developed his relationship with God while tending sheep. Make it a weekly habit.",
      estimatedMinutes: 13,
    },
    {
      title: "Joseph: Integrity Through Injustice",
      scriptureRef: "Genesis 37:1-36; Genesis 39:1-23; Genesis 50:15-21",
      bookId: 1,
      chapter: 37,
      ageGroup: "young_disciples_plus",
      collectionId: heroesConviction.id,
      orderInCollection: 3,
      storyText:
        "Joseph's story is the ultimate test case for whether you can trust God when life is brutally unfair.\n\nAt seventeen — your age — Joseph had dreams from God showing that he would one day be in a position of great authority. His brothers would bow before him. It was a legitimate vision from God. But Joseph's family did not celebrate it. His brothers already resented him because he was their father's favorite, and the dreams pushed them over the edge.\n\nThey grabbed him, threw him into an empty cistern, and sat down to eat lunch while he screamed for help. Then they sold him to slave traders for twenty pieces of silver. They took his prized robe, soaked it in goat's blood, and told their father he was dead. Joseph was seventeen years old.\n\nImagine being Joseph. Betrayed by your own brothers. Ripped from everything you know. Carried to a foreign land in chains. You had a dream from God — and now you are a slave. Where is God in this?\n\nBut here is what sets Joseph apart: even as a slave, he maintained his integrity. Potiphar, his Egyptian master, noticed that 'the Lord was with Joseph' and that everything Joseph touched prospered. Potiphar put him in charge of his entire household. Joseph could have been bitter, lazy, or rebellious. Instead, he was excellent.\n\nThen came another blow. Potiphar's wife tried to seduce him repeatedly. Joseph refused, saying, 'How could I do such a wicked thing and sin against God?' Notice — he did not say 'sin against Potiphar' or 'risk my position.' His moral compass pointed to God, not to consequences. When she falsely accused him, Joseph was thrown into prison. Again. Punished for doing the right thing.\n\nIn prison, Joseph could have given up. The dream from God must have seemed like a cruel joke. Betrayed by his brothers. Falsely accused by his master's wife. Forgotten in a dungeon. Years passed. But the Bible repeats its refrain: 'The Lord was with Joseph.'\n\nGod gave Joseph the ability to interpret dreams in prison, which eventually brought him before Pharaoh. Joseph interpreted Pharaoh's dreams — seven years of plenty followed by seven years of famine — and was elevated to second-in-command of all Egypt. From prisoner to prime minister in a single day.\n\nWhen famine hit, Joseph's brothers came to Egypt for food. They stood before him — exactly as the dream had shown — but did not recognize him. Joseph had the power to destroy them. He could have taken revenge for every year of suffering.\n\nInstead, he wept. He revealed himself and said some of the most profound words in Scripture: 'You intended to harm me, but God intended it for good, to accomplish what is now being done, the saving of many lives.'\n\nJoseph saw the bigger picture. Every injustice, every setback, every betrayal was a thread in a tapestry God was weaving. Joseph did not excuse what his brothers did — it was evil. But he recognized that God's sovereignty was greater than their sin.\n\nThis is the hardest truth in the Christian life: God does not promise to protect you from pain. He promises to use it. Romans 8:28 echoes Joseph's insight: 'In all things God works for the good of those who love Him.'\n\nYou will face injustice. People will hurt you, betray you, and treat you unfairly. You will have seasons when doing the right thing seems to make everything worse. In those moments, you have a choice: bitterness or trust. Revenge or forgiveness. Giving up or pressing on.\n\nJoseph chose trust. He chose integrity even when it cost him everything. He chose forgiveness even when revenge was within his grasp. And God used his faithfulness to save nations.\n\nYour pain is not pointless. Your waiting is not wasted. Your integrity matters, even when nobody sees it. Keep going. God is writing a story bigger than you can see.",
      memoryVerse: "You intended to harm me, but God intended it for good, to accomplish what is now being done, the saving of many lives.",
      memoryVerseRef: "Genesis 50:20",
      thinkQuestions: [
        "Joseph maintained integrity as a slave and as a prisoner — when there was no reward for it. What motivates you to do the right thing when nobody is watching and there is no immediate benefit?",
        "Joseph refused Potiphar's wife by framing it as sin against God, not just a bad decision. How does viewing temptation through the lens of your relationship with God change how you respond to it?",
        "Joseph chose forgiveness over revenge when he had absolute power over his brothers. Is there someone in your life you need to forgive? What is holding you back?",
        "Joseph's journey from pit to palace took over thirteen years. How does his story challenge your expectations about God's timing and the path to fulfilling His purposes for your life?",
      ],
      prayerPrompt:
        "God of Joseph, I trust You even when life is unfair. When I face betrayal, give me integrity. When I face temptation, give me resolve. When I face bitterness, give me the grace to forgive. Help me to believe that You are working in the unseen places of my life and that my pain is not pointless. I surrender my timeline to Yours. Amen.",
      activitySuggestion:
        "Write a letter to someone who has hurt you — you do not have to send it. Pour out your honest feelings, then write what you believe God might be doing through the situation. End with a prayer of release, choosing to trust God's purposes over your pain. Keep the letter as a milestone in your journey of forgiveness.",
      estimatedMinutes: 14,
    },
  ];

  const insertedStories = [];
  for (const story of storyData) {
    const [inserted] = await db.insert(kidsStories).values(story).returning();
    insertedStories.push(inserted);
  }
  console.log(`${insertedStories.length} stories created.`);

  const quizData: {
    storyIndex: number;
    questions: { question: string; options: string[]; correctIndex: number; explanation: string }[];
  }[] = [
    {
      storyIndex: 0,
      questions: [
        { question: "What did God make on the very first day?", options: ["Animals", "Light", "Water", "Trees"], correctIndex: 1, explanation: "God said 'Let there be light!' and light appeared. This was the very first thing God created." },
        { question: "What did God say about the light He made?", options: ["It was too bright", "It was good", "It was okay", "It needed to change"], correctIndex: 1, explanation: "God looked at the light and said 'This is good.' God loved what He had made." },
        { question: "What did God call the light and the darkness?", options: ["Sun and Moon", "Morning and Evening", "Day and Night", "Bright and Dark"], correctIndex: 2, explanation: "God called the light 'Day' and the darkness 'Night.'" },
      ],
    },
    {
      storyIndex: 1,
      questions: [
        { question: "Which animals did God make to live in the ocean?", options: ["Dogs and cats", "Fish and whales", "Birds and butterflies", "Lions and zebras"], correctIndex: 1, explanation: "God filled the oceans with fish, whales, dolphins, octopuses, and many other sea creatures." },
        { question: "What did God say when He looked at all the animals?", options: ["There are too many", "This is good", "I need more", "They are too noisy"], correctIndex: 1, explanation: "God looked at all the animals and said 'This is good!' He loved every one of them." },
        { question: "What kinds of animals did God create?", options: ["Only fish", "Only birds", "Only land animals", "Swimmers, flyers, and walkers"], correctIndex: 3, explanation: "God made all kinds — fish and sea creatures, birds, and land animals of every type." },
      ],
    },
    {
      storyIndex: 2,
      questions: [
        { question: "What does it mean that God made people in His image?", options: ["We look exactly like God", "We can think, love, and create like God", "We are as big as God", "We can fly like God"], correctIndex: 1, explanation: "Being made in God's image means we can think, feel, love, be kind, and talk to God." },
        { question: "What did God say about everything He made, especially people?", options: ["It was okay", "It was not finished", "It was very good", "It needed work"], correctIndex: 2, explanation: "When God made people, He did not just say it was good — He said it was VERY good!" },
        { question: "Why should we treat everyone with kindness?", options: ["Because the teacher said so", "Because every person is made by God", "Because we might get in trouble", "Because it is a rule"], correctIndex: 1, explanation: "Every person is special because they are made in God's image, so we treat everyone with love." },
      ],
    },
    {
      storyIndex: 3,
      questions: [
        { question: "What did God tell the land to do?", options: ["Stay empty", "Grow plants and trees", "Make rocks", "Be very flat"], correctIndex: 1, explanation: "God said 'Let the land grow plants and trees!' and beautiful plants grew everywhere." },
        { question: "Why did God make fruit trees?", options: ["To look pretty", "So people and animals would have food", "To block the wind", "To give shade only"], correctIndex: 1, explanation: "God made fruit trees so people and animals would have delicious food to eat." },
        { question: "Who designed every flower and leaf?", options: ["The wind", "Nobody", "God", "The sun"], correctIndex: 2, explanation: "God designed every single flower, painting every petal and shaping every leaf." },
      ],
    },
    {
      storyIndex: 4,
      questions: [
        { question: "On which day of creation did God make the sun, moon, and stars?", options: ["First day", "Third day", "Fourth day", "Sixth day"], correctIndex: 2, explanation: "On the fourth day of creation, God made the sun, the moon, and all the stars." },
        { question: "What does the Bible say God does with the stars?", options: ["He ignores them", "He counts them and calls them by name", "He forgets about them", "He hides them"], correctIndex: 1, explanation: "The Bible says God knows every single star by name and calls each one." },
        { question: "What is the moon like according to the story?", options: ["A big rock", "A nightlight in the sky", "A mirror", "A ball of fire"], correctIndex: 1, explanation: "The moon is like a nightlight in the sky, shining gently in the darkness." },
      ],
    },
    {
      storyIndex: 5,
      questions: [
        { question: "What did God ask Noah to build?", options: ["A house", "A castle", "An ark", "A bridge"], correctIndex: 2, explanation: "God told Noah to build a very big boat called an ark to keep his family and the animals safe." },
        { question: "What did God put in the sky as a promise?", options: ["A star", "A cloud", "A rainbow", "The moon"], correctIndex: 2, explanation: "God put a beautiful rainbow in the sky as a promise that He would never flood the whole earth again." },
        { question: "How many of each animal went onto the ark?", options: ["One", "Two", "Three", "Five"], correctIndex: 1, explanation: "God told Noah to bring two of every kind of animal onto the ark." },
      ],
    },
    {
      storyIndex: 6,
      questions: [
        { question: "What did David use to fight Goliath?", options: ["A sword and shield", "A sling and stones", "A bow and arrow", "His bare hands"], correctIndex: 1, explanation: "David picked up five smooth stones and used his sling to defeat the giant Goliath." },
        { question: "Why was David not afraid of Goliath?", options: ["David was bigger", "David had a strong army", "David knew God was with him", "David had fought giants before"], correctIndex: 2, explanation: "David was not afraid because he knew that God was bigger than any giant." },
        { question: "What did David say to Goliath?", options: ["I am stronger than you", "I come in the name of the Lord", "I will run away", "I give up"], correctIndex: 1, explanation: "David said 'You come with a sword and spear, but I come in the name of the Lord!'" },
      ],
    },
    {
      storyIndex: 7,
      questions: [
        { question: "How many times a day did Daniel pray?", options: ["Once", "Twice", "Three times", "Four times"], correctIndex: 2, explanation: "Three times every single day, Daniel would kneel down and pray to God." },
        { question: "What happened when Daniel was thrown into the lions' den?", options: ["The lions ate him", "Daniel ran away", "God sent an angel to shut the lions' mouths", "Daniel fought the lions"], correctIndex: 2, explanation: "God sent an angel to shut the lions' mouths so they did not hurt Daniel at all." },
        { question: "What did Daniel do when the new law said he could not pray?", options: ["He stopped praying", "He prayed secretly", "He prayed just like he always did", "He was too afraid to pray"], correctIndex: 2, explanation: "Daniel opened his window and prayed to God just like he always did. He never stopped." },
      ],
    },
    {
      storyIndex: 8,
      questions: [
        { question: "Where did Moses' mother put him?", options: ["In a cradle", "In a basket in the river", "In a tree", "Under a blanket"], correctIndex: 1, explanation: "His mommy made a basket-boat and placed baby Moses in the tall grass by the river." },
        { question: "Who watched over baby Moses from the bushes?", options: ["His father", "A soldier", "His big sister Miriam", "An angel"], correctIndex: 2, explanation: "Miriam was very brave and hid in the bushes to watch over her baby brother." },
        { question: "Who found baby Moses in the basket?", options: ["A fisherman", "The princess of Egypt", "A shepherd", "Moses' grandmother"], correctIndex: 1, explanation: "Pharaoh's daughter, the princess of Egypt, found the baby in the basket by the river." },
      ],
    },
    {
      storyIndex: 9,
      questions: [
        { question: "What was Haman's terrible plan?", options: ["To steal the king's crown", "To hurt all the Jewish people", "To run away from the kingdom", "To build a new palace"], correctIndex: 1, explanation: "Haman wanted to hurt all of the Jewish people in the whole kingdom." },
        { question: "What did Mordecai tell Esther?", options: ["Run away quickly", "Maybe God made you queen for such a time as this", "Do not worry about it", "Ask Haman to be nice"], correctIndex: 1, explanation: "Mordecai said 'Maybe God made you queen for this very reason — for such a time as this.'" },
        { question: "What happened when Esther went to the king?", options: ["The king was angry", "The king held out his golden scepter", "The king ignored her", "The king sent her away"], correctIndex: 1, explanation: "When the king saw Esther, he smiled and held out his golden scepter, which meant she was welcome." },
      ],
    },
    {
      storyIndex: 10,
      questions: [
        { question: "How did God create the world?", options: ["With His hands only", "By speaking things into existence", "With tools", "With the help of angels"], correctIndex: 1, explanation: "God spoke and things came into being — 'Let there be light' and light appeared." },
        { question: "What did God do on the seventh day?", options: ["Made more animals", "Rested", "Started over", "Made another world"], correctIndex: 1, explanation: "On the seventh day, God rested — not because He was tired, but to establish a pattern of rest." },
        { question: "What did God declare about everything He had made?", options: ["It was fine", "It was very good", "It needed improvement", "It was almost done"], correctIndex: 1, explanation: "When God surveyed everything, He declared it 'very good' — especially humanity." },
      ],
    },
    {
      storyIndex: 11,
      questions: [
        { question: "How did the serpent tempt Eve?", options: ["By offering her gold", "By making God's words seem restrictive", "By scaring her", "By giving her a gift"], correctIndex: 1, explanation: "The serpent twisted God's words and made it sound like God was holding something back from them." },
        { question: "What happened immediately after Adam and Eve ate the fruit?", options: ["Nothing changed", "They felt shame and tried to hide", "They became wiser", "They became powerful"], correctIndex: 1, explanation: "They felt shame for the first time, tried to cover themselves, and hid from God." },
        { question: "Even in judgment, how did God show mercy?", options: ["He pretended nothing happened", "He made clothes for them and promised a future rescuer", "He let them stay in the garden", "He took away the serpent"], correctIndex: 1, explanation: "God made clothes from animal skins and promised that an offspring of the woman would crush the serpent." },
      ],
    },
    {
      storyIndex: 12,
      questions: [
        { question: "Why did God choose to save Noah?", options: ["Noah was perfect", "Noah was the strongest man", "Noah walked faithfully with God", "Noah was the oldest man"], correctIndex: 2, explanation: "Noah was described as righteous and blameless, a man who walked faithfully with God." },
        { question: "How long did it rain during the flood?", options: ["Seven days", "Forty days and nights", "One hundred days", "One year"], correctIndex: 1, explanation: "For forty days and forty nights, water poured from the sky and burst from underground springs." },
        { question: "What was the sign of God's covenant with Noah?", options: ["A dove", "A rainbow", "An olive branch", "A mountain"], correctIndex: 1, explanation: "The rainbow became the sign of God's covenant — His promise to never again flood the entire earth." },
      ],
    },
    {
      storyIndex: 13,
      questions: [
        { question: "What did God ask Abraham to do with Isaac?", options: ["Send him to school", "Take him on a journey and sacrifice him", "Give him to another family", "Build him a house"], correctIndex: 1, explanation: "God tested Abraham by asking him to sacrifice his son Isaac on Mount Moriah." },
        { question: "What did Abraham tell Isaac when asked about the lamb?", options: ["There is no lamb", "We forgot the lamb", "God Himself will provide the lamb", "We will find one later"], correctIndex: 2, explanation: "Abraham's prophetic answer was 'God Himself will provide the lamb, my son.'" },
        { question: "What did God provide as a substitute sacrifice?", options: ["A dove", "A lamb", "A ram caught in a thicket", "Nothing"], correctIndex: 2, explanation: "Abraham looked up and saw a ram caught in a thicket by its horns — God had provided the sacrifice." },
      ],
    },
    {
      storyIndex: 14,
      questions: [
        { question: "What did Joseph's brothers do to him?", options: ["Gave him gifts", "Threw him in a pit and sold him", "Sent him to school", "Made him king"], correctIndex: 1, explanation: "Joseph's jealous brothers threw him into a pit and then sold him to traders heading to Egypt." },
        { question: "What ability did God give Joseph that eventually brought him to Pharaoh?", options: ["Fighting skill", "The ability to interpret dreams", "Great strength", "Political wisdom"], correctIndex: 1, explanation: "God gave Joseph the ability to interpret dreams, which eventually led Pharaoh to summon him." },
        { question: "What did Joseph say to his brothers about what they had done?", options: ["I will never forgive you", "You intended harm but God intended it for good", "Leave and never come back", "You owe me everything"], correctIndex: 1, explanation: "Joseph forgave them saying 'You intended to harm me, but God intended it for good.'" },
      ],
    },
    {
      storyIndex: 15,
      questions: [
        { question: "Where was Jesus born?", options: ["In a palace", "In a temple", "In a manger in Bethlehem", "In Nazareth"], correctIndex: 2, explanation: "Jesus was born in Bethlehem and laid in a manger — a feeding trough for animals." },
        { question: "Who were the first people to hear about Jesus' birth?", options: ["Kings and priests", "Scholars and Pharisees", "Shepherds in the fields", "Roman soldiers"], correctIndex: 2, explanation: "God announced the birth of His Son first to shepherds — among the lowest in society." },
        { question: "What did the angels say to the shepherds?", options: ["Run away quickly", "Do not be afraid — a Savior has been born", "Go back to sleep", "Wait until morning"], correctIndex: 1, explanation: "The angel said 'Do not be afraid. I bring you good news — a Savior has been born to you.'" },
      ],
    },
    {
      storyIndex: 16,
      questions: [
        { question: "What were the first disciples' occupation?", options: ["Carpenters", "Teachers", "Fishermen", "Priests"], correctIndex: 2, explanation: "Peter, Andrew, James, and John were all fishermen working on the Sea of Galilee." },
        { question: "What happened when Peter obeyed Jesus and cast his nets?", options: ["He caught nothing", "The nets caught so many fish they began to break", "A storm came", "The boat sank"], correctIndex: 1, explanation: "The nets caught so many fish they began to break, and both boats nearly sank under the weight." },
        { question: "What did Jesus promise to make His followers?", options: ["Rich men", "Kings", "Fishers of people", "Priests"], correctIndex: 2, explanation: "Jesus said 'Follow me, and I will send you out to fish for people.'" },
      ],
    },
    {
      storyIndex: 17,
      questions: [
        { question: "Who stopped to help the wounded man?", options: ["The priest", "The Levite", "The Samaritan", "A Roman soldier"], correctIndex: 2, explanation: "The Samaritan stopped, felt compassion, bandaged the man's wounds, and took care of him." },
        { question: "Why was it surprising that the Samaritan helped?", options: ["Samaritans were poor", "Jews and Samaritans had centuries of hatred between them", "Samaritans could not travel that road", "Samaritans did not know medicine"], correctIndex: 1, explanation: "Jews and Samaritans had centuries of hostility — a Jewish audience would never expect a Samaritan hero." },
        { question: "What did Jesus tell the expert of the law to do?", options: ["Study more", "Go and do likewise", "Build a hospital", "Ask more questions"], correctIndex: 1, explanation: "Jesus said 'Go and do likewise' — be a neighbor to everyone by showing mercy and compassion." },
      ],
    },
    {
      storyIndex: 18,
      questions: [
        { question: "What happened to the temple curtain when Jesus died?", options: ["It turned white", "It caught fire", "It tore in two from top to bottom", "Nothing happened"], correctIndex: 2, explanation: "The curtain tore from top to bottom, declaring that the barrier between God and humanity was removed." },
        { question: "What did Jesus say to the repentant criminal on the cross?", options: ["You are too late", "I cannot help you", "Today you will be with me in paradise", "Wait until tomorrow"], correctIndex: 2, explanation: "Jesus promised 'Truly I tell you, today you will be with me in paradise.'" },
        { question: "What did the Roman centurion say after witnessing Jesus' death?", options: ["He was just a man", "Surely this was a righteous man", "I do not understand", "It is finally over"], correctIndex: 1, explanation: "The centurion declared 'Surely this was a righteous man' after witnessing how Jesus died." },
      ],
    },
    {
      storyIndex: 19,
      questions: [
        { question: "Who was the first person to see the risen Jesus?", options: ["Peter", "John", "Mary Magdalene", "Thomas"], correctIndex: 2, explanation: "Mary Magdalene was the first person Jesus revealed Himself to after His resurrection." },
        { question: "What did the angels say to the women at the tomb?", options: ["Go home", "He is not here; He has risen", "Come back later", "Look elsewhere"], correctIndex: 1, explanation: "The angels said 'Why do you look for the living among the dead? He is not here; He has risen!'" },
        { question: "What did the women find when they arrived at the tomb?", options: ["Jesus inside", "Soldiers guarding it", "The stone rolled away and the tomb empty", "The tomb sealed shut"], correctIndex: 2, explanation: "The stone was already rolled away and the tomb was empty — Jesus had risen." },
      ],
    },
    {
      storyIndex: 20,
      questions: [
        { question: "What does the Greek word 'poiema' (used in Ephesians 2:10) mean?", options: ["Servant", "Soldier", "Handiwork or poem", "Student"], correctIndex: 2, explanation: "The word 'poiema' means handiwork or poem — you are God's creative masterpiece." },
        { question: "What did God tell Jeremiah when he said he was too young?", options: ["Wait until you are older", "I knew you before I formed you in the womb", "Find someone else to help you", "Study more first"], correctIndex: 1, explanation: "God told Jeremiah not to say he was too young because God had known him and set him apart before birth." },
        { question: "According to this study, where is your true identity found?", options: ["In your achievements", "In what others think of you", "In who God says you are", "In your social media presence"], correctIndex: 2, explanation: "Your identity is not found in what you do or what others think — it is found in who God says you are." },
      ],
    },
    {
      storyIndex: 21,
      questions: [
        { question: "What does the word 'conform' mean in Romans 12:2?", options: ["To stand out boldly", "To be molded by external pressure", "To rebel against everything", "To ignore everyone"], correctIndex: 1, explanation: "Conform means to be molded into a shape by external pressure — like Play-Doh squeezed into a mold." },
        { question: "According to Jesus, what happens to those persecuted for righteousness?", options: ["They will suffer forever", "They lose everything", "Theirs is the kingdom of heaven", "They should give up"], correctIndex: 2, explanation: "Jesus said 'Blessed are those who are persecuted because of righteousness, for theirs is the kingdom of heaven.'" },
        { question: "What does Romans 12:2 say should happen instead of conforming?", options: ["Fight back aggressively", "Be transformed by the renewing of your mind", "Isolate yourself completely", "Pretend to agree"], correctIndex: 1, explanation: "Instead of conforming, we should be transformed by the renewing of our minds — reshaped from the inside by God." },
      ],
    },
    {
      storyIndex: 22,
      questions: [
        { question: "What does Proverbs 13:20 say about walking with the wise?", options: ["It is boring", "You become wise", "It is unnecessary", "It slows you down"], correctIndex: 1, explanation: "Proverbs 13:20 says 'Walk with the wise and become wise, for a companion of fools suffers harm.'" },
        { question: "How did Jesus model friendship?", options: ["He only had one friend", "He was inclusive in love but intentional about His inner circle", "He avoided everyone", "He treated all people identically"], correctIndex: 1, explanation: "Jesus loved everyone but was intentional about His inner circle — the twelve disciples, and especially Peter, James, and John." },
        { question: "What does Hebrews 10:24 say friends should do for each other?", options: ["Compete with each other", "Spur one another on toward love and good deeds", "Avoid difficult conversations", "Always agree"], correctIndex: 1, explanation: "Hebrews 10:24 says to spur one another on toward love and good deeds — true friends push each other to grow." },
      ],
    },
    {
      storyIndex: 23,
      questions: [
        { question: "What was the original context of Jeremiah 29:11?", options: ["A graduation speech", "Spoken to Israelites in exile in Babylon", "A birthday blessing", "A prayer for wealth"], correctIndex: 1, explanation: "God spoke Jeremiah 29:11 to the Israelites while they were in exile — displaced and confused, not living comfortably." },
        { question: "What does Romans 8:28 say God works for good?", options: ["Only the good things", "Only spiritual things", "All things", "Only things we pray about"], correctIndex: 2, explanation: "Romans 8:28 says God works ALL things for good — not just the good things, but failures, detours, and painful seasons too." },
        { question: "What question does this study suggest instead of 'What should I do with my life?'", options: ["How can I get rich?", "What can I do today?", "When will things get easier?", "Who can help me succeed?"], correctIndex: 1, explanation: "Instead of asking about your whole life, start with 'What can I do today?' — purpose is found in daily faithful obedience." },
      ],
    },
    {
      storyIndex: 24,
      questions: [
        { question: "How old was Daniel approximately when he was taken to Babylon?", options: ["About 5 years old", "About 10 years old", "About 15-16 years old", "About 25 years old"], correctIndex: 2, explanation: "Daniel was probably around fifteen or sixteen when the Babylonians invaded Jerusalem and took him captive." },
        { question: "What does it mean that Daniel 'resolved in his heart'?", options: ["He made the decision after the pressure came", "He decided before the test came", "He asked others what to do", "He followed the crowd"], correctIndex: 1, explanation: "Daniel settled his convictions before the pressure came — he did not wait until the food was in front of him to decide." },
        { question: "How long did Daniel serve faithfully in foreign empires?", options: ["About 5 years", "About 20 years", "Over 60 years", "Only during his youth"], correctIndex: 2, explanation: "Daniel served with distinction under multiple kings and empires for over sixty years, remaining faithful throughout." },
      ],
    },
    {
      storyIndex: 25,
      questions: [
        { question: "What was the risk Esther faced by approaching the king uninvited?", options: ["She could be banished", "She could be executed", "She would lose her crown", "Nothing would happen"], correctIndex: 1, explanation: "In Persia, anyone who approached the king uninvited could be executed unless the king extended his golden scepter." },
        { question: "What did Esther say before going to the king?", options: ["I will be fine", "God told me everything will work out", "If I perish, I perish", "Someone else should go"], correctIndex: 2, explanation: "Esther declared 'If I perish, I perish' — surrendering her life to God's purposes regardless of the outcome." },
        { question: "What three things was Mordecai communicating to Esther?", options: ["Be patient, pray, and wait", "Privilege will not protect you, God will work with or without you, and this may be your moment", "Run away, hide, and hope", "Fight, resist, and rebel"], correctIndex: 1, explanation: "Mordecai told Esther that privilege would not save her, God's purposes would happen regardless, and she may have been placed as queen for this exact moment." },
      ],
    },
    {
      storyIndex: 26,
      questions: [
        { question: "What did God tell Samuel about choosing a king?", options: ["Choose the tallest one", "Choose the strongest one", "The Lord looks at the heart, not the outward appearance", "Choose the oldest son"], correctIndex: 2, explanation: "God told Samuel 'People look at the outward appearance, but the Lord looks at the heart.'" },
        { question: "Where was David when Samuel came to anoint the next king?", options: ["At the temple", "In the throne room", "Tending sheep in the fields", "At school"], correctIndex: 2, explanation: "David was out tending sheep — his father did not even bother to bring him in. He was the overlooked afterthought." },
        { question: "What did David develop during his time as a shepherd?", options: ["Political connections", "Military strategy", "His faith and relationship with God", "Wealth and influence"], correctIndex: 2, explanation: "David developed his faith in the small, unseen moments — writing songs to God, trusting Him while protecting sheep from lions and bears." },
      ],
    },
    {
      storyIndex: 27,
      questions: [
        { question: "How old was Joseph when his brothers betrayed him?", options: ["About 12", "About 17", "About 21", "About 30"], correctIndex: 1, explanation: "Joseph was seventeen years old when his brothers threw him into a pit and sold him into slavery." },
        { question: "Why did Joseph refuse Potiphar's wife?", options: ["He was afraid of Potiphar", "He framed it as sin against God", "He did not find her attractive", "He was too busy"], correctIndex: 1, explanation: "Joseph said 'How could I do such a wicked thing and sin against God?' — his moral compass pointed to God, not consequences." },
        { question: "What did Joseph say to his brothers about their betrayal?", options: ["I will never forgive you", "You intended harm but God intended it for good", "You owe me a debt", "I want revenge"], correctIndex: 1, explanation: "Joseph said 'You intended to harm me, but God intended it for good, to accomplish the saving of many lives.'" },
      ],
    },
  ];

  let quizCount = 0;
  for (const quiz of quizData) {
    const story = insertedStories[quiz.storyIndex];
    for (const q of quiz.questions) {
      await db.insert(kidsQuizQuestions).values({
        storyId: story.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      });
      quizCount++;
    }
  }
  console.log(`${quizCount} quiz questions created.`);

  const badgeData = [
    {
      name: "First Steps",
      description: "Complete your very first Bible story!",
      icon: "footprints",
      requirement: "complete_story",
      requiredCount: 1,
    },
    {
      name: "Memory Master",
      description: "Memorize 5 Bible memory verses!",
      icon: "brain",
      requirement: "memorize_verse",
      requiredCount: 5,
    },
    {
      name: "Explorer",
      description: "Complete all stories in one collection!",
      icon: "compass",
      requirement: "complete_collection",
      requiredCount: 1,
    },
    {
      name: "Faithful Reader",
      description: "Read a story every day for 7 days in a row!",
      icon: "flame",
      requirement: "streak_days",
      requiredCount: 7,
    },
    {
      name: "Quiz Champion",
      description: "Get a perfect score on 5 different quizzes!",
      icon: "trophy",
      requirement: "perfect_quiz",
      requiredCount: 5,
    },
  ];

  await db.insert(kidsBadges).values(badgeData);
  console.log(`${badgeData.length} badges created.`);

  console.log("Kids Club seed complete!");
  console.log(`  Collections: 6`);
  console.log(`  Stories: ${insertedStories.length}`);
  console.log(`  Quiz Questions: ${quizCount}`);
  console.log(`  Badges: ${badgeData.length}`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
