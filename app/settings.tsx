import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Alert,
  Modal,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useProStatus } from "@/contexts/ProContext";
import { useToast } from "@/contexts/ToastContext";
import { useEllenWhite } from "@/contexts/PioneerContext";
import { PIONEERS } from "@/constants/pioneers";
import type { Pioneer } from "@/constants/pioneers";
import { queryClient, apiRequest } from "@/lib/query-client";
import { SUPPORTED_LANGUAGES, setLanguage, getSavedLanguage, useDeviceLanguage } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

const GOLD = "#C9933A";
const BG = "#0D0F1A";
const TEXT = "#F0EBE0";
const TEXT_MUTED = "rgba(240,235,224,0.45)";
const ROW_BORDER = "rgba(240,235,224,0.08)";
const CARD_BG = "rgba(255,255,255,0.04)";

const NARRATOR_VOICE_KEY = "@grace-through-faith/tts-voice";

const STORAGE_KEYS = {
  redLetters: "@gtf/setting-red-letters",
  verseNumbers: "@gtf/setting-verse-numbers",
  downloadImages: "@gtf/setting-download-images",
  fontSize: "@gtf/setting-font-size",
  curriculum: "@gtf/setting-curriculum",
};

const FONT_SIZE_OPTIONS = ["Small", "Medium", "Large"] as const;

function safeGoBack(router: any) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)/profile");
  }
}

