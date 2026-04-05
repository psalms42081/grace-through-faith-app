import {
  runBiblicalEpisodePipeline,
  type EpisodeGenerationConfig,
} from "./services/biblicalEpisodePipeline";
import { ELEVENLABS_VOICES } from "./elevenlabs-tts";
import {
  generateMultiVoiceNarration,
  type VoiceSegment,
} from "./services/cinematicVoiceoverService";

const EPISODE_ID = "daniel7-four-beasts";
const MUSIC_TRACK = "cinematic-ambient-emotional.mp3";

const NARRATION_SCRIPT = `In the first year of Belshazzar king of Babylon, Daniel had a dream and visions of his head upon his bed. Then he wrote the dream, and told the sum of the matters.

Daniel spake and said, I saw in my vision by night, and, behold, the four winds of the heaven strove upon the great sea. And four great beasts came up from the sea, diverse one from another.

The first was like a lion, and had eagle's wings: I beheld till the wings thereof were plucked, and it was lifted up from the earth, and made stand upon the feet as a man, and a man's heart was given to it.

And behold another beast, a second, like to a bear, and it raised up itself on one side, and it had three ribs in the mouth of it between the teeth of it: and they said thus unto it, Arise, devour much flesh.

After this I beheld, and lo another, like a leopard, which had upon the back of it four wings of a fowl; the beast had also four heads; and dominion was given to it.

After this I saw in the night visions, and behold a fourth beast, dreadful and terrible, and strong exceedingly; and it had great iron teeth: it devoured and brake in pieces, and stamped the residue with the feet of it: and it was diverse from all the beasts that were before it; and it had ten horns.

I beheld till the thrones were cast down, and the Ancient of days did sit, whose garment was white as snow, and the hair of his head like the pure wool: his throne was like the fiery flame, and his wheels as burning fire. A fiery stream issued and came forth from before him: thousand thousands ministered unto him, and ten thousand times ten thousand stood before him: the judgment was set, and the books were opened.

I saw in the night visions, and, behold, one like the Son of man came with the clouds of heaven, and came to the Ancient of days, and they brought him near before him. And there was given him dominion, and glory, and a kingdom, that all people, nations, and languages, should serve him: his dominion is an everlasting dominion, which shall not pass away, and his kingdom that which shall not be destroyed.`;

const SCENES: EpisodeGenerationConfig["scenes"] = [
  {
    sceneNumber: 1,
    scriptSlice: `In the first year of Belshazzar king of Babylon, Daniel had a dream and visions of his head upon his bed. Then he wrote the dream, and told the sum of the matters. Daniel spake and said, I saw in my vision by night, and, behold, the four winds of the heaven strove upon the great sea. And four great beasts came up from the sea, diverse one from another.`,
    emotion: "wonder",
    imagePrompt: "An elderly Middle Eastern prophet with a grey beard lying on a bed in a Babylonian palace chamber at night, eyes wide open staring into swirling supernatural visions above him, four violent winds churning a dark stormy sea, moonlight through arched windows, 9:16 vertical cinematic",
    motionPrompt: "Daniel lies in bed as supernatural visions swirl above him. Four winds churn the dark sea in his vision. Camera slowly pushes in on his awestruck face. Atmospheric mist and moonlight. Cinematic wonder.",
    durationHint: 20,
    location: "daniels-chamber",
  },
  {
    sceneNumber: 2,
    scriptSlice: `The first was like a lion, and had eagle's wings: I beheld till the wings thereof were plucked, and it was lifted up from the earth, and made stand upon the feet as a man, and a man's heart was given to it.`,
    emotion: "awe",
    imagePrompt: "A magnificent golden lion with enormous eagle wings rising from a dark churning sea, majestic and powerful, Babylonian style, wings spread wide against a stormy sky, dramatic golden-amber lighting, ancient Near Eastern atmosphere, 9:16 vertical cinematic",
    motionPrompt: "A majestic golden lion with eagle wings rises powerfully from the dark sea. Its wings spread wide. Camera slowly orbits around it. Dramatic storm clouds and golden light. Cinematic grandeur. Ancient power.",
    durationHint: 15,
    location: "beast-from-sea",
  },
  {
    sceneNumber: 3,
    scriptSlice: `And behold another beast, a second, like to a bear, and it raised up itself on one side, and it had three ribs in the mouth of it between the teeth of it: and they said thus unto it, Arise, devour much flesh.`,
    emotion: "dread",
    imagePrompt: "A massive fearsome bear rising from dark churning ocean waters, raised up on one side, three bloody ribs clenched between its enormous teeth, dark brown fur matted with sea water, menacing red eyes, stormy dark sky, 9:16 vertical cinematic",
    motionPrompt: "A massive bear rises from the dark sea, raised on one side, ribs clenched in its teeth. Water cascades off its dark fur. Camera pushes in slowly. Thunder rumbles. Menacing atmosphere. Cinematic dread.",
    durationHint: 12,
    location: "beast-from-sea",
  },
  {
    sceneNumber: 4,
    scriptSlice: `After this I beheld, and lo another, like a leopard, which had upon the back of it four wings of a fowl; the beast had also four heads; and dominion was given to it.`,
    emotion: "tension",
    imagePrompt: "A supernatural leopard with four distinct heads and four bird wings on its back, emerging from dark churning seas, spotted golden-tan fur, four sets of glowing eyes, swift and predatory, dark stormy atmosphere, 9:16 vertical cinematic",
    motionPrompt: "A four-headed leopard with four wings leaps from the dark sea. Its multiple heads scan in different directions. Wings beat rapidly. Camera tracks its swift predatory movement. Lightning flashes. Cinematic speed and menace.",
    durationHint: 12,
    location: "beast-from-sea",
  },
  {
    sceneNumber: 5,
    scriptSlice: `After this I saw in the night visions, and behold a fourth beast, dreadful and terrible, and strong exceedingly; and it had great iron teeth: it devoured and brake in pieces, and stamped the residue with the feet of it: and it was diverse from all the beasts that were before it; and it had ten horns.`,
    emotion: "terror",
    imagePrompt: "A nightmarish fourth beast unlike any animal, massive and terrifying with enormous iron teeth gleaming, ten horns on its head, dark armored scales, crushing everything beneath its feet, fragments of destruction around it, dark red and black stormy sky, 9:16 vertical cinematic",
    motionPrompt: "The fourth beast emerges — dreadful and terrible beyond description. Iron teeth gleam as it devours and crushes. Ten horns crown its monstrous head. Camera pulls back revealing its terrifying scale. Dark destruction. Cinematic horror.",
    durationHint: 18,
    location: "fourth-beast",
  },
  {
    sceneNumber: 6,
    scriptSlice: `I beheld till the thrones were cast down, and the Ancient of days did sit, whose garment was white as snow, and the hair of his head like the pure wool: his throne was like the fiery flame, and his wheels as burning fire. A fiery stream issued and came forth from before him: thousand thousands ministered unto him, and ten thousand times ten thousand stood before him: the judgment was set, and the books were opened.`,
    emotion: "majesty",
    imagePrompt: "The Ancient of Days seated on a throne of blazing fire with wheels of burning flame, garments white as snow, hair like pure wool, a river of fire flowing from before him, millions of angels standing in attendance, massive golden books opened for judgment, cosmic heavenly throne room, 9:16 vertical cinematic",
    motionPrompt: "The Ancient of Days sits on His fiery throne. A river of fire flows from before Him. Millions of angels stand in reverent attendance. Great books open for judgment. Camera slowly pulls back revealing the infinite scale of the heavenly court. Majestic golden light. Cinematic awe.",
    durationHint: 30,
    location: "heavenly-throne",
    preRenderedVideoUrl: "https://res.cloudinary.com/dy77gwpzu/video/upload/v1774938584/grace-through-faith/daniel7-assets/ancient-of-days-throne-animated.mp4",
  },
  {
    sceneNumber: 7,
    scriptSlice: `I saw in the night visions, and, behold, one like the Son of man came with the clouds of heaven, and came to the Ancient of days, and they brought him near before him. And there was given him dominion, and glory, and a kingdom, that all people, nations, and languages, should serve him: his dominion is an everlasting dominion, which shall not pass away, and his kingdom that which shall not be destroyed.`,
    emotion: "triumph",
    imagePrompt: "A radiant figure like the Son of Man approaching through brilliant golden clouds of heaven toward an immense fiery throne, angels escorting him, divine light radiating from both figures, a golden crown and scepter being bestowed, cosmic heavenly atmosphere of ultimate triumph and coronation, 9:16 vertical cinematic",
    motionPrompt: "The Son of Man approaches through golden clouds toward the Ancient of Days. Angels escort Him. Divine radiance intensifies as dominion is given. A crown and eternal kingdom bestowed. Camera slowly rises. Ultimate triumph. Cinematic glory and majesty. Golden light fills everything.",
    durationHint: 25,
    location: "heavenly-throne",
  },
];

