import {
  runBiblicalEpisodePipeline,
  type EpisodeGenerationConfig,
} from "./services/biblicalEpisodePipeline";
import { ELEVENLABS_VOICES } from "./elevenlabs-tts";
import {
  generateMultiVoiceNarration,
  type VoiceSegment,
} from "./services/cinematicVoiceoverService";

const EPISODE_ID = "daniel2-great-image";
const MUSIC_TRACK = "cinematic-ambient-emotional.mp3";

const SCENES: EpisodeGenerationConfig["scenes"] = [
  {
    sceneNumber: 1,
    scriptSlice: `And in the second year of the reign of Nebuchadnezzar, Nebuchadnezzar dreamed dreams, wherewith his spirit was troubled, and his sleep brake from him. Then the king commanded to call the magicians, and the astrologers, and the sorcerers, and the Chaldeans, for to shew the king his dreams. But the thing is gone from me: if ye will not make known unto me the dream, with the interpretation thereof, ye shall be cut in pieces.`,
    emotion: "tension",
    imagePrompt: "A powerful Babylonian king Nebuchadnezzar sitting upright in his ornate royal bed, disturbed and sweating, golden Babylonian palace chamber, torches flickering, royal advisors and magicians kneeling before him in fear, ancient Babylonian architecture with golden walls, 9:16 vertical cinematic",
    motionPrompt: "King Nebuchadnezzar sits upright in bed, visibly troubled. Camera slowly pushes in on his distressed face. Torchlight flickers. His advisors kneel in fear. Atmospheric tension. Cinematic dread.",
    durationHint: 20,
    location: "babylonian-palace",
  },
  {
    sceneNumber: 2,
    scriptSlice: `Then Daniel went in, and desired of the king that he would give him time, and that he would shew the king the interpretation. Then was the secret revealed unto Daniel in a night vision. Then Daniel blessed the God of heaven. He changeth the times and the seasons: he removeth kings, and setteth up kings: he giveth wisdom unto the wise, and knowledge to them that have understanding.`,
    emotion: "reverence",
    imagePrompt: "A young Middle Eastern prophet Daniel kneeling in prayer in a simple room at night, divine golden light streaming down from above, his eyes closed and hands raised in worship and gratitude, ancient Babylonian setting, moonlight through a window, supernatural atmosphere, 9:16 vertical cinematic",
    motionPrompt: "Daniel kneels in fervent prayer. Divine golden light descends upon him as the secret is revealed. His face lifts in awe and gratitude. Camera slowly orbits around him. Supernatural atmosphere. Cinematic reverence.",
    durationHint: 20,
    location: "daniels-room",
  },
  {
    sceneNumber: 3,
    scriptSlice: `Daniel answered in the presence of the king, and said, There is a God in heaven that revealeth secrets, and maketh known to the king Nebuchadnezzar what shall be in the latter days. Thou, O king, sawest, and behold a great image. This great image, whose brightness was excellent, stood before thee; and the form thereof was terrible.`,
    emotion: "awe",
    imagePrompt: "A towering colossal metallic statue standing in a vast dark dreamscape, glowing with supernatural brightness, terrifying and magnificent, ancient Near Eastern style, the statue gleaming with different metals from head to foot, dark stormy atmospheric background, 9:16 vertical cinematic",
    motionPrompt: "A massive gleaming statue materializes in the dreamscape. Camera slowly tilts upward from its feet revealing its terrifying brightness. Supernatural glow pulses. Dark atmosphere surrounds the towering figure. Cinematic awe and scale.",
    durationHint: 18,
    location: "dream-statue",
  },
  {
    sceneNumber: 4,
    scriptSlice: `This image's head was of fine gold. Thou, O king, art this head of gold. And after thee shall arise another kingdom inferior to thee, and the breast and arms of the image were of silver. And another third kingdom of brass, which shall bear rule over all the earth.`,
    emotion: "majesty",
    imagePrompt: "Close-up of a colossal statue showing the gleaming golden head with a royal crown, then the chest and arms of polished silver, then the belly and thighs of burnished bronze, each metal reflecting light differently, supernatural dreamscape background, 9:16 vertical cinematic",
    motionPrompt: "Camera begins at the magnificent golden head of the statue, slowly tilting downward past the silver chest and arms to the bronze belly. Each metal gleams distinctly. Supernatural light reflects off the surfaces. Slow majestic reveal. Cinematic grandeur.",
    durationHint: 18,
    location: "dream-statue",
  },
  {
    sceneNumber: 5,
    scriptSlice: `And the fourth kingdom shall be strong as iron: forasmuch as iron breaketh in pieces and subdueth all things. And whereas thou sawest the feet part of iron and part of clay, the kingdom shall be divided. They shall mingle themselves with the seed of men: but they shall not cleave one to another, even as iron is not mixed with clay.`,
    emotion: "tension",
    imagePrompt: "Close-up of the lower portion of a colossal statue showing massive legs of dark iron, then feet and toes made of a crumbling mixture of iron and clay, cracks forming in the clay portions, unstable and divided, dark atmospheric dreamscape, 9:16 vertical cinematic",
    motionPrompt: "Camera continues downward past the iron legs to the feet of mixed iron and clay. Cracks form and spread through the clay. The mixture crumbles at the edges — strong yet divided. Camera pushes in on the unstable feet. Atmospheric tension. Cinematic detail.",
    durationHint: 20,
    location: "dream-statue",
  },
  {
    sceneNumber: 6,
    scriptSlice: `Thou sawest till that a stone was cut out without hands, which smote the image upon his feet that were of iron and clay, and brake them to pieces. Then was the iron, the clay, the brass, the silver, and the gold, broken to pieces together, and became like the chaff of the summer threshingfloors; and the wind carried them away, that no place was found for them.`,
    emotion: "power",
    imagePrompt: "A supernatural stone cut without human hands hurtling through the air and striking the feet of the great metallic statue, the entire colossus shattering and exploding into fragments of gold silver bronze and iron, pieces scattering like chaff in the wind, dramatic supernatural lighting, 9:16 vertical cinematic",
    motionPrompt: "A supernatural stone strikes the statue's feet with devastating force. The entire colossus shatters — gold silver bronze iron exploding outward. Fragments scatter like chaff in the wind. Camera pulls back showing total destruction. Cinematic impact and power.",
    durationHint: 20,
    location: "dream-destruction",
  },
  {
    sceneNumber: 7,
    scriptSlice: `And the stone that smote the image became a great mountain, and filled the whole earth. And in the days of these kings shall the God of heaven set up a kingdom, which shall never be destroyed: and the kingdom shall not be left to other people, but it shall break in pieces and consume all these kingdoms, and it shall stand for ever.`,
    emotion: "triumph",
    imagePrompt: "The small supernatural stone growing rapidly into a massive glowing mountain that fills the entire earth, golden divine light radiating from its peak, the ruins of the shattered statue scattered below, a new eternal kingdom established, cosmic scale, heavenly atmosphere, 9:16 vertical cinematic",
    motionPrompt: "The stone grows into an immense mountain filling the whole earth. Golden divine light radiates from its summit. Camera pulls far back revealing the mountain covering everything. The eternal kingdom established. Triumph and majesty. Cinematic glory.",
    durationHint: 25,
    location: "eternal-kingdom",
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

export async function generateDaniel2(): Promise<string> {
  console.log(
    `\n[daniel2] ===== LAUNCHING DANIEL 2: The Great Image =====`
  );
  console.log(`[daniel2] Episode ID: ${EPISODE_ID}`);
  console.log(`[daniel2] Voice: Bill (narrator) — stability 0.75`);
  console.log(`[daniel2] Music: ${MUSIC_TRACK}`);
  console.log(`[daniel2] Scenes: ${SCENES.length}`);
  console.log(`[daniel2] Scripture: Daniel 2:1-3, 19-21, 27-28, 31-45 (KJV)`);
  console.log(`[daniel2] Number normalization: ACTIVE`);

  console.log(`\n[daniel2] Step 1: Generating multi-voice narration...`);
  const voiceSegments = buildVoiceSegments();
  const voiceoverUrl = await generateMultiVoiceNarration(
    voiceSegments,
    EPISODE_ID
  );
  console.log(`[daniel2] Voiceover ready: ${voiceoverUrl.substring(0, 80)}...`);

  const fullScript = SCENES
    .map((s) => s.scriptSlice.trim())
    .join("\n\n");

  const episodeConfig: EpisodeGenerationConfig = {
    episodeId: EPISODE_ID,
    script: fullScript,
    voiceId: ELEVENLABS_VOICES.bill,
    musicTrack: MUSIC_TRACK,
    scenes: SCENES,
    scriptureAnchor: "Daniel 2:1-45",
    episodeTitle: "The Great Image",
    cachedVoiceoverUrl: voiceoverUrl,
  };

  console.log(`\n[daniel2] Step 2: Launching pipeline...`);
  console.log(`[daniel2] All 7 scenes → Runway fresh generation`);
  return runBiblicalEpisodePipeline(episodeConfig);
}

export { EPISODE_ID as DANIEL2_EPISODE_ID };
