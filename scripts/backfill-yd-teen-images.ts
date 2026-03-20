import { db } from "../server/db";
import { kidsStories, kidsStoryScenes } from "../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

type SceneData = {
  sceneIndex: number;
  narration: string;
  illustrationPrompt: string;
  imageUrl: string;
  mood: string;
};

const YD_CREATION_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "In the beginning, before time existed and before anything was made, there was God. All around was a vast emptiness — no light, no earth, no stars. Just darkness over the deep waters. But God was there, and He was about to do something incredible.", illustrationPrompt: "Creation of the universe, swirling galaxies, stars forming", imageUrl: "/assets/kids-scenes/yd-creation-scene-0.png", mood: "AWE" },
  { sceneIndex: 1, narration: "As the days unfolded, God continued His work of creation with eloquence and purpose. He separated the waters above from the waters below, creating the sky. Then He gathered the waters to reveal dry land, and commanded the earth to sprout vegetation — grass, plants bearing seeds, and trees bearing fruit.", illustrationPrompt: "Land forming from sea, vegetation growing", imageUrl: "/assets/kids-scenes/yd-creation-scene-1.png", mood: "JOY" },
  { sceneIndex: 2, narration: "Then God turned His attention to the heavens, saying, 'Let there be lights in the sky!' He created the sun to rule the day and the moon to govern the night. He scattered billions of stars across the heavens like diamonds on black velvet.", illustrationPrompt: "Sun, moon, and stars placed in the sky", imageUrl: "/assets/kids-scenes/yd-creation-scene-2.png", mood: "JOY" },
  { sceneIndex: 3, narration: "As creativity unfolded, God molded unique animals for each habitat: from the towering elephants in the savannas to the colorful fish in coral reefs. Birds of every kind filled the air with song, and creatures great and small roamed the earth.", illustrationPrompt: "Diverse animals being created", imageUrl: "/assets/kids-scenes/yd-creation-scene-3.png", mood: "AWE" },
  { sceneIndex: 4, narration: "As a final masterpiece, God said, 'Let us make mankind in our image!' From the dust of the earth, He formed the first man and breathed life into his nostrils. God created man and woman to reflect His own nature — to love, to create, to have fellowship with Him.", illustrationPrompt: "God forming Adam from the earth", imageUrl: "/assets/kids-scenes/yd-creation-scene-4.png", mood: "PEACE" },
  { sceneIndex: 5, narration: "After creation was complete, God surveyed His work and declared, 'It is very good!' On the seventh day, God rested — not because He was tired, but to set an example and establish the Sabbath as a gift to humanity.", illustrationPrompt: "God resting, completed creation panorama", imageUrl: "/assets/kids-scenes/yd-creation-scene-5.png", mood: "PEACE" },
];

const YD_FALL_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "God placed Adam and Eve in the Garden of Eden — a paradise of beauty, abundance, and perfect fellowship with their Creator. They had everything they could ever need, and they walked with God in the cool of the day. There was only one rule: do not eat from the Tree of Knowledge of Good and Evil.", illustrationPrompt: "Garden of Eden paradise with the tree", imageUrl: "/assets/kids-scenes/yd-fall-scene-0.png", mood: "PEACE" },
  { sceneIndex: 1, narration: "But a cunning serpent entered the garden. It twisted God's words, telling Eve, 'Did God really say you must not eat from any tree?' The serpent made the forbidden fruit look desirable and cast doubt on God's goodness. Eve believed the lie, ate the fruit, and gave some to Adam.", illustrationPrompt: "Serpent and forbidden fruit", imageUrl: "/assets/kids-scenes/yd-fall-scene-1.png", mood: "TENSION" },
  { sceneIndex: 2, narration: "Immediately, everything changed. Adam and Eve felt shame for the first time. They tried to cover themselves with fig leaves and hid among the trees when they heard God walking in the garden. Sin had broken the perfect relationship between humanity and their Creator.", illustrationPrompt: "Adam and Eve hiding in shame", imageUrl: "/assets/kids-scenes/yd-fall-scene-2.png", mood: "TENSION" },
  { sceneIndex: 3, narration: "God found them, and the consequences came. The serpent was cursed. Pain and struggle entered the world. Adam and Eve were sent out of the garden, and an angel with a flaming sword guarded the entrance. Paradise was lost because of disobedience.", illustrationPrompt: "Expelled from Garden, angel with sword", imageUrl: "/assets/kids-scenes/yd-fall-scene-3.png", mood: "AWE" },
  { sceneIndex: 4, narration: "But even in the middle of judgment, God gave a promise. He said that one day, a descendant of the woman would crush the serpent's head. This was the first hint of a Savior — the promise that God would not leave humanity in their brokenness. Where sin entered, grace would follow.", illustrationPrompt: "Hope amid consequences, promise of Savior", imageUrl: "/assets/kids-scenes/yd-fall-scene-4.png", mood: "PEACE" },
];

