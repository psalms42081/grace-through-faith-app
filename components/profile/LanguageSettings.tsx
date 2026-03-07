import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { CONTENT_LANGUAGE_OPTIONS, type ContentLanguageOption } from "@/lib/content-language";

interface LanguageSettingsProps {
  theme: typeof Colors.dark;
  isDark: boolean;
  currentLang: string;
  contentLangOption: ContentLanguageOption;
  langPickerOpen: boolean;
  contentLangPickerOpen: boolean;
  onToggleLangPicker: () => void;
  onToggleContentLangPicker: () => void;
  onLanguageChange: (code: string) => void;
  onUseDeviceLang: () => void;
  onContentLangChange: (code: ContentLanguageOption) => void;
  languageLabel: string;
  contentLanguageLabel: string;
  contentLangSub: string;
  useDeviceLanguageLabel: string;
  sameAsAppLabel: string;
}

export default function LanguageSettings({
  theme,
  isDark,
  currentLang,
  contentLangOption,
  langPickerOpen,
  contentLangPickerOpen,
  onToggleLangPicker,
  onToggleContentLangPicker,
  onLanguageChange,
  onUseDeviceLang,
  onContentLangChange,
  languageLabel,
  contentLanguageLabel,
  contentLangSub,
  useDeviceLanguageLabel,
  sameAsAppLabel,
}: LanguageSettingsProps) {
  return (
    <>
      <Pressable
        onPress={onToggleLangPicker}
        style={({ pressed }) => [
          styles.linkRow,
          { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={[styles.linkIcon, { backgroundColor: "#3B82F615" }]}>
          <Ionicons name="language" size={18} color="#3B82F6" />
        </View>
        <Text style={[styles.linkTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          {languageLabel}
        </Text>
        <Text style={[styles.langCurrentLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.label || "English"}
        </Text>
        <Ionicons name={langPickerOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
      </Pressable>

      {langPickerOpen && (
        <View style={[styles.langPicker, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", borderColor: theme.border }]}>
          <Pressable
            onPress={onUseDeviceLang}
            style={({ pressed }) => [
              styles.langOption,
              { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.divider },
            ]}
          >
            <Ionicons name="phone-portrait-outline" size={16} color={theme.accent} />
            <Text style={[styles.langOptionText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
              {useDeviceLanguageLabel}
            </Text>
          </Pressable>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = currentLang === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => onLanguageChange(lang.code)}
                style={({ pressed }) => [
                  styles.langOption,
                  { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.divider },
                  isActive && { backgroundColor: theme.accent + "10" },
                ]}
              >
                <Text style={[styles.langOptionText, { color: isActive ? theme.accent : theme.text, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  {lang.label}
                </Text>
                {isActive && <Ionicons name="checkmark" size={18} color={theme.accent} />}
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={onToggleContentLangPicker}
        style={({ pressed }) => [
          styles.linkRow,
          { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={[styles.linkIcon, { backgroundColor: "#10B98115" }]}>
          <Ionicons name="document-text" size={18} color="#10B981" />
        </View>
        <Text style={[styles.linkTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          {contentLanguageLabel}
        </Text>
        <Text style={[styles.langCurrentLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {CONTENT_LANGUAGE_OPTIONS.find((o) => o.code === contentLangOption)?.label || "Same as App"}
        </Text>
        <Ionicons name={contentLangPickerOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
      </Pressable>

      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, paddingHorizontal: 16, paddingBottom: 8, lineHeight: 17 }}>
        {contentLangSub}
      </Text>

      {contentLangPickerOpen && (
        <View style={[styles.langPicker, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", borderColor: theme.border }]}>
          {CONTENT_LANGUAGE_OPTIONS.map((opt) => {
            const isActive = contentLangOption === opt.code;
            return (
              <Pressable
                key={opt.code}
                onPress={() => onContentLangChange(opt.code)}
                style={({ pressed }) => [
                  styles.langOption,
                  { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.divider },
                  isActive && { backgroundColor: theme.accent + "10" },
                ]}
              >
                <Text style={[styles.langOptionText, { color: isActive ? theme.accent : theme.text, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  {opt.code === "same" ? sameAsAppLabel : opt.label}
                </Text>
                {isActive && <Ionicons name="checkmark" size={18} color={theme.accent} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { flex: 1, fontSize: 15 },
  langCurrentLabel: {
    fontSize: 13,
    marginRight: 4,
  },
  langPicker: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden" as const,
  },
  langOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  langOptionText: {
    fontSize: 15,
    flex: 1,
  },
});
