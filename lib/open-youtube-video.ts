import { Alert, Linking } from "react-native";

const YOUTUBE_OPEN_FALLBACK =
  "YouTube couldn’t open right now. You can try again in a moment.";

export async function openYouTubeVideo(youtubeId: string): Promise<boolean> {
  try {
    await Linking.openURL(`https://www.youtube.com/watch?v=${youtubeId}`);
    return true;
  } catch {
    Alert.alert("Video unavailable", YOUTUBE_OPEN_FALLBACK);
    return false;
  }
}