import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  Share,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { useQuery } from "@tanstack/react-query";

const GOLD = "#C9933A";
const SIGNPOST_COLORS: Record<string, string> = {
  "abandonment": "#0D7377",
  "addiction": "#8B2635",
  "anger": "#C4622D",
  "anxiety": "#4A6FA5",
  "forgiveness": "#2D6A4F",
  "grief": "#6B2D8B",
  "depression": "#1A3A5C",
  "loneliness": "#5C4033",
  "fear": "#7B3F00",
  "identity": "#1B4332",
  "purpose": "#744210",
  "relationships": "#6B2737",
  "stress": "#4A4E69",
  "doubt": "#2C3E50",
  "hope": "#1A5276",
};

interface VotdHeroCardProps {
  verse: { text: string; reference: string };
  bgImage?: string;
  bookImage?: ImageSourcePropType | null;
  onPress?: () => void;
  userId?: string;
  verseId?: string;
  bookId?: number;
  chapterNumber?: number;
  signpost?: {
    title: string;
    excerpt: string;
    id?: string;
    questions?: Array<{
      question: string;
      verses: Array<{ ref: string; text: string }>;
      commentary?: string;
    }>;
  } | null;
  reflection?: {
    thought: string;
    source: string;
  } | null;
}

function showAuthGate() {
  Alert.alert(
    "Sign In Required",
    "Create a free account to save verses and reflect on God\u2019s Word.",
    [
      { text: "Not Now", style: "cancel" },
      { text: "Sign In", onPress: () => router.push("/(auth)/login") },
    ],
  );
}

