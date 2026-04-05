import {
  runBiblicalEpisodePipeline,
  type EpisodeGenerationConfig,
} from "./services/biblicalEpisodePipeline";
import { ELEVENLABS_VOICES, BIBLICAL_VOICE_ROLES } from "./elevenlabs-tts";
import {
  generateMultiVoiceNarration,
  type VoiceSegment,
} from "./services/cinematicVoiceoverService";

const EPISODE_ID = "f60d1718-8b6a-4104-907d-f8b359f9e62a";
const MUSIC_TRACK = "cinematic-ambient-emotional.mp3";

const EASTER_ASSETS = {
  burial: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774919842/grace-through-faith/easter-assets/ep5-burial-of-jesus.jpg",
  womenWalking: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774919843/grace-through-faith/easter-assets/scene2-women-walking-to-tomb.jpg",
  angelAtTomb: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774919844/grace-through-faith/easter-assets/scene4-angel-at-tomb.jpg",
  emptyTombInterior: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774919845/grace-through-faith/easter-assets/scene4b-empty-tomb-interior.jpg",
  angelSpeaks: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774919846/grace-through-faith/easter-assets/scene5-angel-speaks-to-women.jpg",
  jerusalemSunrise: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774919847/grace-through-faith/easter-assets/scene5-jerusalem-sunrise.jpg",
  jesusAppears: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774919848/grace-through-faith/easter-assets/scene7-jesus-appears-to-mary.jpg",
  maryRunning: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774919849/grace-through-faith/easter-assets/scene8-mary-running-joy.jpg",
  jesusRisenVideo: "https://res.cloudinary.com/dy77gwpzu/video/upload/v1774925880/grace-through-faith/easter-assets/jesus-risen-tomb-animated.mp4",
};

const NARRATION_SCRIPT = `I could not sleep. None of us could. The night stretched on as though the sun itself had forgotten how to rise. Three days. Three days since they took Him from us. Three days since the sky went black at midday and the earth shook beneath our feet. The city was still. The tomb was sealed. And everything we had believed — everything He had promised — lay behind a stone we could not move.

Before the first light, we gathered what we had — myrrh, aloes, linen. We did not speak of why. We did not need to. We were going to anoint His body. It was all we had left to give. Mary Magdalene walked ahead. Her grief was the deepest — she had been the closest. But she was also the bravest. The streets were silent. Our sandals on the stone path were the only sound in the world. We did not know what we were walking toward. We only knew we could not stay away.

I remember the smell of the spices in the jars. I remember the cold. I remember thinking — who will roll the stone away for us?

And this is what happened. Hear it as I heard it. As I lived it.

After the Sabbath, at dawn on the first day of the week, Mary Magdalene and the other Mary went to look at the tomb.

There was a violent earthquake, for an angel of the Lord came down from heaven and, going to the tomb, rolled back the stone and sat on it. His appearance was like lightning, and his clothes were white as snow.

The guards were so afraid of him that they shook and became like dead men. The angel said to the women, Do not be afraid, for I know that you are looking for Jesus, who was crucified. He is not here — He has risen, just as He said. Come and see the place where He lay.

Then go quickly and tell His disciples: He has risen from the dead and is going ahead of you into Galilee. There you will see Him. Now I have told you.

So we ran. We ran with fear and with great joy. Can you hold both at once? I am telling you — you can. Your hands tremble and your heart sings and you cannot tell where the terror ends and the wonder begins.

And then — He was there. On the road. Alive. He said one word to us. Greetings. And we fell at His feet. We held Him. He was real. He was warm. He was breathing. And He said, Do not be afraid. Go and tell my brothers to go to Galilee. There they will see me.

I am telling you this because I was there. I touched the ground where His body had lain. I saw the linens folded. I heard the angel speak. I held His feet on the road and felt life where death had been.

The tomb is still open. The stone is still rolled away. And the One who said He would rise — rose. Death could not hold Him. The grave could not keep Him. And if He is alive — then everything He promised is true.

He is risen. He is risen indeed.`;