const YD_NOAH_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "As generations passed after the Fall, humanity grew more and more wicked. Violence filled the earth, and people's thoughts were constantly evil. God was grieved in His heart. But in the middle of all this darkness, one man stood out: Noah. He was righteous and walked faithfully with God.", illustrationPrompt: "Noah righteous amid chaos", imageUrl: "/assets/kids-scenes/yd-noah-scene-0.png", mood: "PEACE" },
  { sceneIndex: 1, narration: "God told Noah He was going to send a great flood to cleanse the earth, and He instructed Noah to build an enormous ark — a boat big enough to hold his family and two of every kind of animal. It took decades, and people mocked Noah. But Noah obeyed God completely.", illustrationPrompt: "Noah building the ark", imageUrl: "/assets/kids-scenes/yd-noah-scene-1.png", mood: "AWE" },
  { sceneIndex: 2, narration: "When the ark was finished, God brought the animals to Noah — two of every kind, walking, flying, and crawling. Lions and lambs, eagles and sparrows, elephants and mice. They entered the ark in an orderly procession, and then God Himself shut the door.", illustrationPrompt: "Animals entering the ark two by two", imageUrl: "/assets/kids-scenes/yd-noah-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "Then the rains came — torrential, unrelenting rain for forty days and forty nights. The fountains of the deep burst open. Water covered everything, even the highest mountains. But the ark floated safely on the floodwaters. God protected Noah and every creature inside.", illustrationPrompt: "Ark floating on flood waters", imageUrl: "/assets/kids-scenes/yd-noah-scene-3.png", mood: "TENSION" },
  { sceneIndex: 4, narration: "After many months, Noah sent out a dove. It returned with an olive branch — the first sign that the waters were receding and new life was beginning. Hope returned to Noah's family as they waited for God's timing to leave the ark.", illustrationPrompt: "Dove returning with olive branch", imageUrl: "/assets/kids-scenes/yd-noah-scene-4.png", mood: "JOY" },
  { sceneIndex: 5, narration: "When the earth was dry, Noah's family stepped out of the ark into a fresh, clean world. God placed a magnificent rainbow in the sky as a promise: He would never again destroy the earth with a flood. It was a covenant of grace — a new beginning.", illustrationPrompt: "Rainbow covenant over new world", imageUrl: "/assets/kids-scenes/yd-noah-scene-5.png", mood: "JOY" },
];

const YD_ABRAHAM_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "God had promised Abraham a son, and after decades of waiting, that promise was finally fulfilled in Isaac. Abraham loved Isaac deeply — this was the child of the promise, the one through whom God said He would build a great nation. Isaac was everything to Abraham.", illustrationPrompt: "Abraham holding baby Isaac under stars", imageUrl: "/assets/kids-scenes/yd-abraham-scene-0.png", mood: "JOY" },
  { sceneIndex: 1, narration: "Then God tested Abraham in the most difficult way imaginable. 'Take your son, your only son Isaac, whom you love, and offer him as a sacrifice on a mountain I will show you.' Abraham's heart must have broken — but he trusted God and obeyed, rising early the next morning.", illustrationPrompt: "Abraham walking up mountain with Isaac", imageUrl: "/assets/kids-scenes/yd-abraham-scene-1.png", mood: "TENSION" },
  { sceneIndex: 2, narration: "At the last possible moment, as Abraham raised his hand, an angel of the Lord called out: 'Abraham! Do not lay a hand on the boy! Now I know that you fear God, because you have not withheld your son, your only son, from me.' Abraham's faith had been proven true.", illustrationPrompt: "Angel stops Abraham, divine light", imageUrl: "/assets/kids-scenes/yd-abraham-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "Abraham looked up and saw a ram caught in a thicket by its horns. God had provided a substitute sacrifice. Abraham named that place 'The Lord Will Provide.' This moment foreshadowed the ultimate sacrifice God Himself would make centuries later.", illustrationPrompt: "Ram caught in thicket, divine light", imageUrl: "/assets/kids-scenes/yd-abraham-scene-3.png", mood: "PEACE" },
  { sceneIndex: 4, narration: "God reaffirmed His promise to Abraham: his descendants would be as numerous as the stars in the sky and the sand on the seashore. Through Abraham's obedience, all nations on earth would be blessed. Abraham's faith teaches us that trusting God, even when it's hard, always leads to His provision.", illustrationPrompt: "Abraham and Isaac embracing under stars", imageUrl: "/assets/kids-scenes/yd-abraham-scene-4.png", mood: "JOY" },
];

const YD_JOSEPH_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "Joseph was the eleventh son of Jacob, but he was his father's favorite. Jacob gave Joseph a special colorful robe, which made his older brothers furiously jealous. Joseph also had dreams that suggested his family would one day bow down to him, which only made things worse.", illustrationPrompt: "Joseph in colorful coat, jealous brothers", imageUrl: "/assets/kids-scenes/yd-joseph-scene-0.png", mood: "TENSION" },
  { sceneIndex: 1, narration: "One day, when Joseph went to check on his brothers in the fields, they seized him, stripped off his beautiful robe, and threw him into a deep pit. Then they sold him to traders heading to Egypt. They dipped his robe in goat's blood and told their father Joseph was dead.", illustrationPrompt: "Joseph thrown in pit, sold to traders", imageUrl: "/assets/kids-scenes/yd-joseph-scene-1.png", mood: "TENSION" },
  { sceneIndex: 2, narration: "In Egypt, Joseph served faithfully but was falsely accused and thrown in prison. Even there, God was with him. Joseph interpreted dreams for fellow prisoners, and eventually Pharaoh himself heard about Joseph's gift. Pharaoh sent for him to interpret a troubling dream about seven fat cows and seven thin cows.", illustrationPrompt: "Joseph before Pharaoh interpreting dreams", imageUrl: "/assets/kids-scenes/yd-joseph-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "Joseph told Pharaoh that seven years of plenty would be followed by seven years of terrible famine. Pharaoh was so impressed that he made Joseph second-in-command of all Egypt! Joseph went from the pit to the palace — from a slave to a ruler — because God was with him through it all.", illustrationPrompt: "Joseph as ruler overseeing Egypt", imageUrl: "/assets/kids-scenes/yd-joseph-scene-3.png", mood: "JOY" },
  { sceneIndex: 4, narration: "When famine struck, Joseph's brothers came to Egypt for food — and bowed before Joseph without recognizing him. Joseph tested them, then revealed himself. 'I am Joseph, your brother!' he said through tears. 'Don't be afraid. You meant it for evil, but God meant it for good.'", illustrationPrompt: "Joseph reveals identity, emotional reunion", imageUrl: "/assets/kids-scenes/yd-joseph-scene-4.png", mood: "JOY" },
  { sceneIndex: 5, narration: "Joseph brought his entire family to Egypt, including his beloved father Jacob. They embraced, weeping with joy. What started as a terrible betrayal became God's plan to save an entire nation. Joseph's story teaches us that God can take even the worst situations and turn them into something beautiful.", illustrationPrompt: "Joseph and Jacob reunited, family together", imageUrl: "/assets/kids-scenes/yd-joseph-scene-5.png", mood: "LOVE" },
];

