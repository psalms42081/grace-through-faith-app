import {
  runBiblicalEpisodePipeline,
  type EpisodeGenerationConfig,
} from "./services/biblicalEpisodePipeline";
import { ELEVENLABS_VOICES } from "./elevenlabs-tts";
import {
  generateMultiVoiceNarration,
  type VoiceSegment,
} from "./services/cinematicVoiceoverService";

const EPISODE_ID = "rev12-dragon-v8";
const MUSIC_TRACK = "cinematic-ambient-emotional.mp3";

const REV12_ASSETS = {
  womanSerene: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774922103/grace-through-faith/rev12-assets/character-refs/woman-sun-serene.jpg",
  womanLabor: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774922103/grace-through-faith/rev12-assets/character-refs/woman-sun-labor.jpg",
  michaelVsDragonAnchor: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774923090/grace-through-faith/rev12-assets/michael-vs-dragon-anchor.jpg",
  womanSunVideo: "https://res.cloudinary.com/dy77gwpzu/video/upload/v1774922103/grace-through-faith/rev12-assets/woman-sun-video.mp4",
  dragonStyleA: "https://res.cloudinary.com/dy77gwpzu/video/upload/v1774921276/grace-through-faith/rev12-assets/dragon-style-A.mp4",
  michaelVsDragonVideo: "https://res.cloudinary.com/dy77gwpzu/video/upload/v1774923092/grace-through-faith/rev12-assets/michael-vs-dragon-video.mp4",
};

const NARRATION_SCRIPT = `Now a great sign appeared in heaven: a woman clothed with the sun, with the moon under her feet, and on her head a garland of twelve stars. Then being with child, she cried out in labor and in pain to give birth.

And another sign appeared in heaven: behold, a great, fiery red dragon having seven heads and ten horns, and seven diadems on his heads. His tail drew a third of the stars of heaven and threw them to the earth.

And the dragon stood before the woman who was ready to give birth, to devour her Child as soon as it was born.

She bore a male Child who was to rule all nations with a rod of iron. And her Child was caught up to God and His throne. Then the woman fled into the wilderness, where she has a place prepared by God, that they should feed her there one thousand two hundred and sixty days.

And war broke out in heaven: Michael and his angels fought with the dragon; and the dragon and his angels fought, but they did not prevail, nor was a place found for them in heaven any longer.

So the great dragon was cast out, that serpent of old, called the Devil and Satan, who deceives the whole world; he was cast to the earth, and his angels were cast out with him.

Then I heard a loud voice saying in heaven, Now salvation, and strength, and the kingdom of our God, and the power of His Christ have come, for the accuser of our brethren, who accused them before our God day and night, has been cast down. And they overcame him by the blood of the Lamb and by the word of their testimony, and they did not love their lives to the death.

Therefore rejoice, O heavens, and you who dwell in them! Woe to the inhabitants of the earth and the sea! For the devil has come down to you, having great wrath, because he knows that he has a short time.`;

