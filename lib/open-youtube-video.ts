import { router } from "expo-router";
import { notifyToast } from "@/contexts/ToastContext";

const YOUTUBE_OPEN_FALLBACK =
  "YouTube couldn’t open right now. You can try again in a moment.";

export async function openYouTubeVideo(youtubeId: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
    notifyToast(YOUTUBE_OPEN_FALLBACK, "error");
    return false;
  }
  try {
    router.push({
      pathname: "/sermon-player",
      params: { videoId: youtubeId },
    });
    return true;
  } catch {
    notifyToast(YOUTUBE_OPEN_FALLBACK, "error");
    return false;
  }
}