const YD_BIRTH_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "For centuries, the people of Israel had been waiting for the Messiah. Then, in the most unexpected way, God broke into history. An angel appeared to a young woman named Mary in the small town of Nazareth. 'Do not be afraid,' the angel said. 'You will give birth to a son, and you are to call him Jesus.'", illustrationPrompt: "Angel Gabriel appears to Mary", imageUrl: "/assets/kids-scenes/yd-birth-scene-0.png", mood: "AWE" },
  { sceneIndex: 1, narration: "The Roman Emperor ordered a census, so Mary and Joseph had to travel to Bethlehem — the city of David. Mary was expecting her baby any day. The journey was long and difficult, but they trusted in God's plan, even when they couldn't understand it.", illustrationPrompt: "Mary and Joseph traveling to Bethlehem", imageUrl: "/assets/kids-scenes/yd-birth-scene-1.png", mood: "PEACE" },
  { sceneIndex: 2, narration: "When they arrived in Bethlehem, there was no room anywhere. So the King of Kings was born in a humble stable, laid in a feeding trough, and wrapped in simple cloths. The Creator of the universe entered His own creation as a tiny, helpless baby.", illustrationPrompt: "Baby Jesus in manger, Mary and Joseph", imageUrl: "/assets/kids-scenes/yd-birth-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "That night, angels appeared to shepherds watching their flocks in nearby fields. The sky exploded with glory! 'Do not be afraid,' the angel said. 'I bring you good news of great joy! Today in the town of David a Savior has been born — He is Christ the Lord!'", illustrationPrompt: "Angels appearing to shepherds at night", imageUrl: "/assets/kids-scenes/yd-birth-scene-3.png", mood: "JOY" },
  { sceneIndex: 4, narration: "The shepherds hurried to Bethlehem and found everything just as the angel had said. They knelt before the baby Jesus in wonder. These simple, ordinary people were the first to worship the Savior of the world.", illustrationPrompt: "Shepherds worshiping baby Jesus", imageUrl: "/assets/kids-scenes/yd-birth-scene-4.png", mood: "PEACE" },
  { sceneIndex: 5, narration: "A brilliant star shone over Bethlehem that night — a sign that something had changed forever. God had entered the world. The long-awaited promise had been fulfilled. Emmanuel — God with us — had come.", illustrationPrompt: "Star of Bethlehem shining over the town", imageUrl: "/assets/kids-scenes/yd-birth-scene-5.png", mood: "AWE" },
];

const YD_DISCIPLES_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "After His baptism and forty days of testing in the wilderness, Jesus began His public ministry in Galilee. His message was urgent: 'The time has come. The kingdom of God has come near. Repent and believe the good news!' But Jesus did not set out alone.", illustrationPrompt: "Jesus walking by Sea of Galilee", imageUrl: "/assets/kids-scenes/yd-disciples-scene-0.png", mood: "PEACE" },
  { sceneIndex: 1, narration: "Walking by the Sea of Galilee, Jesus saw Simon Peter and Andrew casting their nets. 'Come, follow me,' Jesus said, 'and I will send you out to fish for people.' Immediately, they dropped their nets and followed Him. It was a call that would change their lives forever.", illustrationPrompt: "Jesus calling fishermen, miraculous catch", imageUrl: "/assets/kids-scenes/yd-disciples-scene-1.png", mood: "AWE" },
  { sceneIndex: 2, narration: "Jesus also called Matthew, a tax collector — someone most people despised. But Jesus saw past what others saw. 'Follow me,' He said simply. Matthew left everything behind. Jesus chose people not because they were perfect, but because He saw their potential.", illustrationPrompt: "Jesus calling Matthew at tax booth", imageUrl: "/assets/kids-scenes/yd-disciples-scene-2.png", mood: "JOY" },
  { sceneIndex: 3, narration: "One by one, Jesus gathered twelve ordinary men: fishermen, a tax collector, a zealot, and others from all walks of life. They traveled together, ate together, learned together. Jesus was building a team that would change the world.", illustrationPrompt: "Jesus walking with twelve disciples", imageUrl: "/assets/kids-scenes/yd-disciples-scene-3.png", mood: "JOY" },
  { sceneIndex: 4, narration: "Jesus taught His disciples on hillsides and in homes. He showed them how to love, how to serve, and how to trust God completely. These ordinary people would become the foundation of the church — not because of their abilities, but because of the one who called them.", illustrationPrompt: "Jesus teaching disciples on hillside", imageUrl: "/assets/kids-scenes/yd-disciples-scene-4.png", mood: "PEACE" },
];

