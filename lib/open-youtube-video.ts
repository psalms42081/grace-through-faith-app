import { Alert } from "react-native";
import { router } from "expo-router";

const YOUTUBE_OPEN_FALLBACK =
  "YouTube couldn’t open right now. You can try again in a moment.";

export async function openYouTubeVideo(youtubeId: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
    Alert.alert("Video unavailable", YOUTUBE_OPEN_FALLBACK);
    return false;
  }
  try {
    router.push({
      pathname: "/sermon-player",
      params: { videoId: youtubeId },
    });
    return true;
  } catch {
    Alert.alert("Video unavailable", YOUTUBE_OPEN_FALLBACK);
    return false;
  }
}