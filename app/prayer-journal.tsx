import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import FeatureTutorial from "@/components/FeatureTutorial";
import { PRAYER_JOURNAL_STEPS } from "@/lib/tutorial-steps";

interface Prayer {
  id: string;
  title: string;
  content: string | null;
  category: string;
  answered: boolean;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: "personal", label: "Personal", icon: "person" as const, color: "#5B86E5" },
  { id: "family", label: "Family", icon: "people" as const, color: "#E8456B" },
  { id: "health", label: "Health", icon: "fitness" as const, color: "#2E7D32" },
  { id: "world", label: "World", icon: "globe" as const, color: "#C9933A" },
  { id: "praise", label: "Praise", icon: "musical-notes" as const, color: "#8B5CF6" },
];

function getCategoryInfo(id: string) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PrayerJournalScreen() {
  const { theme, isDark } = useTheme();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("personal");
  const [filter, setFilter] = useState<"active" | "answered">("active");

  const { data: prayers, isLoading } = useQuery<Prayer[]>({
    queryKey: [`/api/prayers?userId=${userId}`],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/prayers", {
        userId,
        title: newTitle.trim(),
        content: newContent.trim() || null,
        category: newCategory,
      });
    },
    onSuccess: () => {
      track("prayer_journal_entry", { category: newCategory });
      queryClient.invalidateQueries({ queryKey: [`/api/prayers?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/spiritual-rings?userId=${userId}`] });
      setShowAdd(false);
      setNewTitle("");
      setNewContent("");
      setNewCategory("personal");
    },
    onError: () => {
      if (Platform.OS === "web") { window.alert("Could not save your prayer. Please try again."); }
      else { Alert.alert("Something went wrong", "Could not save your prayer. Please try again."); }
    },
  });

  const toggleAnswered = useMutation({
    mutationFn: async ({ id, answered }: { id: string; answered: boolean }) => {
      await apiRequest("PATCH", `/api/prayers/${id}`, {
        answered,
        answeredAt: answered ? new Date().toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/prayers?userId=${userId}`] });
    },
    onError: () => {
      if (Platform.OS === "web") { window.alert("Could not update prayer. Please try again."); }
      else { Alert.alert("Something went wrong", "Could not update prayer. Please try again."); }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/prayers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/prayers?userId=${userId}`] });
    },
    onError: () => {
      if (Platform.OS === "web") { window.alert("Could not remove prayer. Please try again."); }
      else { Alert.alert("Something went wrong", "Could not remove prayer. Please try again."); }
    },
  });

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this prayer request?")) {
        deleteMutation.mutate(id);
      }
    } else {
      Alert.alert("Delete Prayer", "Are you sure you want to delete this prayer request?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
      ]);
    }
  };

  const activePrayers = prayers?.filter((p) => !p.answered) ?? [];
  const answeredPrayers = prayers?.filter((p) => p.answered) ?? [];
  const displayPrayers = filter === "active" ? activePrayers : answeredPrayers;

  return (
    <>
      <FeatureTutorial tutorialId="prayer-journal" steps={PRAYER_JOURNAL_STEPS} />
      <Stack.Screen
        options={{
          title: "Prayer Journal",
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: "Lora_700Bold", fontSize: 20 },
          headerRight: () => (
            <Pressable
              onPress={() => setShowAdd(true)}
              style={[styles.addBtn, { backgroundColor: theme.accent }]}
              testID="add-prayer"
              hitSlop={12}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>

        <View style={[styles.filterRow, { backgroundColor: isDark ? theme.backgroundSecondary : "#FFF8EC" }]}>
          {(["active", "answered"] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterBtn,
                filter === f && { backgroundColor: theme.accent },
              ]}
              testID={`filter-${f}`}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: filter === f ? "#fff" : theme.textSecondary,
                    fontFamily: filter === f ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
              >
                {f === "active" ? `Active (${activePrayers.length})` : `Answered (${answeredPrayers.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: bottomPad + 40, paddingHorizontal: 22 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {!isLoading && displayPrayers.length === 0 && (
            <EmptyState
              icon={filter === "active" ? "journal-outline" : "checkmark-done-outline"}
              title={filter === "active" ? "No Active Prayers" : "No Answered Prayers"}
              description={filter === "active" ? "Add your first prayer request to get started." : "Mark prayers as answered to build your testimony of God's faithfulness."}
              actionLabel={filter === "active" ? "Add Prayer" : undefined}
              onAction={filter === "active" ? () => setShowAdd(true) : undefined}
            />
          )}

          {displayPrayers.map((prayer) => {
            const cat = getCategoryInfo(prayer.category);
            return (
              <View
                key={prayer.id}
                style={[styles.prayerCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}
              >
                <View style={styles.prayerCardHeader}>
                  <View style={[styles.catBadge, { backgroundColor: cat.color + "18" }]}>
                    <Ionicons name={cat.icon} size={14} color={cat.color} />
                    <Text style={[styles.catLabel, { color: cat.color, fontFamily: "Inter_600SemiBold" }]}>{cat.label}</Text>
                  </View>
                  <Text style={[styles.prayerDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {formatDate(prayer.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.prayerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{prayer.title}</Text>
                {prayer.content && (
                  <Text style={[styles.prayerContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={3}>
                    {prayer.content}
                  </Text>
                )}
                {prayer.answered && prayer.answeredAt && (
                  <View style={[styles.answeredBadge, { backgroundColor: theme.success + "18" }]}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                    <Text style={[styles.answeredText, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                      Answered {formatDate(prayer.answeredAt)}
                    </Text>
                  </View>
                )}
                <View style={styles.prayerActions}>
                  <Pressable
                    onPress={() => toggleAnswered.mutate({ id: prayer.id, answered: !prayer.answered })}
                    style={[styles.actionBtn, { backgroundColor: prayer.answered ? theme.textMuted + "15" : theme.success + "15" }]}
                    testID={`toggle-answered-${prayer.id}`}
                  >
                    <Ionicons
                      name={prayer.answered ? "arrow-undo" : "checkmark-circle-outline"}
                      size={16}
                      color={prayer.answered ? theme.textMuted : theme.success}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: prayer.answered ? theme.textMuted : theme.success, fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      {prayer.answered ? "Reopen" : "Answered"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(prayer.id)}
                    style={[styles.actionBtn, { backgroundColor: theme.error + "15" }]}
                    testID={`delete-prayer-${prayer.id}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.error} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: isDark ? theme.backgroundElevated : "#fff" }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>New Prayer</Text>
                <Pressable onPress={() => setShowAdd(false)} hitSlop={12}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </Pressable>
              </View>

              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Prayer title..."
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, backgroundColor: isDark ? theme.backgroundCard : "#F5F0E5", fontFamily: "Inter_400Regular" }]}
                testID="prayer-title-input"
              />

              <TextInput
                value={newContent}
                onChangeText={setNewContent}
                placeholder="Details (optional)..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textArea, { color: theme.text, backgroundColor: isDark ? theme.backgroundCard : "#F5F0E5", fontFamily: "Inter_400Regular" }]}
                testID="prayer-content-input"
              />

              <Text style={[styles.catSectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>Category</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setNewCategory(cat.id)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: newCategory === cat.id ? cat.color + "20" : isDark ? theme.backgroundCard : "#F5F0E5",
                        borderColor: newCategory === cat.id ? cat.color : "transparent",
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Ionicons name={cat.icon} size={14} color={newCategory === cat.id ? cat.color : theme.textMuted} />
                    <Text
                      style={[
                        styles.catChipText,
                        { color: newCategory === cat.id ? cat.color : theme.textSecondary, fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Button
                variant="primary"
                title="Add Prayer"
                onPress={() => { if (newTitle.trim()) addMutation.mutate(); }}
                disabled={!newTitle.trim()}
                loading={addMutation.isPending}
                testID="submit-prayer"
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  pageTitle: { fontSize: 26 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    marginHorizontal: 22,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  filterText: { fontSize: 13 },
  list: { flex: 1 },
  loadingBox: { alignItems: "center", paddingVertical: 40 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 15, textAlign: "center" as const, lineHeight: 22 },
  prayerCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    gap: 10,
  },
  prayerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catLabel: { fontSize: 11, letterSpacing: 0.3 },
  prayerDate: { fontSize: 11 },
  prayerTitle: { fontSize: 17 },
  prayerContent: { fontSize: 14, lineHeight: 21 },
  answeredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  answeredText: { fontSize: 11 },
  prayerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 22 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top" as any,
  },
  catSectionLabel: { fontSize: 12, letterSpacing: 0.5, marginTop: 4 },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  catChipText: { fontSize: 13 },
});