const YD_SAMARITAN_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "A religious expert approached Jesus with a question designed to test Him: 'What must I do to inherit eternal life?' When Jesus asked what the Law said, the man answered correctly: 'Love God with all your heart, and love your neighbor as yourself.' But then he asked, 'And who is my neighbor?'", illustrationPrompt: "Man beaten and wounded on road", imageUrl: "/assets/kids-scenes/yd-samaritan-scene-0.png", mood: "TENSION" },
  { sceneIndex: 1, narration: "Jesus told a story: A man was traveling from Jerusalem to Jericho when robbers attacked him, beat him, and left him half dead on the road. A priest came along and saw the man — but walked past on the other side. A Levite did the same. The people who should have helped did nothing.", illustrationPrompt: "Good Samaritan helping wounded man", imageUrl: "/assets/kids-scenes/yd-samaritan-scene-1.png", mood: "PEACE" },
  { sceneIndex: 2, narration: "Then a Samaritan came along — someone the Jews considered an outsider and an enemy. But when he saw the wounded man, he was filled with compassion. He bandaged his wounds, put him on his own donkey, and took him to an inn where he paid for his care.", illustrationPrompt: "Samaritan carrying man to inn", imageUrl: "/assets/kids-scenes/yd-samaritan-scene-2.png", mood: "JOY" },
  { sceneIndex: 3, narration: "Jesus looked at the religious expert and asked, 'Which of these three was a neighbor to the man who was attacked?' The answer was obvious: 'The one who showed mercy.' Jesus said, 'Go and do likewise.' Love is not about labels — it's about action.", illustrationPrompt: "Jesus teaching the parable", imageUrl: "/assets/kids-scenes/yd-samaritan-scene-3.png", mood: "PEACE" },
  { sceneIndex: 4, narration: "The Parable of the Good Samaritan challenges us today: Will we walk past someone who needs help, or will we stop? Being a neighbor means showing mercy to anyone in need — regardless of who they are. That is what it means to truly love.", illustrationPrompt: "Modern kids helping each other", imageUrl: "/assets/kids-scenes/yd-samaritan-scene-4.png", mood: "LOVE" },
];

const YD_CROSS_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "After three years of teaching and healing, Jesus arrived in Jerusalem for the final time. He knew what was coming. He had told His disciples: the Son of Man must suffer, be rejected, be killed, and after three days rise again. But they did not understand.", illustrationPrompt: "Three crosses on hill, dramatic sky", imageUrl: "/assets/kids-scenes/yd-cross-scene-0.png", mood: "TENSION" },
  { sceneIndex: 1, narration: "Jesus was arrested, tried unfairly, and sentenced to die by crucifixion. Soldiers forced Him to carry a heavy wooden cross through the streets of Jerusalem. Simon of Cyrene was pulled from the crowd to help carry the weight. The King of Kings was walking toward death.", illustrationPrompt: "Jesus carrying cross through streets", imageUrl: "/assets/kids-scenes/yd-cross-scene-1.png", mood: "TENSION" },
  { sceneIndex: 2, narration: "At noon, darkness covered the whole land. The earth shook. The curtain in the temple — the barrier between God and humanity — tore from top to bottom. Something cosmic was happening. God was tearing down the wall that sin had built.", illustrationPrompt: "Sky darkens, temple curtain tears", imageUrl: "/assets/kids-scenes/yd-cross-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "Even on the cross, Jesus showed love. He prayed, 'Father, forgive them, for they do not know what they are doing.' He promised paradise to the criminal beside Him. His last words were, 'It is finished.' The price for sin had been paid in full.", illustrationPrompt: "Jesus on cross, seen from distance", imageUrl: "/assets/kids-scenes/yd-cross-scene-3.png", mood: "PEACE" },
  { sceneIndex: 4, narration: "Joseph of Arimathea took Jesus's body and placed it in a new tomb, sealed with a heavy stone. The disciples were devastated. Their hope seemed dead and buried. But this was not the end of the story — it was the beginning of the greatest miracle in history.", illustrationPrompt: "Jesus placed in stone tomb", imageUrl: "/assets/kids-scenes/yd-cross-scene-4.png", mood: "PEACE" },
];

const YD_RISEN_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "On Friday, they watched Him die. On Saturday, they hid behind locked doors, their hopes shattered. The one they had believed to be the Messiah was dead and buried. It was over — or so they thought. Very early on Sunday morning, everything changed.", illustrationPrompt: "Empty tomb, light streaming from inside", imageUrl: "/assets/kids-scenes/yd-risen-scene-0.png", mood: "AWE" },
  { sceneIndex: 1, narration: "Women came to the tomb at dawn to anoint Jesus's body with spices. But the heavy stone had been rolled away! Angels in dazzling white clothes sat inside the empty tomb. 'Why do you look for the living among the dead?' they asked. 'He is not here — He has risen!'", illustrationPrompt: "Women at empty tomb, angels in white", imageUrl: "/assets/kids-scenes/yd-risen-scene-1.png", mood: "JOY" },
  { sceneIndex: 2, narration: "Mary Magdalene was weeping in the garden when she heard someone say her name: 'Mary.' She turned and saw Jesus — alive! She wanted to cling to Him, but He said, 'Go and tell my brothers.' Mary ran to the disciples with the most important news in history: 'I have seen the Lord!'", illustrationPrompt: "Mary sees risen Jesus in garden", imageUrl: "/assets/kids-scenes/yd-risen-scene-2.png", mood: "JOY" },
  { sceneIndex: 3, narration: "Jesus appeared to His disciples behind locked doors. 'Peace be with you,' He said, showing them His hands. They were overjoyed! Thomas, who had doubted, touched Jesus's wounds and declared, 'My Lord and my God!' Seeing the risen Jesus transformed doubt into faith.", illustrationPrompt: "Jesus appears to disciples in room", imageUrl: "/assets/kids-scenes/yd-risen-scene-3.png", mood: "JOY" },
  { sceneIndex: 4, narration: "Over forty days, Jesus appeared to hundreds of people. Then, on a hilltop, He gave His final command: 'Go and make disciples of all nations.' As His followers watched, Jesus ascended into heaven, returning to His Father. But He promised: 'I am with you always, to the end of the age.'", illustrationPrompt: "Jesus ascending into heaven", imageUrl: "/assets/kids-scenes/yd-risen-scene-4.png", mood: "AWE" },
];