export default function VotdHeroCard({
  verse, bgImage, bookImage, onPress,
  userId, verseId, bookId, chapterNumber,
  signpost, reflection,
}: VotdHeroCardProps) {
  const imageSource = bookImage || (bgImage ? { uri: bgImage } : undefined);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"verse" | "signpost" | "reflection">("verse");
  const [showSignpostSheet, setShowSignpostSheet] = useState(false);
  const [showReflect, setShowReflect] = useState(false);
  const [reflectText, setReflectText] = useState("");
  const [reflectSaved, setReflectSaved] = useState(false);

  const handleLike = async () => {
    const isGuest = !userId || userId.startsWith("device-");
    if (isGuest) return showAuthGate();
    try {
      await apiRequest("POST", "/api/bookmarks", {
        verseId: verse.reference,
        label: "Verse of the Day",
      });
      setSaved((prev) => !prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setSaved((prev) => !prev);
    }
  };

  const handleReflect = () => {
    if (!userId) return showAuthGate();
    setShowReflect(true);
  };

  const submitReflection = async () => {
    console.log("submitReflection called, text:", reflectText.trim());
    if (!reflectText.trim()) {
      console.log("empty text, returning");
      return;
    }
    try {
      console.log("calling API...");
      await apiRequest("POST", "/api/prayers", {
        title: `Reflection on ${verse.reference}`,
        content: reflectText,
        category: "personal",
      });
      console.log("API success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log("API error:", e);
    }
    setShowReflect(false);
    setReflectText("");
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `\u201C${verse.text}\u201D\n\u2014 ${verse.reference}` });
    } catch {}
  };

  const handleMore = () => {
    const options = ["Read Full Chapter", "Copy Verse", "Cancel"];
    const cancelIndex = 2;

    const actions: Record<number, () => void> = {
      0: () => {
        if (bookId && chapterNumber) {
          router.push(`/read/${bookId}/${chapterNumber}` as any);
        }
      },
      1: async () => {
        await Clipboard.setStringAsync(`\u201C${verse.text}\u201D\n\u2014 ${verse.reference}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    };

    if (Platform.OS === "ios") {
      const { ActionSheetIOS } = require("react-native");
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (idx: number) => actions[idx]?.(),
      );
    } else {
      Alert.alert("More", undefined, [
        { text: "Read Full Chapter", onPress: actions[0] },
        { text: "Copy Verse", onPress: actions[1] },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <>
      <Pressable onPress={onPress} testID="verse-of-day" style={({ pressed }) => [s.wrapper, pressed && { opacity: 0.95 }]}>
        <ImageBackground source={imageSource} style={s.imageBg} imageStyle={s.imageStyle} resizeMode="cover">
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.65)"]}
            locations={[0, 0.5, 1]}
            style={s.overlay}
          >
            {/* Tab Switcher */}
            <View style={s.tabRow}>
              <Pressable
                onPress={() => setActiveTab("verse")}
                style={[s.tab, activeTab === "verse" && s.tabActive]}
              >
                <Ionicons name="book-outline" size={12} color={activeTab === "verse" ? "#050507" : "rgba(255,255,255,0.7)"} />
                <Text style={[s.tabText, { fontFamily: "Inter_600SemiBold" }, activeTab === "verse" && s.tabTextActive]}>
                  VERSE
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("signpost")}
                style={[s.tab, activeTab === "signpost" && s.tabActive]}
              >
                <Ionicons name="compass-outline" size={12} color={activeTab === "signpost" ? "#050507" : "rgba(255,255,255,0.7)"} />
                <Text style={[s.tabText, { fontFamily: "Inter_600SemiBold" }, activeTab === "signpost" && s.tabTextActive]}>
                  SIGNPOST
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("reflection")}
                style={[s.tab, activeTab === "reflection" && s.tabActive]}
              >
                <Ionicons name="sunny-outline" size={12} color={activeTab === "reflection" ? "#050507" : "rgba(255,255,255,0.7)"} />
                <Text style={[s.tabText, { fontFamily: "Inter_600SemiBold" }, activeTab === "reflection" && s.tabTextActive]}>
                  REFLECTION
                </Text>
              </Pressable>
            </View>

            {/* VERSE TAB */}
            {activeTab === "verse" && (
              <>
                <Text style={[s.label, { fontFamily: "Inter_600SemiBold" }]}>VERSE OF THE DAY</Text>
                <Text style={[s.reference, { fontFamily: "Lora_600SemiBold" }]}>{verse.reference}</Text>
                <Text numberOfLines={4} ellipsizeMode="tail" style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
                  {verse.text}
                </Text>
                <View style={s.engagementRow}>
                  <Pressable onPress={handleLike} style={s.engageItem}>
                    <Ionicons name={saved ? "heart" : "heart-outline"} size={18} color={saved ? GOLD : "rgba(255,255,255,0.8)"} />
                    <Text style={[s.engageLabel, { fontFamily: "Inter_400Regular" }]}>Like</Text>
                  </Pressable>
                  <Pressable onPress={handleReflect} style={s.engageItem}>
                    <Ionicons name="chatbubble-outline" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={[s.engageLabel, { fontFamily: "Inter_400Regular" }]}>Reflect</Text>
                  </Pressable>
                  <Pressable onPress={handleShare} style={s.engageItem}>
                    <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={[s.engageLabel, { fontFamily: "Inter_400Regular" }]}>Share</Text>
                  </Pressable>
                  <Pressable onPress={handleMore} style={s.engageItem}>
                    <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={[s.engageLabel, { fontFamily: "Inter_400Regular" }]}>More</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* SIGNPOST TAB */}
            {activeTab === "signpost" && signpost && (
              <>
                <Text style={[s.label, { fontFamily: "Inter_600SemiBold" }]}>SIGNPOST OF THE DAY</Text>
                <Text style={[s.reference, { fontFamily: "Lora_600SemiBold" }]}>{signpost.title}</Text>
                <Text numberOfLines={4} ellipsizeMode="tail" style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
                  {signpost.excerpt}
                </Text>
                <Pressable
                  onPress={() => setShowSignpostSheet(true)}
                  style={s.ctaButton}
                >
                  <Text style={[s.ctaText, { fontFamily: "Inter_600SemiBold" }]}>Explore Topic →</Text>
                </Pressable>
              </>
            )}
            {activeTab === "signpost" && !signpost && (
              <>
                <Text style={[s.label, { fontFamily: "Inter_600SemiBold" }]}>SIGNPOST OF THE DAY</Text>
                <Text style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
                  What does the Bible say about life's toughest questions?
                </Text>
                <Pressable
                  onPress={() => router.push("/touchpoints" as any)}
                  style={s.ctaButton}
                >
                  <Text style={[s.ctaText, { fontFamily: "Inter_600SemiBold" }]}>Explore Signposts →</Text>
                </Pressable>
              </>
            )}

            {/* REFLECTION TAB */}
            {activeTab === "reflection" && reflection && (
              <>
                <Text style={[s.label, { fontFamily: "Inter_600SemiBold" }]}>DAILY REFLECTION</Text>
                <Text numberOfLines={5} ellipsizeMode="tail" style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
                  "{reflection.thought}"
                </Text>
                <Text style={[s.reference, { fontFamily: "Lora_600SemiBold" }]}>{reflection.source}</Text>
              </>
            )}
            {activeTab === "reflection" && !reflection && (
              <>
                <Text style={[s.label, { fontFamily: "Inter_600SemiBold" }]}>DAILY REFLECTION</Text>
                <Text style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
                  Take a moment to be still and know that He is God.
                </Text>
              </>
            )}
          </LinearGradient>
        </ImageBackground>
      </Pressable>

      <Modal visible={showReflect} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setShowReflect(false)}>
            <Pressable style={s.modalSheet} onPress={() => {}}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={[s.modalRef, { fontFamily: "Lora_600SemiBold" }]}>{verse.reference}</Text>
                <Text style={[s.modalVerse, { fontFamily: "Lora_400Regular_Italic" }]} numberOfLines={3}>
                  {`\u201C${verse.text}\u201D`}
                </Text>
                {reflectSaved ? (
                  <View style={s.modalSuccess}>
                    <Ionicons name="checkmark-circle" size={28} color={GOLD} />
                    <Text style={[s.modalSuccessText, { fontFamily: "Inter_500Medium" }]}>
                      Reflection saved to your Prayer Journal
                    </Text>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={[s.modalInput, { fontFamily: "Inter_400Regular" }]}
                      placeholder="What is God saying to you through this verse?"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      multiline
                      value={reflectText}
                      onChangeText={setReflectText}
                      autoFocus
                    />
                    <View style={s.modalButtons}>
                      <Pressable onPress={() => { setShowReflect(false); setReflectText(""); }} style={s.modalCancel}>
                        <Text style={[s.modalCancelText, { fontFamily: "Inter_500Medium" }]}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={submitReflection} style={[s.modalSave, { opacity: reflectText.trim() ? 1 : 0.4 }]}>
                        <Text style={[s.modalSaveText, { fontFamily: "Inter_600SemiBold" }]}>Save</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Signpost Bottom Sheet */}
      <Modal
        visible={showSignpostSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSignpostSheet(false)}
      >
        <View style={s.sheetBackdrop}>
          <Pressable 
            style={s.sheetDismissArea}
            onPress={() => setShowSignpostSheet(false)}
          />
          <View style={s.sheetContainer}>
            {/* Header with topic color */}
            <View style={[s.sheetHeader, {
              backgroundColor: signpost?.id ?
                SIGNPOST_COLORS[signpost.id] || "#4A6FA5" : "#4A6FA5"
            }]}>
              <View style={s.sheetHandleBar} />
              <Text style={[s.sheetTopicLabel, { fontFamily: "Inter_600SemiBold" }]}>
                SIGNPOST OF THE DAY
              </Text>
              <Text style={[s.sheetTopicTitle, { fontFamily: "Lora_700Bold" }]}>
                {signpost?.title}
              </Text>
            </View>

            {/* Scripture content */}
            <ScrollView
              style={s.sheetScroll}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              bounces={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={[s.sheetOverview, { fontFamily: "Inter_400Regular" }]}>
                {signpost?.excerpt}
              </Text>

              {signpost?.questions?.map((q: any, idx: number) => (
                <View key={idx} style={s.sheetQuestion}>
                  <Text style={[s.sheetQuestionText, { fontFamily: "Inter_600SemiBold" }]}>
                    {q.question}
                  </Text>
                  {q.verses?.map((v: any, vi: number) => (
                    <View key={vi} style={s.sheetVerse}>
                      <Text style={[s.sheetVerseRef, { fontFamily: "Lora_600SemiBold" }]}>
                        {v.ref}
                      </Text>
                      <Text style={[s.sheetVerseText, { fontFamily: "Lora_400Regular_Italic" }]}>
                        {v.text}
                      </Text>
                      {q.commentary && vi === 0 && (
                        <View style={s.sheetCommentary}>
                          <Text style={[s.sheetCommentaryText, { fontFamily: "Inter_400Regular" }]}>
                            {q.commentary}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={s.sheetFooter}>
              <Pressable
                onPress={() => {
                  setShowSignpostSheet(false);
                  if (signpost?.id) {
                    router.push(`/touchpoint-topic?topicId=${signpost.id}` as any);
                  }
                }}
                style={[s.sheetCta, {
                  backgroundColor: signpost?.id ?
                    SIGNPOST_COLORS[signpost.id] || "#4A6FA5" : "#4A6FA5"
                }]}
              >
                <Ionicons name="compass" size={16} color="#fff" />
                <Text style={[s.sheetCtaText, { fontFamily: "Inter_600SemiBold" }]}>
                  Go to {signpost?.title}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    marginTop: 12,
  },
  imageBg: {
    width: "100%",
    height: 360,
  },
  imageStyle: {
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 16,
    paddingTop: 20,
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  reference: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 6,
  },
  verseText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 30,
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  engagementRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 10,
  },
  engageItem: {
    alignItems: "center",
    gap: 2,
  },
  engageLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 24,
  },
  modalSheet: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 24,
  },
  modalRef: {
    color: GOLD,
    fontSize: 14,
    marginBottom: 4,
  },
  modalVerse: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInput: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  modalSave: {
    backgroundColor: GOLD,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalSaveText: {
    color: "#fff",
    fontSize: 14,
  },
  modalSuccess: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  modalSuccessText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  tabActive: {
    backgroundColor: "#C9933A",
    borderColor: "#C9933A",
  },
  tabText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  tabTextActive: {
    color: "#050507",
  },
  ctaButton: {
    backgroundColor: "rgba(201,147,58,0.2)",
    borderWidth: 1,
    borderColor: "#C9933A",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  ctaText: {
    color: "#C9933A",
    fontSize: 13,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetDismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#0A0A0F",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  sheetHeader: {
    padding: 24,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTopicLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
  },
  sheetTopicTitle: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 34,
  },
  sheetScroll: {
    paddingHorizontal: 20,
  },
  sheetOverview: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  sheetQuestion: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  sheetQuestionText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  sheetVerse: {
    marginBottom: 12,
  },
  sheetVerseRef: {
    color: "#C9933A",
    fontSize: 13,
    marginBottom: 4,
  },
  sheetVerseText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    lineHeight: 22,
  },
  sheetCommentary: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#C9933A",
  },
  sheetCommentaryText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 20,
  },
  sheetFooter: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  sheetCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sheetCtaText: {
    color: "#fff",
    fontSize: 15,
  },
});
