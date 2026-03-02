import React, { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";

interface ShareCardProps {
  verseReference: string;
  verseText: string;
  insightLabel?: string;
  insightText?: string;
  originalWord?: string;
  transliteration?: string;
}

function ShareCardContent({
  verseReference,
  verseText,
  insightLabel,
  insightText,
  originalWord,
  transliteration,
}: ShareCardProps) {
  return (
    <View style={cs.card}>
      <View style={cs.accentBar} />
      <View style={cs.inner}>
        <Text style={cs.verseText}>"{verseText}"</Text>
        <Text style={cs.verseRef}>{verseReference}</Text>

        {insightText && (
          <View style={cs.insightBlock}>
            <View style={cs.insightDivider} />
            {originalWord && (
              <View style={cs.wordRow}>
                <Text style={cs.originalWord}>{originalWord}</Text>
                {transliteration && (
                  <Text style={cs.transliteration}>({transliteration})</Text>
                )}
              </View>
            )}
            <Text style={cs.insightLabel}>{insightLabel || "Word Study"}</Text>
            <Text style={cs.insightContent}>{insightText}</Text>
          </View>
        )}

        <View style={cs.watermark}>
          <View style={cs.watermarkDot} />
          <Text style={cs.watermarkText}>Grace through Faith</Text>
        </View>
      </View>
    </View>
  );
}

export function useShareInsight() {
  const viewShotRef = useRef<ViewShot>(null);
  const [shareData, setShareData] = useState<ShareCardProps | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const triggerShare = useCallback(
    async (data: ShareCardProps) => {
      setShareData(data);
      setIsSharing(true);
      setTimeout(async () => {
        try {
          if (Platform.OS === "web") {
            const text = `"${data.verseText}"\n\n${data.verseReference}${
              data.insightText ? `\n\n${data.insightLabel || "Word Study"}: ${data.insightText}` : ""
            }\n\nShared via Grace through Faith`;

            if (typeof navigator !== "undefined" && navigator.share) {
              await navigator.share({ text });
            } else if (typeof navigator !== "undefined" && navigator.clipboard) {
              await navigator.clipboard.writeText(text);
            }
            setShareData(null);
            setIsSharing(false);
            return;
          }

          if (!viewShotRef.current?.capture) {
            setShareData(null);
            setIsSharing(false);
            return;
          }

          const uri = await viewShotRef.current.capture();
          const fileUri = FileSystem.cacheDirectory + "share-card.png";
          await FileSystem.copyAsync({ from: uri, to: fileUri });
          await Sharing.shareAsync(fileUri, {
            mimeType: "image/png",
            dialogTitle: "Share Insight",
          });
        } catch (e) {
          console.log("Share cancelled or error:", e);
        } finally {
          setShareData(null);
          setIsSharing(false);
        }
      }, 300);
    },
    []
  );

  const ShareCardRenderer = shareData ? (
    <View style={cs.offscreen} pointerEvents="none">
      <ViewShot
        ref={viewShotRef}
        options={{ format: "png", quality: 1, result: "tmpfile" }}
        style={cs.shotWrap}
      >
        <ShareCardContent {...shareData} />
      </ViewShot>
    </View>
  ) : null;

  return { triggerShare, ShareCardRenderer, isSharing };
}

export function ShareInsightButton({
  onPress,
  isSharing,
  label,
  compact,
  theme,
}: {
  onPress: () => void;
  isSharing: boolean;
  label?: string;
  compact?: boolean;
  theme: any;
}) {
  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        disabled={isSharing}
        style={({ pressed }) => [
          bs.compactBtn,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        testID="share-insight-btn"
      >
        {isSharing ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          <Ionicons name="share-social-outline" size={20} color={theme.text} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isSharing}
      style={({ pressed }) => [
        bs.fullBtn,
        { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.8 : 1 },
      ]}
      testID="share-insight-btn"
    >
      {isSharing ? (
        <ActivityIndicator size="small" color={theme.accent} />
      ) : (
        <Ionicons name="share-social-outline" size={16} color={theme.accent} />
      )}
      <Text style={[bs.fullBtnText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
        {label || "Share Insight"}
      </Text>
    </Pressable>
  );
}

const cs = StyleSheet.create({
  offscreen: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 1,
  },
  shotWrap: {
    width: 360,
  },
  card: {
    width: 360,
    backgroundColor: "#0a0a0f",
    borderRadius: 20,
    overflow: "hidden",
  },
  accentBar: {
    height: 4,
    backgroundColor: "#C9933A",
  },
  inner: {
    padding: 28,
    paddingTop: 24,
  },
  verseText: {
    fontFamily: "Lora_400Regular",
    fontSize: 20,
    lineHeight: 32,
    color: "#F0EBE0",
    marginBottom: 12,
  },
  verseRef: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#C9933A",
    marginBottom: 16,
  },
  insightBlock: {
    marginBottom: 20,
  },
  insightDivider: {
    height: 1,
    backgroundColor: "rgba(201,147,58,0.2)",
    marginBottom: 16,
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 6,
  },
  originalWord: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    color: "#C9933A",
  },
  transliteration: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#9A8E7A",
  },
  insightLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#5C5549",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  insightContent: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: "#9A8E7A",
  },
  watermark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  watermarkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9933A",
  },
  watermarkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#5C5549",
    letterSpacing: 0.5,
  },
});

const bs = StyleSheet.create({
  compactBtn: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  fullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 8,
  },
  fullBtnText: {
    fontSize: 14,
  },
});