const SCENES: EpisodeGenerationConfig["scenes"] = [
  {
    sceneNumber: 1,
    scriptSlice: `Now a great sign appeared in heaven: a woman clothed with the sun, with the moon under her feet, and on her head a garland of twelve stars. Then being with child, she cried out in labor and in pain to give birth.`,
    emotion: "wonder",
    imagePrompt: "A radiant pregnant woman clothed in golden-white supernatural light, standing on a crescent moon with twelve stars crowning her head, dark hair, olive skin, heavenly cosmic background, 9:16 vertical",
    motionPrompt: "Extremely slow camera pull-back revealing the celestial woman in full glory. Stars shimmer around her crown. Golden light pulses gently. Cosmic atmosphere. Majestic stillness.",
    durationHint: 20,
    location: "heavenly-sign",
    referenceImageUrl: REV12_ASSETS.womanSerene,
    characterReferenceUrls: [REV12_ASSETS.womanSerene],
    preRenderedVideoUrl: REV12_ASSETS.womanSunVideo,
  },
  {
    sceneNumber: 2,
    scriptSlice: `And another sign appeared in heaven: behold, a great, fiery red dragon having seven heads and ten horns, and seven diadems on his heads. His tail drew a third of the stars of heaven and threw them to the earth.`,
    emotion: "dread",
    imagePrompt: "A massive seven-headed crimson dragon with ten horns and seven crowns, serpentine red scales, bat-like wings spread wide, its enormous tail sweeping stars from the sky, dark stormy heavens, 9:16 vertical",
    motionPrompt: "The great red dragon rises with seven crowned heads snarling. Its massive tail sweeps across the stars. Dark clouds churn. Lightning flashes. Terrifying cosmic scale. Cinematic dread.",
    durationHint: 20,
    location: "dragon-appears",
    preRenderedVideoUrl: REV12_ASSETS.dragonStyleA,
  },
  {
    sceneNumber: 3,
    scriptSlice: `And the dragon stood before the woman who was ready to give birth, to devour her Child as soon as it was born.`,
    emotion: "tension",
    imagePrompt: "A radiant pregnant woman in glowing white robes, dark hair, olive skin, crown of twelve stars, standing defiantly on a crescent moon while a massive seven-headed red dragon looms menacingly behind her, ancient Near Eastern rocky landscape, dramatic stormy sky, cinematic lighting, 9:16 vertical",
    motionPrompt: "The dragon positions itself before the radiant woman. Tension builds. Camera slowly pushes in on the confrontation. Dark crimson energy around the dragon contrasts with the woman's golden light. Atmospheric dread.",
    durationHint: 12,
    location: "dragon-before-woman",
    characterReferenceUrls: [REV12_ASSETS.womanSerene],
  },
  {
    sceneNumber: 4,
    scriptSlice: `She bore a male Child who was to rule all nations with a rod of iron. And her Child was caught up to God and His throne. Then the woman fled into the wilderness, where she has a place prepared by God, that they should feed her there one thousand two hundred and sixty days.`,
    emotion: "urgency",
    imagePrompt: "A woman with dark hair and olive skin in flowing white robes glowing with golden light, fleeing through a vast rocky desert wilderness, looking back over her shoulder with urgency and determination, twelve stars trailing behind her, ancient Near Eastern landscape, dramatic sunset lighting, dust in the air, cinematic, 9:16 vertical",
    motionPrompt: "The woman flees into a vast rocky wilderness. Camera tracks alongside her urgent flight. Her white robes billow with golden light. Desert dust swirls. Dramatic sunset backlighting. Urgent cinematic pace.",
    durationHint: 25,
    location: "wilderness-flight",
    characterReferenceUrls: [REV12_ASSETS.womanSerene],
  },
  {
    sceneNumber: 5,
    scriptSlice: `And war broke out in heaven: Michael and his angels fought with the dragon; and the dragon and his angels fought, but they did not prevail, nor was a place found for them in heaven any longer.`,
    emotion: "epic",
    imagePrompt: "The archangel Michael in blazing golden armor with massive white wings leads an army of angels with swords of light against a massive seven-headed red dragon and dark fallen angels, heaven split between golden radiance and dark crimson clouds, epic cosmic battle, cinematic dramatic lighting, 9:16 vertical",
    motionPrompt: "Epic cosmic battle erupts. Michael charges with sword of light. Angels clash with dark forces. Explosions of divine radiance. The dragon's seven heads roar. Heaven itself shakes. Cinematic epic action.",
    durationHint: 20,
    location: "heavenly-battle",
    referenceImageUrl: REV12_ASSETS.michaelVsDragonAnchor,
    preRenderedVideoUrl: REV12_ASSETS.michaelVsDragonVideo,
  },
  {
    sceneNumber: 6,
    scriptSlice: `So the great dragon was cast out, that serpent of old, called the Devil and Satan, who deceives the whole world; he was cast to the earth, and his angels were cast out with him.`,
    emotion: "defeat",
    imagePrompt: "A massive seven-headed red dragon plummeting from the heavens toward earth, its dark fallen angels tumbling around it, trails of dark fire and smoke, the bright heavens above closing shut with golden light, earth below, cosmic scale, 9:16 vertical",
    motionPrompt: "The great dragon crashes downward from heaven toward earth. Dark angels tumble around it. Trails of fire and smoke. The golden heavens above seal shut with brilliant light. Dramatic fall. Cinematic descent.",
    durationHint: 15,
    location: "dragon-cast-down",
  },
  {
    sceneNumber: 7,
    scriptSlice: `Then I heard a loud voice saying in heaven, Now salvation, and strength, and the kingdom of our God, and the power of His Christ have come, for the accuser of our brethren, who accused them before our God day and night, has been cast down. And they overcame him by the blood of the Lamb and by the word of their testimony, and they did not love their lives to the death.`,
    emotion: "triumph",
    imagePrompt: "A brilliant golden throne room in heaven, angels in white robes raising their hands in victory and worship, radiant divine light filling the space, golden pillars and clouds, a victorious atmosphere of celebration, 9:16 vertical",
    motionPrompt: "A triumphant voice echoes through the golden heavenly throne room. Angels raise hands in worship and victory. Brilliant divine light intensifies. Golden atmosphere. Slow majestic camera pull-back revealing the grandeur. Cinematic triumph.",
    durationHint: 30,
    location: "heavenly-throne-victory",
  },
  {
    sceneNumber: 8,
    scriptSlice: `Therefore rejoice, O heavens, and you who dwell in them! Woe to the inhabitants of the earth and the sea! For the devil has come down to you, having great wrath, because he knows that he has a short time.`,
    emotion: "warning",
    imagePrompt: "A dramatic split view: the upper half shows radiant golden heavens with angels rejoicing, the lower half shows a dark stormy earth with the shadow of a great dragon falling upon it, cosmic contrast between light and darkness, 9:16 vertical",
    motionPrompt: "The heavens above radiate with joyous golden light while below the earth darkens under the dragon's shadow. Slow dramatic camera tilt from light to dark. Contrast between triumph and warning. Cinematic weight. Final gravity.",
    durationHint: 15,
    location: "heaven-earth-contrast",
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

export async function generateRev12V8(): Promise<string> {
  console.log(
    `\n[rev12-v8] ===== LAUNCHING REV 12 v8: The Woman and the Dragon =====`
  );
  console.log(`[rev12-v8] Episode ID: ${EPISODE_ID}`);
  console.log(`[rev12-v8] Voice: Bill (narrator) — stability 0.75`);
  console.log(`[rev12-v8] Music: ${MUSIC_TRACK}`);
  console.log(`[rev12-v8] Scenes: ${SCENES.length}`);
  console.log(`[rev12-v8] Scripture: Revelation 12:1-12 (NKJV)`);
  console.log(`[rev12-v8] Pre-rendered videos: 3 (scenes 1, 2, 5)`);
  console.log(`[rev12-v8] Character refs: woman-sun-serene (scenes 1, 3, 4)`);
  console.log(`[rev12-v8] Number normalization: ACTIVE`);

  console.log(`\n[rev12-v8] Step 1: Generating multi-voice narration (with number fix)...`);
  const voiceSegments = buildVoiceSegments();
  const voiceoverUrl = await generateMultiVoiceNarration(
    voiceSegments,
    EPISODE_ID
  );
  console.log(`[rev12-v8] Voiceover ready: ${voiceoverUrl.substring(0, 80)}...`);

  const fullScript = SCENES
    .map((s) => s.scriptSlice.trim())
    .join("\n\n");

  const episodeConfig: EpisodeGenerationConfig = {
    episodeId: EPISODE_ID,
    script: fullScript,
    voiceId: ELEVENLABS_VOICES.bill,
    musicTrack: MUSIC_TRACK,
    scenes: SCENES,
    scriptureAnchor: "Revelation 12:1-12",
    episodeTitle: "The Woman and the Dragon",
    cachedVoiceoverUrl: voiceoverUrl,
  };

  console.log(`\n[rev12-v8] Step 2: Launching pipeline...`);
  console.log(`[rev12-v8] Scenes 1,2,5 → pre-rendered videos (skip Runway)`);
  console.log(`[rev12-v8] Scenes 3,4 → Runway with woman character ref`);
  console.log(`[rev12-v8] Scenes 6,7,8 → Runway fresh generation`);
  return runBiblicalEpisodePipeline(episodeConfig);
}

export { EPISODE_ID as REV12_V8_EPISODE_ID };