const TEEN_IDENTITY_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "In a softly lit room, the young man stares into the mirror, feeling a rush of doubt trickling in like cold water. Who am I? The question echoes. Social media tells him one thing. Friends say another. The world seems to have a hundred definitions for who he should be.", illustrationPrompt: "Teen alone at school, scrolling phone", imageUrl: "/assets/kids-scenes/teen-identity-scene-0.png", mood: "TENSION" },
  { sceneIndex: 1, narration: "Suddenly, a warm voice interrupts his thoughts, reminding him of a beautiful truth: he was knit together in his mother's womb. Psalm 139 says God knew him before he was born, that he is 'fearfully and wonderfully made.' Not an accident. Not a mistake. Designed with intention.", illustrationPrompt: "Teen looking at mirror, warm glow", imageUrl: "/assets/kids-scenes/teen-identity-scene-1.png", mood: "PEACE" },
  { sceneIndex: 2, narration: "The young man thinks of Jeremiah, the prophet who felt too young and unworthy. The words echo in his mind: 'Before I formed you in the womb I knew you; before you were born I set you apart.' If God called Jeremiah despite his doubts, maybe He sees something in us too.", illustrationPrompt: "Young Jeremiah called in Jerusalem", imageUrl: "/assets/kids-scenes/teen-identity-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "As more thoughts flood in about who he is in Christ, the young man realizes he is chosen, loved, and accepted. Not because of what he does, but because of whose he is. The labels the world gives fade. What remains is the truth: 'You are a child of God.'", illustrationPrompt: "Teen walking confidently through hallway", imageUrl: "/assets/kids-scenes/teen-identity-scene-3.png", mood: "JOY" },
  { sceneIndex: 4, narration: "Each day, the young man faces challenges and moments of doubt, but he remembers what God has declared over him. In Christ, he is a new creation. The old has gone, the new has come. Identity is not earned — it is received from the One who made you.", illustrationPrompt: "Teen at crossroads, choosing light", imageUrl: "/assets/kids-scenes/teen-identity-scene-4.png", mood: "PEACE" },
  { sceneIndex: 5, narration: "As he steps out of the house, the young man feels rejuvenated and ready to embrace who he is in Christ. The mirror no longer defines him. The opinions of others no longer control him. He walks in the freedom of knowing exactly whose he is.", illustrationPrompt: "Teen stepping into warm sunlight", imageUrl: "/assets/kids-scenes/teen-identity-scene-5.png", mood: "JOY" },
];

const TEEN_STANDING_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "Following Jesus has never been the popular choice. In every generation, believers have had to decide: will I blend in, or will I stand? At school, at work, online — the pressure to conform is relentless. But Romans 12:2 says, 'Do not conform to the pattern of this world.'", illustrationPrompt: "Teen standing alone in school hallway", imageUrl: "/assets/kids-scenes/teen-standing-scene-0.png", mood: "TENSION" },
  { sceneIndex: 1, narration: "It might look like refusing to join in when everyone is tearing someone apart online. It might mean being the only one who doesn't go along with the group. It might cost you friendships, popularity, or comfort. Jesus was honest about the cost: 'Take up your cross and follow me.'", illustrationPrompt: "Teen refusing peer pressure", imageUrl: "/assets/kids-scenes/teen-standing-scene-1.png", mood: "TENSION" },
  { sceneIndex: 2, narration: "Throughout history, Christians have paid an enormous price for their faith. The early church was persecuted ruthlessly. Believers were thrown to lions, burned, and imprisoned. Yet they did not waver. Their courage was not their own — it came from the Holy Spirit within them.", illustrationPrompt: "Early Christians courage in Colosseum", imageUrl: "/assets/kids-scenes/teen-standing-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "Standing alone does not mean you have to be angry or confrontational. Daniel stood firm without being arrogant. Esther spoke truth with grace. You can disagree without being disagreeable. Your life lived differently is often the loudest sermon.", illustrationPrompt: "Teen reading Bible, party in background", imageUrl: "/assets/kids-scenes/teen-standing-scene-3.png", mood: "PEACE" },
  { sceneIndex: 4, narration: "Jesus said, 'Blessed are those who are persecuted because of righteousness.' He did not say it would be easy. He said it would be worth it. When you stand for what is right, you may lose the approval of people — but you gain the approval of God.", illustrationPrompt: "Teen praying alone in bedroom", imageUrl: "/assets/kids-scenes/teen-standing-scene-4.png", mood: "PEACE" },
  { sceneIndex: 5, narration: "You are not alone in this. Every believer who has ever lived has faced this same choice. And the same God who sustained Daniel in the lion's den, who gave Esther courage before the king, who raised Jesus from the dead — that same God is with you right now.", illustrationPrompt: "Teen speaking truth boldly at school", imageUrl: "/assets/kids-scenes/teen-standing-scene-5.png", mood: "JOY" },
];