const SCENES: EpisodeGenerationConfig["scenes"] = [
  {
    sceneNumber: 1,
    scriptSlice: `I could not sleep. None of us could. The night stretched on as though the sun itself had forgotten how to rise. Three days. Three days since they took Him from us. Three days since the sky went black at midday and the earth shook beneath our feet. The city was still. The tomb was sealed. And everything we had believed — everything He had promised — lay behind a stone we could not move.`,
    emotion: "grief",
    imagePrompt: "Burial scene inside a rock tomb, men laying a wrapped body on a stone slab by torchlight, mourning women nearby",
    motionPrompt:
      "Extremely slow camera push-in toward the mourning figures gathered around the stone slab. Torchlight flickers on cave walls. Gentle dust particles float in warm light. Somber stillness. Cinematic slow pace.",
    durationHint: 25,
    location: "burial-tomb",
    referenceImageUrl: EASTER_ASSETS.burial,
    preRenderedVideoUrl: "https://res.cloudinary.com/dy77gwpzu/video/upload/v1774920071/grace-through-faith/easter-assets/burial-scene-vertical.mp4",
  },
  {
    sceneNumber: 2,
    scriptSlice: `Before the first light, we gathered what we had — myrrh, aloes, linen. We did not speak of why. We did not need to. We were going to anoint His body. It was all we had left to give. Mary Magdalene walked ahead. Her grief was the deepest — she had been the closest. But she was also the bravest. The streets were silent. Our sandals on the stone path were the only sound in the world. We did not know what we were walking toward. We only knew we could not stay away. I remember the smell of the spices in the jars. I remember the cold. I remember thinking — who will roll the stone away for us?`,
    emotion: "sorrow",
    imagePrompt: "Three women walking on a stone path through olive trees at pre-dawn, carrying clay jars of burial spices",
    motionPrompt:
      "Three women walk slowly along a misty stone path through olive trees. Pre-dawn blue light. Camera follows gently from slightly ahead. Morning mist swirls around their feet. Somber, deliberate pace. Gentle atmospheric motion.",
    durationHint: 35,
    location: "olive-grove-path",
    referenceImageUrl: EASTER_ASSETS.womenWalking,
  },
  {
    sceneNumber: 3,
    scriptSlice: `And this is what happened. Hear it as I heard it. As I lived it. After the Sabbath, at dawn on the first day of the week, Mary Magdalene and the other Mary went to look at the tomb. There was a violent earthquake, for an angel of the Lord came down from heaven and, going to the tomb, rolled back the stone and sat on it. His appearance was like lightning, and his clothes were white as snow.`,
    emotion: "awe",
    imagePrompt: "An angel in radiant white robes seated on the rolled-away stone at the tomb entrance, Roman guards fallen to the ground in fear, dawn light",
    motionPrompt:
      "A radiant angel sits on the great stone. Roman guards cower on the ground. Brilliant golden light intensifies from the figure. Subtle camera shake as if from earthquake aftershock. Dust particles catch divine light. Awe-inspiring atmosphere.",
    durationHint: 25,
    location: "tomb-exterior-angel",
    referenceImageUrl: EASTER_ASSETS.angelAtTomb,
  },
  {
    sceneNumber: 4,
    scriptSlice: `The guards were so afraid of him that they shook and became like dead men. The angel said to the women, Do not be afraid, for I know that you are looking for Jesus, who was crucified. He is not here — He has risen, just as He said. Come and see the place where He lay.`,
    emotion: "revelation",
    imagePrompt: "Interior of empty tomb, folded linen cloths on stone slab, golden light streaming through entrance, dust particles in light beams",
    motionPrompt:
      "Camera slowly drifts into the empty tomb interior. Golden light pours through the entrance, illuminating folded white linen on the stone slab. Dust particles dance in radiant beams. Slow, reverent push-in. Breathtaking stillness.",
    durationHint: 20,
    location: "tomb-interior",
    referenceImageUrl: EASTER_ASSETS.emptyTombInterior,
  },
  {
    sceneNumber: 5,
    scriptSlice: `Then go quickly and tell His disciples: He has risen from the dead and is going ahead of you into Galilee. There you will see Him. Now I have told you.`,
    emotion: "urgency",
    imagePrompt: "Two angels in white speaking to three women at the open tomb entrance, gesturing toward the empty burial chamber",
    motionPrompt:
      "Angels in white robes speak to the women, gesturing toward the empty tomb. The women's expressions shift from fear to wonder. Gentle camera movement capturing the exchange. Warm golden light around the angels. Atmospheric dust.",
    durationHint: 15,
    location: "tomb-exterior-angels-women",
    referenceImageUrl: EASTER_ASSETS.angelSpeaks,
  },
  {
    sceneNumber: 6,
    scriptSlice: `So we ran. We ran with fear and with great joy. Can you hold both at once? I am telling you — you can. Your hands tremble and your heart sings and you cannot tell where the terror ends and the wonder begins. And then — He was there. On the road. Alive. He said one word to us. Greetings. And we fell at His feet. We held Him. He was real. He was warm. He was breathing. And He said, Do not be afraid. Go and tell my brothers to go to Galilee. There they will see me.`,
    emotion: "joy",
    imagePrompt: "Jesus in white robes standing before a kneeling woman near the tomb at golden sunrise, warm light, open-armed greeting",
    motionPrompt:
      "Jesus stands in warm golden sunrise light, arms slightly open. A woman kneels at His feet, overjoyed. Camera slowly pulls back to reveal the sunrise behind them. Warm lens flare. Gentle wind moves their robes. Hopeful, joyful atmosphere.",
    durationHint: 35,
    location: "tomb-jesus-appears",
    referenceImageUrl: EASTER_ASSETS.jesusAppears,
    preRenderedVideoUrl: EASTER_ASSETS.jesusRisenVideo,
  },
  {
    sceneNumber: 7,
    scriptSlice: `I am telling you this because I was there. I touched the ground where His body had lain. I saw the linens folded. I heard the angel speak. I held His feet on the road and felt life where death had been. The tomb is still open. The stone is still rolled away. And the One who said He would rise — rose. Death could not hold Him. The grave could not keep Him. And if He is alive — then everything He promised is true.`,
    emotion: "conviction",
    imagePrompt: "A woman running joyfully along a sunlit stone path through olive trees, sandals on ancient stones, golden morning light",
    motionPrompt:
      "A woman runs joyfully along a sunlit stone path. Golden morning light streams through olive branches. Her dark robes flow behind her. Camera tracks alongside her. Warm, radiant atmosphere. Fast-paced joy.",
    durationHint: 30,
    location: "path-running-joy",
    referenceImageUrl: EASTER_ASSETS.maryRunning,
  },
  {
    sceneNumber: 8,
    scriptSlice: `He is risen. He is risen indeed.`,
    emotion: "triumph",
    imagePrompt: "Panoramic sunrise over ancient Jerusalem with the temple, golden light flooding across the city, expansive hopeful composition",
    motionPrompt:
      "Majestic wide panoramic view of sunrise over ancient Jerusalem. Golden light floods across the city and temple mount. Camera slowly rises upward as light intensifies. Warm lens flare. Triumphant, peaceful close.",
    durationHint: 10,
    location: "jerusalem-sunrise",
    referenceImageUrl: EASTER_ASSETS.jerusalemSunrise,
  },
];