export default function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, userId, isAuthenticated, logout } = useAuth();
  const { isPatron } = useProStatus();
  const { showToast } = useToast();
  const { selectedPioneer, selectPioneer } = useEllenWhite();
  const { t } = useTranslation();

  const [showLangPicker, setShowLangPicker] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || "en");

  // Voice pickers
  const [showNarratorPicker, setShowNarratorPicker] = useState(false);
  const [showTutorPicker, setShowTutorPicker] = useState(false);
  const [narratorVoiceKey, setNarratorVoiceKey] = useState("ellen_white");

  useEffect(() => {
    setCurrentLang(i18n.language || "en");
  }, []);

  const handleSelectLanguage = useCallback(async (code: string) => {
    setShowLangPicker(false);
    await setLanguage(code);
    setCurrentLang(code);
    showToast(t("profile.languageChanged", "Language updated"), "success");
  }, [showToast, t]);

  const handleUseDeviceLang = useCallback(async () => {
    setShowLangPicker(false);
    await useDeviceLanguage();
    setCurrentLang(i18n.language || "en");
    showToast(t("profile.languageChanged", "Language updated"), "success");
  }, [showToast, t]);

  const currentLangLabel = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.label ?? "English";

  const comingSoon = useCallback((feature: string) => {
    if (Platform.OS === "web") {
      window.alert(`${feature} will be available in a future update.`);
    } else {
      Alert.alert("Coming Soon", `${feature} will be available in a future update.`);
    }
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [redLetters, setRedLetters] = useState(true);
  const [verseNumbers, setVerseNumbers] = useState(true);
  const [downloadImages, setDownloadImages] = useState(false);
  const [fontSize, setFontSize] = useState<typeof FONT_SIZE_OPTIONS[number]>("Medium");
  const [preferredCurriculum, setPreferredCurriculum] = useState<"adult" | "inverse">("adult");

  React.useEffect(() => {
    (async () => {
      const [rl, vn, di, fs, nv, curriculum] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.redLetters),
        AsyncStorage.getItem(STORAGE_KEYS.verseNumbers),
        AsyncStorage.getItem(STORAGE_KEYS.downloadImages),
        AsyncStorage.getItem(STORAGE_KEYS.fontSize),
        AsyncStorage.getItem(NARRATOR_VOICE_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.curriculum),
      ]);
      if (rl !== null) setRedLetters(rl === "true");
      if (vn !== null) setVerseNumbers(vn === "true");
      if (di !== null) setDownloadImages(di === "true");
      if (fs !== null && FONT_SIZE_OPTIONS.includes(fs as any)) setFontSize(fs as any);
      if (nv && PIONEERS.some((p) => p.voiceKey === nv)) setNarratorVoiceKey(nv);
      if (curriculum === "adult" || curriculum === "inverse") setPreferredCurriculum(curriculum);
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/user/preferences");
        const data = await (res as any).json();
        const pref = data?.preferredCurriculum === "inverse" ? "inverse" : "adult";
        setPreferredCurriculum(pref);
        await AsyncStorage.setItem(STORAGE_KEYS.curriculum, pref);
      } catch {}
    })();
  }, [isAuthenticated]);

  const toggleRedLetters = useCallback(async (val: boolean) => {
    setRedLetters(val);
    await AsyncStorage.setItem(STORAGE_KEYS.redLetters, String(val));
  }, []);

  const toggleVerseNumbers = useCallback(async (val: boolean) => {
    setVerseNumbers(val);
    await AsyncStorage.setItem(STORAGE_KEYS.verseNumbers, String(val));
  }, []);

  const toggleDownloadImages = useCallback(async (val: boolean) => {
    setDownloadImages(val);
    await AsyncStorage.setItem(STORAGE_KEYS.downloadImages, String(val));
  }, []);

  const cycleFontSize = useCallback(async () => {
    const idx = FONT_SIZE_OPTIONS.indexOf(fontSize);
    const next = FONT_SIZE_OPTIONS[(idx + 1) % FONT_SIZE_OPTIONS.length];
    setFontSize(next);
    await AsyncStorage.setItem(STORAGE_KEYS.fontSize, next);
  }, [fontSize]);

  const handleSelectCurriculum = useCallback(async (value: "adult" | "inverse") => {
    setPreferredCurriculum(value);
    await AsyncStorage.setItem(STORAGE_KEYS.curriculum, value);
    if (isAuthenticated) {
      try {
        await apiRequest("PUT", "/api/user/preferences", { preferredCurriculum: value });
      } catch {}
    }
    showToast(
      value === "inverse" ? "Curriculum set to InVerse (Youth)" : "Curriculum set to Adult",
      "success"
    );
  }, [isAuthenticated, showToast]);

  const narratorPioneer = PIONEERS.find((p) => p.voiceKey === narratorVoiceKey) ?? PIONEERS[0];

  const handleSelectNarrator = useCallback(async (pioneer: Pioneer) => {
    setShowNarratorPicker(false);
    setNarratorVoiceKey(pioneer.voiceKey);
    await AsyncStorage.setItem(NARRATOR_VOICE_KEY, pioneer.voiceKey);
    showToast(`Narrator set to ${pioneer.shortName}`, "success");
  }, [showToast]);

  const handleSelectTutor = useCallback((pioneer: Pioneer) => {
    setShowTutorPicker(false);
    selectPioneer(pioneer.id);
    showToast(`Study tutor set to ${pioneer.shortName}`, "success");
  }, [selectPioneer, showToast]);

  const handleClearCache = useCallback(async () => {
    queryClient.clear();
    showToast("Cache cleared successfully", "success");
  }, [showToast]);

  const handleSignOut = useCallback(() => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) logout();
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: () => logout() },
        ],
      );
    }
  }, [logout]);

  const renderSectionHeader = (title: string) => (
    <View style={s.sectionHeaderWrap}>
      <Text style={[s.sectionHeader, { color: GOLD, fontFamily: "Lora_700Bold" }]}>
        {title}
      </Text>
      <View style={[s.sectionLine, { backgroundColor: `${GOLD}25` }]} />
    </View>
  );

  const renderRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    options?: {
      onPress?: () => void;
      rightText?: string;
      rightElement?: React.ReactNode;
      showChevron?: boolean;
      isLast?: boolean;
    },
  ) => {
    const { onPress, rightText, rightElement, showChevron = true, isLast = false } = options || {};
    const content = (
      <View style={[s.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ROW_BORDER }]}>
        <Ionicons name={icon} size={20} color={GOLD} style={s.rowIcon} />
        <Text style={[s.rowLabel, { color: TEXT, fontFamily: "Inter_500Medium" }]}>
          {label}
        </Text>
        {rightText ? (
          <Text style={[s.rowRightText, { color: TEXT_MUTED, fontFamily: "Inter_400Regular" }]}>
            {rightText}
          </Text>
        ) : null}
        {rightElement || null}
        {showChevron && onPress ? (
          <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
        ) : null}
      </View>
    );

    if (!onPress) return content;
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        {content}
      </Pressable>
    );
  };

  const goldSwitch = (value: boolean, onValueChange: (v: boolean) => void) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#333333", true: "#C9933A" }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#333333"
      style={{ marginRight: 4 }}
    />
  );

  return (
    <View style={[s.screen, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => safeGoBack(router)} hitSlop={12} testID="settings-back">
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </Pressable>
        <Text style={[s.headerTitle, { color: TEXT, fontFamily: "Lora_700Bold" }]}>
          Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 60 }}
        showsVerticalScrollIndicator={false}
      >
        {renderSectionHeader("ACCOUNT")}
        {renderRow("person-outline", "Edit Profile", {
          onPress: () => comingSoon("Edit Profile"),
          showChevron: false,
          rightElement: <Ionicons name="lock-closed" size={14} color={theme.textMuted} style={{ marginRight: 4 }} />,
        })}
        {renderRow("notifications-outline", "Notification Settings", {
          onPress: () => comingSoon("Notification Settings"),
          showChevron: false,
          rightElement: <Ionicons name="lock-closed" size={14} color={theme.textMuted} style={{ marginRight: 4 }} />,
        })}
        {renderRow("diamond-outline", isPatron ? "Mission Partner" : "Go Premium", {
          onPress: () => comingSoon(isPatron ? "Mission Partner" : "Go Premium"),
          showChevron: false,
          rightText: isPatron ? "Active" : undefined,
          rightElement: !isPatron ? <Ionicons name="lock-closed" size={14} color={theme.textMuted} style={{ marginRight: 4 }} /> : undefined,
        })}
        {renderRow("compass-outline", "Pioneer Guide", {
          onPress: () => router.push("/pioneer-selector" as any),
          showChevron: true,
          rightText: selectedPioneer.name,
          isLast: true,
        })}

        {renderSectionHeader("GENERAL")}
        {renderRow("language-outline", "Language", {
          onPress: () => setShowLangPicker(true),
          showChevron: true,
          rightText: currentLangLabel,
        })}
        {renderRow("moon-outline", "Theme", {
          rightText: isDark ? "Dark" : "Light",
          onPress: () => showToast("Theme follows your device setting", "info"),
        })}
        {renderRow("cloud-download-outline", "Download Images", {
          rightElement: goldSwitch(downloadImages, toggleDownloadImages),
          showChevron: false,
          isLast: true,
        })}

        {renderSectionHeader("VOICES")}
        {renderRow("mic-outline", "Bible Narrator", {
          onPress: () => setShowNarratorPicker(true),
          showChevron: true,
          rightText: narratorPioneer.shortName,
        })}
        {renderRow("school-outline", "Study Tutor", {
          onPress: () => setShowTutorPicker(true),
          showChevron: true,
          rightText: selectedPioneer.shortName,
          isLast: true,
        })}

        {renderSectionHeader("BIBLE READING")}
        {renderRow("text-outline", "Font Size", {
          onPress: cycleFontSize,
          rightText: fontSize,
        })}
        {renderRow("book-outline", "Red Letters", {
          rightElement: goldSwitch(redLetters, toggleRedLetters),
          showChevron: false,
        })}
        {renderRow("list-outline", "Show Verse Numbers", {
          rightElement: goldSwitch(verseNumbers, toggleVerseNumbers),
          showChevron: false,
          isLast: false,
        })}
        {renderRow("school-outline", "Adult", {
          onPress: () => handleSelectCurriculum("adult"),
          showChevron: false,
          rightElement:
            preferredCurriculum === "adult" ? (
              <Ionicons name="checkmark-circle" size={18} color={GOLD} style={{ marginRight: 4 }} />
            ) : undefined,
        })}
        {renderRow("school-outline", "InVerse (Youth)", {
          onPress: () => handleSelectCurriculum("inverse"),
          showChevron: false,
          rightElement:
            preferredCurriculum === "inverse" ? (
              <Ionicons name="checkmark-circle" size={18} color={GOLD} style={{ marginRight: 4 }} />
            ) : undefined,
          isLast: true,
        })}

        {renderSectionHeader("FORMATION")}
        {renderRow("alarm-outline", "Daily Reminder Time", {
          onPress: () => comingSoon("Daily Reminder Time"),
          showChevron: false,
          rightText: "9:00 AM",
          rightElement: <Ionicons name="lock-closed" size={14} color={theme.textMuted} style={{ marginRight: 4 }} />,
        })}
        {renderRow("flame-outline", "Streak Notifications", {
          onPress: () => comingSoon("Streak Notifications"),
          showChevron: false,
          rightElement: <Ionicons name="lock-closed" size={14} color={theme.textMuted} style={{ marginRight: 4 }} />,
          isLast: true,
        })}

        {renderSectionHeader("LEGAL")}
        {renderRow("lock-closed-outline", "Privacy Policy", {
          onPress: () => router.push("/privacy" as any),
        })}
        {renderRow("document-text-outline", "Terms of Service", {
          onPress: () => router.push("/terms" as any),
          isLast: true,
        })}

        {renderSectionHeader("MORE")}
        {renderRow("trash-outline", "Clear Cache", {
          onPress: handleClearCache,
        })}
        {renderRow("information-circle-outline", "About Grace Through Faith", {
          onPress: () => showToast("Grace Through Faith — Spiritual Formation for Adventists", "info"),
        })}
        {renderRow("code-slash-outline", "App Version", {
          rightText: "1.0.0",
          showChevron: false,
          isLast: true,
        })}

        {isAuthenticated && (
          <Pressable
            onPress={() => {
              Alert.alert(
                "Reset Reading History",
                "This will clear all your Bible reading history so chapters no longer appear as read. This cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await apiRequest("DELETE", "/api/reading-history/reset");
                        // Clear ALL reading-history caches (recent + per-book)
                        queryClient.removeQueries({
                          predicate: (query) =>
                            typeof query.queryKey[0] === "string" &&
                            (query.queryKey[0] as string).includes("/api/reading-history"),
                        });
                        queryClient.invalidateQueries({ queryKey: [`/api/reading-streaks?userId=${userId}`] });
                        queryClient.invalidateQueries({ queryKey: [`/api/spiritual-rings?userId=${userId}`] });
                        Alert.alert("Done", "Your reading history has been cleared.");
                      } catch {
                        Alert.alert("Error", "Could not reset reading history. Try again.");
                      }
                    },
                  },
                ]
              );
            }}
            style={({ pressed }) => [s.signOutBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={20} color="#F59E0B" />
            <Text style={[s.signOutText, { color: "#F59E0B", fontFamily: "Inter_600SemiBold" }]}>
              Reset Reading History
            </Text>
          </Pressable>
        )}

        {isAuthenticated && (
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              s.signOutBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            testID="settings-sign-out"
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[s.signOutText, { fontFamily: "Inter_600SemiBold" }]}>
              Sign Out
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── Voice Picker Modal (reusable) ────────────────────────────────── */}
      {[
        {
          visible: showNarratorPicker,
          title: "Bible Narrator",
          subtitle: "The pioneer voice that reads Scripture aloud",
          selectedKey: narratorVoiceKey,
          matchKey: (p: Pioneer) => p.voiceKey,
          onSelect: handleSelectNarrator,
          onClose: () => setShowNarratorPicker(false),
        },
        {
          visible: showTutorPicker,
          title: "Study Tutor",
          subtitle: "Your guide through deep-dive study & devotionals",
          selectedKey: selectedPioneer.id,
          matchKey: (p: Pioneer) => p.id,
          onSelect: handleSelectTutor,
          onClose: () => setShowTutorPicker(false),
        },
      ].map((picker) => (
        <Modal
          key={picker.title}
          visible={picker.visible}
          animationType="slide"
          transparent
          onRequestClose={picker.onClose}
        >
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { backgroundColor: "#1A1C2E" }]}>
              <View style={s.modalHandle} />
              <Text style={[s.modalTitle, { color: TEXT, fontFamily: "Inter_700Bold" }]}>
                {picker.title}
              </Text>
              <Text style={[s.modalSubtitle, { color: TEXT_MUTED, fontFamily: "Inter_400Regular" }]}>
                {picker.subtitle}
              </Text>

              <FlatList
                data={PIONEERS}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 380 }}
                renderItem={({ item }) => {
                  const isSelected = picker.matchKey(item) === picker.selectedKey;
                  return (
                    <TouchableOpacity
                      style={[s.voiceRow, { borderColor: ROW_BORDER }]}
                      onPress={() => picker.onSelect(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.voiceName, { color: isSelected ? GOLD : TEXT, fontFamily: "Inter_600SemiBold" }]}>
                          {item.name}
                        </Text>
                        <Text style={[s.voiceRole, { color: TEXT_MUTED, fontFamily: "Inter_400Regular" }]}>
                          {item.role} · {item.era}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                    </TouchableOpacity>
                  );
                }}
              />

              <TouchableOpacity
                style={[s.modalCancel, { borderColor: ROW_BORDER }]}
                onPress={picker.onClose}
              >
                <Text style={[s.modalCancelText, { color: TEXT_MUTED }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ))}

      {/* ── Language Picker Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showLangPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLangPicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: "#1A1C2E" }]}>
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: TEXT, fontFamily: "Inter_700Bold" }]}>
              {t("profile.language", "App Language")}
            </Text>

            <TouchableOpacity
              style={[s.langRow, s.langRowFirst, { borderColor: ROW_BORDER }]}
              onPress={handleUseDeviceLang}
            >
              <Ionicons name="phone-portrait-outline" size={18} color={GOLD} style={{ marginRight: 12 }} />
              <Text style={[s.langLabel, { color: TEXT }]}>
                {t("profile.useDeviceLanguage", "Use Device Language")}
              </Text>
            </TouchableOpacity>

            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => {
                const isSelected = item.code === currentLang;
                return (
                  <TouchableOpacity
                    style={[s.langRow, { borderColor: ROW_BORDER }]}
                    onPress={() => handleSelectLanguage(item.code)}
                  >
                    <Text style={[s.langLabel, { color: TEXT, flex: 1 }]}>{item.label}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={GOLD} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={[s.modalCancel, { borderColor: ROW_BORDER }]}
              onPress={() => setShowLangPicker(false)}
            >
              <Text style={[s.modalCancelText, { color: TEXT_MUTED }]}>
                {t("common.cancel", "Cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  sectionHeaderWrap: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 10,
  },
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionLine: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  rowIcon: {
    width: 28,
    textAlign: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    marginLeft: 14,
  },
  rowRightText: {
    fontSize: 13,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  voiceName: {
    fontSize: 15,
    marginBottom: 2,
  },
  voiceRole: {
    fontSize: 12,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  langRowFirst: {
    borderTopWidth: 0,
    marginBottom: 4,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langLabel: {
    fontSize: 15,
  },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 36,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EF444440",
    backgroundColor: "#EF444410",
  },
  signOutText: {
    fontSize: 16,
    color: "#EF4444",
  },
});