const TEEN_RELATIONSHIPS_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "Friendships are everything when you are a teenager. Your friends shape your language, your habits, your humor, your decisions, and even your future. The Bible knows this. Proverbs 13:20 says, 'Walk with the wise and become wise, for a companion of fools suffers harm.'", illustrationPrompt: "Two teens talking deeply on stairs", imageUrl: "/assets/kids-scenes/teen-relationships-scene-0.png", mood: "PEACE" },
  { sceneIndex: 1, narration: "Not every friendship is healthy. Some friends pressure you to compromise. Others drain you emotionally. A true friend 'loves at all times' (Proverbs 17:17). They tell you the truth even when it is hard. They push you closer to God, not further away.", illustrationPrompt: "Friend group with one excluded", imageUrl: "/assets/kids-scenes/teen-relationships-scene-1.png", mood: "TENSION" },
  { sceneIndex: 2, narration: "The Bible gives us a powerful example of friendship: David and Jonathan. Despite Jonathan's father wanting to kill David, Jonathan risked everything to protect his friend. Their bond was based on shared faith and genuine love — not convenience or popularity.", illustrationPrompt: "David and Jonathan friendship covenant", imageUrl: "/assets/kids-scenes/teen-relationships-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "Jesus modeled the deepest kind of friendship. He told His disciples, 'I no longer call you servants... I have called you friends.' He washed their feet. He prayed for them. He died for them. That is the standard: sacrificial, honest, and rooted in love.", illustrationPrompt: "Two teens praying together in church", imageUrl: "/assets/kids-scenes/teen-relationships-scene-3.png", mood: "PEACE" },
  { sceneIndex: 4, narration: "Conflict in friendships is inevitable. The question is how you handle it. Ephesians 4:32 says, 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.' Forgiveness is not optional — it is the foundation of every lasting friendship.", illustrationPrompt: "Teens forgiving each other", imageUrl: "/assets/kids-scenes/teen-relationships-scene-4.png", mood: "LOVE" },
  { sceneIndex: 5, narration: "Choose your inner circle carefully. Surround yourself with people who challenge you to grow, who speak truth into your life, and who point you toward Jesus. The right friendships will not just make your teenage years better — they will shape your entire life.", illustrationPrompt: "Group of friends walking together", imageUrl: "/assets/kids-scenes/teen-relationships-scene-5.png", mood: "JOY" },
];

const TEEN_PURPOSE_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "One of the most common questions teenagers ask is, 'What am I supposed to do with my life?' It can feel overwhelming when everyone around you seems to have it figured out. But here is the truth: God has a purpose for your life, and He is already working it out.", illustrationPrompt: "Teen journaling at desk, sunset window", imageUrl: "/assets/kids-scenes/teen-purpose-scene-0.png", mood: "PEACE" },
  { sceneIndex: 1, narration: "Jeremiah 29:11 says, 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.' This is not a promise that life will be easy. It is a promise that God has a direction for you.", illustrationPrompt: "Crossroads with path to bright light", imageUrl: "/assets/kids-scenes/teen-purpose-scene-1.png", mood: "AWE" },
  { sceneIndex: 2, narration: "Look at Esther. She was an orphan who became queen — not by accident, but by God's design. Mordecai told her, 'Who knows but that you have come to your royal position for such a time as this?' God places us where we are for a reason.", illustrationPrompt: "Esther crowned queen in Persian palace", imageUrl: "/assets/kids-scenes/teen-purpose-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "Purpose is not always a dramatic calling. Sometimes it is showing up faithfully every day. Serving at church. Being kind to the kid everyone ignores. Using your gifts — whether music, writing, sports, or science — to glorify God and love people.", illustrationPrompt: "Teen volunteering, serving others", imageUrl: "/assets/kids-scenes/teen-purpose-scene-3.png", mood: "JOY" },
  { sceneIndex: 4, narration: "Romans 8:28 promises that 'in all things God works for the good of those who love him, who have been called according to his purpose.' Even your mistakes, your detours, your painful experiences — God weaves them all into His plan.", illustrationPrompt: "Teen on hilltop at sunrise, arms wide", imageUrl: "/assets/kids-scenes/teen-purpose-scene-4.png", mood: "JOY" },
  { sceneIndex: 5, narration: "You do not need to have your whole life figured out right now. Just take the next step. Pray. Listen. Serve where you are. Trust that the God who made you, who knows every hair on your head, is guiding you toward something beautiful.", illustrationPrompt: "Teen walking toward golden light with Bible", imageUrl: "/assets/kids-scenes/teen-purpose-scene-5.png", mood: "PEACE" },
];

const TEEN_DANIEL_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "Daniel was probably around your age — fifteen or sixteen — when his world was ripped apart. The Babylonian Empire invaded Jerusalem, destroyed the temple, and carried away the brightest young men. Daniel was one of them. Everything he knew was gone.", illustrationPrompt: "Young Daniel entering Babylon as captive", imageUrl: "/assets/kids-scenes/teen-daniel-scene-0.png", mood: "TENSION" },
  { sceneIndex: 1, narration: "In Babylon, Daniel was pressured to abandon his identity. They changed his name, his education, and even his diet. But Daniel 'resolved not to defile himself.' He respectfully asked to eat according to God's law. And God honored his conviction.", illustrationPrompt: "Daniel refusing Babylonian food", imageUrl: "/assets/kids-scenes/teen-daniel-scene-1.png", mood: "AWE" },
  { sceneIndex: 2, narration: "Years later, a law was passed: pray to anyone but God, and you die. Daniel knew about the decree. He went home, opened his window toward Jerusalem, and prayed — just as he always had. Three times a day. No compromise. No hiding.", illustrationPrompt: "Daniel praying at open window", imageUrl: "/assets/kids-scenes/teen-daniel-scene-2.png", mood: "PEACE" },
  { sceneIndex: 3, narration: "Daniel was thrown into a den of hungry lions. The king sealed the entrance with a stone. All night, Daniel sat among the beasts. But God sent an angel who shut the lions' mouths. When morning came, Daniel was untouched.", illustrationPrompt: "Daniel in lions den, divine protection", imageUrl: "/assets/kids-scenes/teen-daniel-scene-3.png", mood: "AWE" },
  { sceneIndex: 4, narration: "The king was overjoyed and pulled Daniel out. He issued a decree that everyone must respect the God of Daniel. Daniel's faithfulness did not just save him — it changed an empire. One person's courage can shift the direction of history.", illustrationPrompt: "Daniel exits lions den, king amazed", imageUrl: "/assets/kids-scenes/teen-daniel-scene-4.png", mood: "JOY" },
  { sceneIndex: 5, narration: "Daniel's story is your story. You may not face literal lions, but you face pressure every day to compromise your faith. The same God who protected Daniel is with you. Stand firm. Pray boldly. Trust completely. Your faithfulness matters more than you know.", illustrationPrompt: "Modern teen standing firm, inspired", imageUrl: "/assets/kids-scenes/teen-daniel-scene-5.png", mood: "JOY" },
];

