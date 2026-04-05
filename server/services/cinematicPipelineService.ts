import { db } from "../db";
import { videoTopics, videoAvatars } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { generateEditDecisionList, type EDLSegment } from "./editDecisionListService";
import { extractTimestamps } from "./whisperService";
import { generateBrollImage, generateBrollVideo } from "./runwayService";
import { assembleVideo } from "./assemblyService";

const CLOUDINARY_CLOUD_NAME = "dy77gwpzu";
const MUSIC_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/grace-through-faith/music`;

async function updateAssemblyStatus(topicId: string, status: string) {
  await db
    .update(videoTopics)
    .set({ assemblyStatus: status, updatedAt: new Date() })
    .where(eq(videoTopics.id, topicId));
  console.log(`[cinematic-pipeline] Status → ${status} (topic=${topicId})`);
}

async function markFailed(topicId: string, stage: string, error: unknown) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const failureStatus = `failed:${stage}:${errorMsg.substring(0, 200)}`;
  await db
    .update(videoTopics)
    .set({
      assemblyStatus: failureStatus,
      reviewStatus: "failed",
      updatedAt: new Date(),
    })
    .where(eq(videoTopics.id, topicId));
  console.error(`[cinematic-pipeline] FAILED at ${stage} (topic=${topicId}):`, errorMsg);
}

export async function runCinematicPipeline(topicId: string): Promise<string> {
  console.log(`[cinematic-pipeline] Starting pipeline for topic=${topicId}`);

  const [topic] = await db
    .select()
    .from(videoTopics)
    .where(eq(videoTopics.id, topicId));

  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }

  if (!topic.generatedScript?.trim()) {
    throw new Error(`Topic "${topic.title}" has no generated script`);
  }

  if (!topic.avatarVideoUrl?.startsWith("http")) {
    throw new Error(`Topic "${topic.title}" has no completed avatar video URL`);
  }

  if (!topic.musicTrack) {
    throw new Error(`Topic "${topic.title}" has no music track assigned`);
  }

  const musicTrackUrl = `${MUSIC_BASE_URL}/${topic.musicTrack}`;

  let avatarGender = "female";
  if (topic.avatarId) {
    const [avatar] = await db
      .select()
      .from(videoAvatars)
      .where(eq(videoAvatars.id, topic.avatarId));
    if (avatar?.gender) {
      avatarGender = avatar.gender;
    }
  }
  console.log(`[cinematic-pipeline] Context: age=${topic.targetAgeGroup || "teens"}, category=${topic.category || "Faith"}, avatarGender=${avatarGender}`);

  try {
    await updateAssemblyStatus(topicId, "generating-edl");
    console.log(`[cinematic-pipeline] Stage 1: Generating Edit Decision List for "${topic.title}"...`);
    const edl = await generateEditDecisionList(topic.generatedScript, topic.title, {
      targetAgeGroup: topic.targetAgeGroup || "teens and young adults",
      category: topic.category || "Faith",
      avatarGender,
    });
    const brollSegments = edl.filter((s) => s.type === "broll");
    console.log(`[cinematic-pipeline] EDL complete: ${edl.length} segments (${brollSegments.length} B-roll)`);

    await updateAssemblyStatus(topicId, "extracting-timestamps");
    console.log(`[cinematic-pipeline] Stage 2: Extracting word timestamps with Whisper...`);
    const timestamps = await extractTimestamps(topic.avatarVideoUrl);
    console.log(`[cinematic-pipeline] Whisper complete: ${timestamps.length} word timestamps`);

    await updateAssemblyStatus(topicId, "generating-broll-images");
    console.log(`[cinematic-pipeline] Stage 3: Generating ${brollSegments.length} B-roll images in parallel...`);
    const imagePromises = brollSegments.map(async (seg, idx) => {
      console.log(`[cinematic-pipeline]   B-roll image ${idx + 1}/${brollSegments.length}: "${seg.brollPrompt!.substring(0, 60)}..."`);
      const imageUrl = await generateBrollImage(seg.brollPrompt!);
      console.log(`[cinematic-pipeline]   B-roll image ${idx + 1} complete`);
      return imageUrl;
    });
    const brollImageUrls = await Promise.all(imagePromises);

    await updateAssemblyStatus(topicId, "generating-broll-videos");
    console.log(`[cinematic-pipeline] Stage 4: Animating ${brollImageUrls.length} B-roll images into video clips...`);
    const brollVideoUrls: string[] = [];
    for (let i = 0; i < brollImageUrls.length; i++) {
      const motionPrompt = brollSegments[i].brollMotion || undefined;
      console.log(`[cinematic-pipeline]   B-roll video ${i + 1}/${brollImageUrls.length} (motion: "${(motionPrompt || "default").substring(0, 60)}")...`);
      const videoUrl = await generateBrollVideo(brollImageUrls[i], motionPrompt);
      brollVideoUrls.push(videoUrl);
      console.log(`[cinematic-pipeline]   B-roll video ${i + 1} complete`);
    }

    await updateAssemblyStatus(topicId, "assembling-video");
    console.log(`[cinematic-pipeline] Stage 5: Assembling final video...`);
    const assembledVideoUrl = await assembleVideo(
      topic.avatarVideoUrl,
      edl,
      timestamps,
      brollVideoUrls,
      musicTrackUrl,
      topic.title,
      topicId
    );
    console.log(`[cinematic-pipeline] Assembly complete: ${assembledVideoUrl}`);

    await updateAssemblyStatus(topicId, "generating-thumbnail");
    console.log(`[cinematic-pipeline] Stage 6: Generating thumbnail...`);
    const thumbnailUrl = assembledVideoUrl
      .replace("/video/upload/", "/video/upload/w_1080,h_1920,c_fill,so_3,f_jpg/")
      .replace(/\.mp4$/, ".jpg");
    console.log(`[cinematic-pipeline] Thumbnail: ${thumbnailUrl}`);

    await updateAssemblyStatus(topicId, "complete");
    await db
      .update(videoTopics)
      .set({
        assembledVideoUrl,
        thumbnailUrl,
        reviewStatus: "pending",
        assemblyStatus: "complete",
        updatedAt: new Date(),
      })
      .where(eq(videoTopics.id, topicId));

    console.log(`[cinematic-pipeline] Pipeline COMPLETE for "${topic.title}" (topic=${topicId})`);
    console.log(`[cinematic-pipeline]   Assembled video: ${assembledVideoUrl}`);
    console.log(`[cinematic-pipeline]   Thumbnail: ${thumbnailUrl}`);
    console.log(`[cinematic-pipeline]   Review status: pending`);

    return assembledVideoUrl;
  } catch (error) {
    const stage = (await db
      .select({ assemblyStatus: videoTopics.assemblyStatus })
      .from(videoTopics)
      .where(eq(videoTopics.id, topicId))
    )[0]?.assemblyStatus || "unknown";

    const currentStage = stage.startsWith("failed") ? "unknown" : stage;
    await markFailed(topicId, currentStage, error);
    throw error;
  }
}
