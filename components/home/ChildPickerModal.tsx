import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { useToast } from "@/contexts/ToastContext";
import type { AgeGroup } from "@/context/KidsModeContext";

const AGE_TIERS: { value: AgeGroup; label: string; ages: string }[] = [
  { value: "little_lambs", label: "Little Lambs", ages: "Ages 3-6" },
  { value: "young_disciples", label: "Young Disciples", ages: "Ages 7-9" },
  { value: "young_disciples_plus", label: "Teens", ages: "Ages 10-12" },
];

export interface ChildProfile {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  totalPoints: number;
  currentLevel: number;
}

interface ChildPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectChild: (child: ChildProfile) => void;
  userId: string;
  lastActiveChildId: string | null;
}

export default function ChildPickerModal({
  visible,
  onClose,
  onSelectChild,
  userId,
  lastActiveChildId,
}: ChildPickerModalProps) {
  const { theme, isDark } = useTheme();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildTier, setNewChildTier] = useState<AgeGroup>("little_lambs");

  const { data: children, isLoading } = useQuery<ChildProfile[]>({
    queryKey: [`/api/family/children?userId=${userId}`],
    enabled: visible,
  });

  const addChildMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/family/children", {
        userId,
        name: newChildName.trim(),
        ageGroup: newChildTier,
      });
      return res.json();
    },
    onSuccess: (child: ChildProfile) => {
      qc.invalidateQueries({ queryKey: [`/api/family/children?userId=${userId}`] });
      setNewChildName("");
      setNewChildTier("little_lambs");
      setShowAddForm(false);
      onSelectChild(child);
    },
    onError: (err: Error) => {
      const msg = err.message || "Could not add child. Please try again.";
      showToast(msg, "error");
    },
  });

  const hasChildren = children && children.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cpStyles.overlay}>
        <View style={[cpStyles.container, { backgroundColor: isDark ? theme.backgroundCard : "#FAFAF5" }]}>
          <View style={cpStyles.header}>
            <Text style={[cpStyles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Who's reading today?
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          {isLoading && (
            <View style={cpStyles.loadingWrap}>
              <Text style={[cpStyles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Loading...
              </Text>
            </View>
          )}

          {!isLoading && hasChildren && !showAddForm && (
            <ScrollView style={cpStyles.childList} showsVerticalScrollIndicator={false}>
              {children.map((child) => {
                const tierInfo = AGE_TIERS.find((t) => t.value === child.ageGroup) || AGE_TIERS[0];
                const isLast = child.id === lastActiveChildId;
                const initials = child.name.charAt(0).toUpperCase();
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => onSelectChild(child)}
                    style={({ pressed }) => [
                      cpStyles.childCard,
                      {
                        backgroundColor: isDark ? (isLast ? theme.accent + "15" : theme.background) : (isLast ? "#FFF8EC" : "#fff"),
                        borderColor: isLast ? theme.accent + "40" : (isDark ? theme.border : "#E8E0D0"),
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID={`child-picker-${child.id}`}
                  >
                    <LinearGradient
                      colors={
                        child.ageGroup === "little_lambs"
                          ? ["#FF6B35", "#E55100"]
                          : child.ageGroup === "young_disciples"
                          ? ["#3B6CB5", "#2A4F8F"]
                          : ["#8B5CF6", "#6D3BD4"]
                      }
                      style={cpStyles.avatar}
                    >
                      <Text style={[cpStyles.avatarText, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
                    </LinearGradient>
                    <View style={cpStyles.childInfo}>
                      <Text style={[cpStyles.childName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {child.name}
                      </Text>
                      <Text style={[cpStyles.childTier, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {tierInfo.label} · {tierInfo.ages}
                      </Text>
                    </View>
                    {isLast && (
                      <View style={[cpStyles.lastBadge, { backgroundColor: theme.accent + "20" }]}>
                        <Text style={[cpStyles.lastBadgeText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                          Last
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setShowAddForm(true)}
                style={({ pressed }) => [
                  cpStyles.addChildBtn,
                  {
                    borderColor: isDark ? theme.border : "#E8E0D0",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="add-circle-outline" size={22} color={theme.accent} />
                <Text style={[cpStyles.addChildText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  Add Child Profile
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {(!isLoading && (!hasChildren || showAddForm)) && (
            <View style={cpStyles.addForm}>
              {showAddForm && hasChildren && (
                <Pressable onPress={() => setShowAddForm(false)} style={cpStyles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={theme.accent} />
                  <Text style={[cpStyles.backText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>Back</Text>
                </Pressable>
              )}
              {!hasChildren && (
                <Text style={[cpStyles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Add a child to get started
                </Text>
              )}
              <TextInput
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder="Child's name"
                placeholderTextColor={theme.textMuted}
                style={[cpStyles.input, { color: theme.text, borderColor: isDark ? theme.border : "#E0D8C8", backgroundColor: isDark ? theme.background : "#fff", fontFamily: "Inter_400Regular" }]}
                testID="add-child-name-input"
              />
              <Text style={[cpStyles.tierLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                Age Group
              </Text>
              <View style={cpStyles.tierRow}>
                {AGE_TIERS.map((tier) => (
                  <Pressable
                    key={tier.value}
                    onPress={() => setNewChildTier(tier.value)}
                    style={[
                      cpStyles.tierChip,
                      {
                        backgroundColor: newChildTier === tier.value ? theme.accent + "20" : (isDark ? theme.background : "#F5F0E8"),
                        borderColor: newChildTier === tier.value ? theme.accent : (isDark ? theme.border : "#E0D8C8"),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        cpStyles.tierChipText,
                        {
                          color: newChildTier === tier.value ? theme.accent : theme.textSecondary,
                          fontFamily: newChildTier === tier.value ? "Inter_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {tier.label}
                    </Text>
                    <Text style={[cpStyles.tierChipAges, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {tier.ages}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => {
                  if (!newChildName.trim()) {
                    showToast("Please enter a name.", "error");
                    return;
                  }
                  addChildMutation.mutate();
                }}
                disabled={addChildMutation.isPending}
                style={({ pressed }) => [
                  cpStyles.addSubmitBtn,
                  { backgroundColor: theme.accent, opacity: pressed || addChildMutation.isPending ? 0.7 : 1 },
                ]}
                testID="add-child-submit"
              >
                <Text style={[cpStyles.addSubmitText, { fontFamily: "Inter_600SemiBold" }]}>
                  {addChildMutation.isPending ? "Adding..." : "Add & Start Reading"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const cpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 22 },
  loadingWrap: { padding: 32, alignItems: "center" },
  loadingText: { fontSize: 14 },
  childList: { maxHeight: 350 },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18 },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, marginBottom: 2 },
  childTier: { fontSize: 12 },
  lastBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lastBadgeText: { fontSize: 10 },
  addChildBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 14,
    marginTop: 4,
  },
  addChildText: { fontSize: 14 },
  addForm: { gap: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  backText: { fontSize: 14 },
  emptyText: { fontSize: 14, textAlign: "center", marginBottom: 8, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  tierLabel: { fontSize: 13, marginTop: 4 },
  tierRow: { gap: 8 },
  tierChip: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tierChipText: { fontSize: 14 },
  tierChipAges: { fontSize: 11 },
  addSubmitBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  addSubmitText: { color: "#fff", fontSize: 15 },
});