const TEEN_ESTHER_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "Esther's story reads like a movie. An orphan girl, raised by her cousin Mordecai, is chosen as queen of the Persian Empire. She has beauty, position, and comfort. But she also has a secret: she is Jewish, and she has hidden it on Mordecai's advice.", illustrationPrompt: "Esther before the Persian king", imageUrl: "/assets/kids-scenes/teen-esther-scene-0.png", mood: "AWE" },
  { sceneIndex: 1, narration: "Then comes the crisis. Haman, the king's advisor, plots to destroy every Jewish person in the empire. Mordecai sends Esther a message: 'Who knows but that you have come to your royal position for such a time as this?' Esther must choose: stay safe, or risk everything.", illustrationPrompt: "Esther approaching throne room", imageUrl: "/assets/kids-scenes/teen-esther-scene-1.png", mood: "TENSION" },
  { sceneIndex: 2, narration: "Esther called for three days of fasting and prayer. Then she approached the king uninvited — an act that could mean death. But the king extended his golden scepter. At a banquet, Esther revealed Haman's plot and her own identity. 'I am Jewish,' she declared. 'And my people are about to be destroyed.'", illustrationPrompt: "Esther confronts Haman at banquet", imageUrl: "/assets/kids-scenes/teen-esther-scene-2.png", mood: "AWE" },
  { sceneIndex: 3, narration: "Mordecai's grief was real. When he learned of Haman's decree, he tore his clothes and put on sackcloth. He wept at the city gates. Sometimes the right response to injustice is not just action — it is mourning. Mordecai's pain moved Esther to act.", illustrationPrompt: "Mordecai in sackcloth at city gates", imageUrl: "/assets/kids-scenes/teen-esther-scene-3.png", mood: "TENSION" },
  { sceneIndex: 4, narration: "Before Esther acted, she prayed. For three days, she fasted and sought God. She did not rush into the situation with her own strength. She went to God first. 'If I perish, I perish,' she said. That is the prayer of someone who trusts God more than they fear death.", illustrationPrompt: "Esther praying alone in chambers", imageUrl: "/assets/kids-scenes/teen-esther-scene-4.png", mood: "PEACE" },
  { sceneIndex: 5, narration: "Haman was exposed and executed. The Jewish people were saved. Esther's courage, rooted in faith and prayer, changed the course of history. You may never stand before a king, but you will face moments where courage is required. When that moment comes, remember: you are here for such a time as this.", illustrationPrompt: "Jewish people celebrating, deliverance", imageUrl: "/assets/kids-scenes/teen-esther-scene-5.png", mood: "JOY" },
];

const TEEN_JOSEPH_SCENES: SceneData[] = [
  { sceneIndex: 0, narration: "Joseph's story is the ultimate test case for whether you can trust God when life is brutally unfair. At seventeen, Joseph had dreams from God showing he would one day be in authority. His brothers' jealousy turned to hatred, and they sold him into slavery.", illustrationPrompt: "Young Joseph with brothers, colorful robe", imageUrl: "/assets/kids-scenes/teen-joseph-scene-0.png", mood: "TENSION" },
  { sceneIndex: 1, narration: "In Egypt, Joseph served faithfully in Potiphar's house. But when he refused to compromise his integrity with Potiphar's wife, she falsely accused him. Joseph was thrown into prison for doing the right thing. Integrity cost him his freedom.", illustrationPrompt: "Joseph sold to traders, betrayal", imageUrl: "/assets/kids-scenes/teen-joseph-scene-1.png", mood: "TENSION" },
  { sceneIndex: 2, narration: "In prison, Joseph could have given up. Instead, he served faithfully, interpreted dreams, and trusted God's timing. Two full years passed after the cupbearer forgot about him. But Joseph never stopped believing that God had a plan.", illustrationPrompt: "Joseph in Egyptian prison, beam of light", imageUrl: "/assets/kids-scenes/teen-joseph-scene-2.png", mood: "PEACE" },
  { sceneIndex: 3, narration: "Finally, Pharaoh had a dream no one could interpret. Joseph was brought from prison to the palace. He interpreted the dream, and Pharaoh made him second-in-command of all Egypt. From pit to prison to palace — God's timing is perfect.", illustrationPrompt: "Joseph before Pharaoh, authority", imageUrl: "/assets/kids-scenes/teen-joseph-scene-3.png", mood: "AWE" },
  { sceneIndex: 4, narration: "When Joseph's brothers came begging for food during the famine, Joseph had the power to destroy them. Instead, he wept and forgave. 'You intended to harm me,' he said, 'but God intended it for good.' That is the statement of someone who trusts God's sovereignty completely.", illustrationPrompt: "Joseph forgiving weeping brothers", imageUrl: "/assets/kids-scenes/teen-joseph-scene-4.png", mood: "LOVE" },
  { sceneIndex: 5, narration: "Joseph's story teaches us that integrity and trust in God are never wasted — even when the payoff takes years. You may be in a 'pit' right now. You may be in a 'prison' of unfair circumstances. But God sees you, and He is working all things for good.", illustrationPrompt: "Modern teen facing injustice with integrity", imageUrl: "/assets/kids-scenes/teen-joseph-scene-5.png", mood: "PEACE" },
];