function buildVoiceSegments(): VoiceSegment[] {
  return SCENES.map((scene) => ({
    text: scene.scriptSlice.trim(),
    voiceId: ELEVENLABS_VOICES.bill,
    label: `scene-${scene.sceneNumber}-narrator (Bill)`,
    pauseAfterSec: scene.sceneNumber === 8 ? 2.0 : 0.6,
    voiceSettings: { stability: 0.75, similarity_boost: 0.6 },
  }));
}

export async function generateEasterEpisode6(): Promise<string> {
  console.log(
    `\n[easter-ep6] ===== LAUNCHING EASTER EPISODE: He Is Risen =====`
  );
  console.log(`[easter-ep6] Episode ID: ${EPISODE_ID}`);
  console.log(`[easter-ep6] Voice: Bill (narrator) — stability 0.75`);
  console.log(`[easter-ep6] Music: ${MUSIC_TRACK}`);
  console.log(`[easter-ep6] Scenes: ${SCENES.length}`);
  console.log(`[easter-ep6] Scripture: Matthew 28:1-10`);
  console.log(`[easter-ep6] Pre-made anchor images: ${Object.keys(EASTER_ASSETS).length}`);
  console.log(`[easter-ep6] Image generation will be SKIPPED (using your custom images)`);

  console.log(`\n[easter-ep6] Step 1: Generating multi-voice narration...`);
  const voiceSegments = buildVoiceSegments();
  const voiceoverUrl = await generateMultiVoiceNarration(
    voiceSegments,
    EPISODE_ID
  );
  console.log(`[easter-ep6] Voiceover ready: ${voiceoverUrl.substring(0, 80)}...`);

  const fullScript = SCENES
    .map((s) => s.scriptSlice.trim())
    .join("\n\n");

  const episodeConfig: EpisodeGenerationConfig = {
    episodeId: EPISODE_ID,
    script: fullScript,
    voiceId: ELEVENLABS_VOICES.bill,
    musicTrack: MUSIC_TRACK,
    scenes: SCENES,
    scriptureAnchor: "Matthew 28:1-10",
    episodeTitle: "He Is Risen",
    cachedVoiceoverUrl: voiceoverUrl,
  };

  console.log(`\n[easter-ep6] Step 2: Launching pipeline (image gen skipped, video gen + assembly)...`);
  return runBiblicalEpisodePipeline(episodeConfig);
}

export { EPISODE_ID as EASTER_EPISODE_ID };
