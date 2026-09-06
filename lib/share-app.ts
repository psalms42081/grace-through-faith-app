import { Platform, Share } from "react-native";
import { HOME_SHARE_MESSAGE, type AppShareOutcome } from "@/lib/home-share-app";

export async function shareInformedMinistries(opts?: {
  onCopied?: () => void;
}): Promise<AppShareOutcome> {
  const message = HOME_SHARE_MESSAGE;
  try {
    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ text: message });
        return "shared";
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        opts?.onCopied?.();
        return "copied";
      }
    }
    await Share.share({ message });
    return "shared";
  } catch {
    return "cancelled";
  }
}