function buildVoiceSegments(): VoiceSegment[] {
  return SCENES.map((scene) => ({
    text: scene.scriptSlice.trim(),
    voiceId: ELEVENLABS_VOICES.bill,
    label: `scene-${scene.sceneNumber}-narrator (Bill)`,
    pauseAfterSec: scene.sceneNumber === 7 ? 2.0 : 0.6,
    voiceSettings: { stability: 0.75, similarity_boost: 0.6 },
  }));
}

export async function generateDaniel7(): Promise<string> {
  console.log(
    `\n[daniel7] ===== LAUNCHING DANIEL 7: The Four Beasts and the Ancient of Days =====`
  );
  console.log(`[daniel7] Episode ID: ${EPISODE_ID}`);
  console.log(`[daniel7] Voice: Bill (narrator) — stability 0.75`);
  console.log(`[daniel7] Music: ${MUSIC_TRACK}`);
  console.log(`[daniel7] Scenes: ${SCENES.length}`);
  console.log(`[daniel7] Scripture: Daniel 7:1-14 (KJV)`);
  console.log(`[daniel7] Number normalization: ACTIVE`);

  console.log(`\n[daniel7] Step 1: Generating multi-voice narration...`);
  const voiceSegments = buildVoiceSegments();
  const voiceoverUrl = await generateMultiVoiceNarration(
    voiceSegments,
    EPISODE_ID
  );
  console.log(`[daniel7] Voiceover ready: ${voiceoverUrl.substring(0, 80)}...`);

  const fullScript = SCENES
    .map((s) => s.scriptSlice.trim())
    .join("\n\n");

  const episodeConfig: EpisodeGenerationConfig = {
    episodeId: EPISODE_ID,
    script: fullScript,
    voiceId: ELEVENLABS_VOICES.bill,
    musicTrack: MUSIC_TRACK,
    scenes: SCENES,
    scriptureAnchor: "Daniel 7:1-14",
    episodeTitle: "The Four Beasts and the Ancient of Days",
    cachedVoiceoverUrl: voiceoverUrl,
  };

  console.log(`\n[daniel7] Step 2: Launching pipeline...`);
  console.log(`[daniel7] All 7 scenes → Runway fresh generation`);
  console.log(`[daniel7] Tip: Generate pre-rendered videos for hero scenes and re-run with preRenderedVideoUrl`);
  return runBiblicalEpisodePipeline(episodeConfig);
}

export { EPISODE_ID as DANIEL7_EPISODE_ID };