const ALL_STORIES: Record<string, SceneData[]> = {
  "In the Beginning: Creation": YD_CREATION_SCENES,
  "The Fall: Sin Enters the World": YD_FALL_SCENES,
  "Noah and the Flood": YD_NOAH_SCENES,
  "Abraham's Test of Faith": YD_ABRAHAM_SCENES,
  "Joseph: From Pit to Palace": YD_JOSEPH_SCENES,
  "The Birth of Jesus": YD_BIRTH_SCENES,
  "Jesus Calls His Disciples": YD_DISCIPLES_SCENES,
  "The Parable of the Good Samaritan": YD_SAMARITAN_SCENES,
  "The Cross: Jesus Dies for Us": YD_CROSS_SCENES,
  "He Is Risen: The Resurrection": YD_RISEN_SCENES,
  "Who Am I? Identity in Christ": TEEN_IDENTITY_SCENES,
  "Standing Alone: When Faith Costs You": TEEN_STANDING_SCENES,
  "Real Relationships: Friendship God's Way": TEEN_RELATIONSHIPS_SCENES,
  "Purpose and Calling: You Are Here for a Reason": TEEN_PURPOSE_SCENES,
  "Daniel: Uncompromising in a Hostile World": TEEN_DANIEL_SCENES,
  "Esther: Courage When Everything Is on the Line": TEEN_ESTHER_SCENES,
  "Joseph: Integrity Through Injustice": TEEN_JOSEPH_SCENES,
};

const STORY_THUMBNAILS: Record<string, string> = {
  "In the Beginning: Creation": "/assets/kids-scenes/yd-creation-scene-0.png",
  "The Fall: Sin Enters the World": "/assets/kids-scenes/yd-fall-scene-0.png",
  "Noah and the Flood": "/assets/kids-scenes/yd-noah-scene-0.png",
  "Abraham's Test of Faith": "/assets/kids-scenes/yd-abraham-scene-0.png",
  "Joseph: From Pit to Palace": "/assets/kids-scenes/yd-joseph-scene-0.png",
  "The Birth of Jesus": "/assets/kids-scenes/yd-birth-scene-0.png",
  "Jesus Calls His Disciples": "/assets/kids-scenes/yd-disciples-scene-0.png",
  "The Parable of the Good Samaritan": "/assets/kids-scenes/yd-samaritan-scene-1.png",
  "The Cross: Jesus Dies for Us": "/assets/kids-scenes/yd-cross-scene-0.png",
  "He Is Risen: The Resurrection": "/assets/kids-scenes/yd-risen-scene-0.png",
  "Who Am I? Identity in Christ": "/assets/kids-scenes/teen-identity-scene-0.png",
  "Standing Alone: When Faith Costs You": "/assets/kids-scenes/teen-standing-scene-0.png",
  "Real Relationships: Friendship God's Way": "/assets/kids-scenes/teen-relationships-scene-0.png",
  "Purpose and Calling: You Are Here for a Reason": "/assets/kids-scenes/teen-purpose-scene-0.png",
  "Daniel: Uncompromising in a Hostile World": "/assets/kids-scenes/teen-daniel-scene-0.png",
  "Esther: Courage When Everything Is on the Line": "/assets/kids-scenes/teen-esther-scene-0.png",
  "Joseph: Integrity Through Injustice": "/assets/kids-scenes/teen-joseph-scene-0.png",
};

async function backfillYDTeen() {
  console.log("[backfill-yd-teen] Updating story thumbnails...");
  for (const [title, imageUrl] of Object.entries(STORY_THUMBNAILS)) {
    const result = await db
      .update(kidsStories)
      .set({ imageUrl })
      .where(eq(kidsStories.title, title))
      .returning({ id: kidsStories.id });
    console.log(
      result.length > 0
        ? `  Updated thumbnail: ${title}`
        : `  Not found (skipped): ${title}`
    );
  }

  console.log("[backfill-yd-teen] Replacing scenes with curated content...");
  for (const [storyTitle, scenes] of Object.entries(ALL_STORIES)) {
    const storyRows = await db
      .select({ id: kidsStories.id })
      .from(kidsStories)
      .where(eq(kidsStories.title, storyTitle));
    if (!storyRows.length) {
      console.log(`  Story not found (skipped): ${storyTitle}`);
      continue;
    }
    const storyId = storyRows[0].id;
    await db
      .delete(kidsStoryScenes)
      .where(eq(kidsStoryScenes.storyId, storyId));
    for (const scene of scenes) {
      await db.insert(kidsStoryScenes).values({
        id: randomUUID(),
        storyId,
        sceneIndex: scene.sceneIndex,
        narration: scene.narration,
        illustrationPrompt: scene.illustrationPrompt,
        imageUrl: scene.imageUrl,
        mood: scene.mood,
      });
    }
    console.log(
      `  Replaced with ${scenes.length} curated scenes: ${storyTitle}`
    );
  }

  console.log("[backfill-yd-teen] Done.");
}

backfillYDTeen()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill-yd-teen] ERROR:", err);
    process.exit(1);
  });
