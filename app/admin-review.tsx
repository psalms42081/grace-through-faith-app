import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

interface FilteredItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  generationStatus: string;
  reviewStatus: string;
  promptVersion: string;
  sourceRef: any;
  sourcePacketId: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  supersedesResourceId: string | null;
  hasPreviousVersion: boolean;
  sourceChanged: boolean;
  isRegenerated: boolean;
  hasNotes: boolean;
}

interface DiffData {
  hasPrevious: boolean;
  resource: { id: string; title: string };
  metaDiff?: {
    promptVersion: { previous: string | null; current: string | null; changed: boolean };
    model: { previous: string | null; current: string | null; changed: boolean };
    generatedAt: { previous: string | null; current: string | null; changed: boolean };
    tokensUsed: { previous: number | null; current: number | null; changed: boolean };
  };
  sections: Array<{
    key: string;
    label: string;
    type: "text" | "array" | "object";
    status: "unchanged" | "changed" | "added" | "removed";
    current: any;
    previous: any;
  }>;
  summary?: { total: number; changed: number; unchanged: number };
}

interface PipelineOverview {
  sourcePackets: { byStatus: Record<string, number>; total: number };
  companions: {
    byGenerationStatus: Record<string, number>;
    byReviewStatus: Record<string, number>;
    total: number;
  };
  coverage: { totalLessons: number; lessonsWithCompanions: number; coveragePercent: number };
  promptVersionDistribution: Record<string, number>;
  failedGenerations: Array<{ id: string; title: string; updatedAt: string }>;
  presetCounts?: {
    pendingReview: number;
    needsAttention: number;
    regenerated: number;
    sourceChanged: number;
    hasNotes: number;
  };
  filteredList: FilteredItem[];
  filters: {
    reviewStatus: string;
    generationStatus: string | null;
    promptVersion: string | null;
    quarterCode: string | null;
  };
}

interface QuarterInfo {
  id: string;
  quarterCode: string;
  title: string;
  lessonCount: number;
  companionCount: number;
}

interface QuarterDetail {
  quarter: { id: string; code: string; title: string; humanDate: string };
  summary: {
    totalLessons: number;
    packetsBuilt: number;
    companionsGenerated: number;
    published: number;
    pendingReview: number;
    failed: number;
  };
  lessons: Array<{
    lessonId: string;
    lessonNumber: number;
    title: string;
    packet: { id: string; status: string; hash: string; updatedAt: string } | null;
    companion: {
      id: string;
      slug: string;
      status: string;
      generationStatus: string;
      reviewStatus: string;
      promptVersion: string;
      createdAt: string;
      publishedAt: string | null;
    } | null;
  }>;
}

interface ResourcePreview {
  resource: {
    id: string;
    title: string;
    slug: string;
    description: string;
    resourceType: string;
    category: string;
    tier: string;
    status: string;
    generationStatus: string;
    reviewStatus: string;
    reviewNotes: string | null;
    promptVersion: string;
    generatedBy: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    supersedesResourceId: string | null;
  };
  generationMeta: {
    model?: string;
    promptVersion?: string;
    generatedAt?: string;
    tokensUsed?: number;
  } | null;
  contentSections: Array<{ key: string; label: string; preview: string }>;
  fullContent: any;
  sourcePacket: {
    id: string;
    title: string;
    weekNumber: number;
    status: string;
    sourceHash: string;
    sourceVersion: string | null;
    updatedAt: string;
  } | null;
  reviewer: {
    id: string;
    displayName: string;
    email: string;
    reviewedAt: string;
  } | null;
  supersedesResourceId: string | null;
  hasPreviousVersion: boolean;
  predecessor: {
    id: string;
    title: string;
    promptVersion: string;
    status: string;
    createdAt: string;
  } | null;
}

interface ReviewHistoryEntry {
  id: string;
  resourceId: string;
  action: string;
  statusFrom: string | null;
  statusTo: string | null;
  notes: string | null;
  isSystem: boolean;
  createdAt: string;
  author: {
    displayName: string | null;
    email: string;
    role: string | null;
  };
}

function ReviewHistoryFeed({ resourceId, theme }: { resourceId: string; theme: any }) {
  const historyPath = `/api/admin/pipeline/resource/${resourceId}/review-history`;
  const { data, isLoading } = useQuery<{ history: ReviewHistoryEntry[] }>({
    queryKey: [historyPath],
    enabled: !!resourceId,
  });

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      approved: "Approved",
      rejected: "Rejected",
      needs_revision: "Revision Requested",
      rollback_archived: "Rolled Back (archived)",
      rollback_restored: "Rolled Back (restored)",
      archived: "Archived",
    };
    return labels[action] || action;
  };

  const actionColor = (action: string) => {
    const colors: Record<string, string> = {
      approved: "#10B981",
      rejected: "#EF4444",
      needs_revision: "#F97316",
      rollback_archived: "#8B5CF6",
      rollback_restored: "#8B5CF6",
      archived: "#6B7280",
    };
    return colors[action] || "#6B7280";
  };

  if (isLoading) {
    return (
      <View style={[styles.metaBlock, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <Text style={[styles.metaBlockTitle, { color: "#F97316" }]}>Review History</Text>
        <ActivityIndicator size="small" color={theme.accent} />
      </View>
    );
  }

  const history = data?.history || [];

  if (history.length === 0) {
    return (
      <View style={[styles.metaBlock, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <Text style={[styles.metaBlockTitle, { color: "#F97316" }]}>Review History</Text>
        <Text style={[styles.previewBody, { color: theme.textMuted }]}>No review actions yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.metaBlock, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <Text style={[styles.metaBlockTitle, { color: "#F97316" }]}>Review History ({history.length})</Text>
      {history.map((entry, idx) => {
        const color = actionColor(entry.action);
        const authorName = entry.author.displayName || entry.author.email;
        const dateStr = new Date(entry.createdAt).toLocaleString();
        return (
          <View
            key={entry.id}
            style={[
              styles.historyEntry,
              { borderLeftColor: color },
              idx < history.length - 1 && { marginBottom: 12 },
            ]}
          >
            <View style={styles.historyHeader}>
              <View style={[styles.historyActionBadge, { backgroundColor: color + "20" }]}>
                <Ionicons
                  name={entry.isSystem ? "cog-outline" : "person-outline"}
                  size={12}
                  color={color}
                />
                <Text style={[styles.historyActionText, { color }]}>{actionLabel(entry.action)}</Text>
              </View>
              {entry.statusFrom && entry.statusTo && entry.statusFrom !== entry.statusTo && (
                <Text style={[styles.historyTransition, { color: theme.textMuted }]}>
                  {entry.statusFrom} → {entry.statusTo}
                </Text>
              )}
            </View>
            <View style={styles.historyMeta}>
              <Ionicons name={entry.isSystem ? "hardware-chip-outline" : "person-circle-outline"} size={14} color={theme.textMuted} />
              <Text style={[styles.historyAuthor, { color: theme.textSecondary }]}>
                {entry.isSystem ? "System" : authorName}
              </Text>
              <Text style={[styles.historyDate, { color: theme.textMuted }]}>{dateStr}</Text>
            </View>
            {entry.notes && (
              <Text style={[styles.historyNotes, { color: theme.text }]}>{entry.notes}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status, type }: { status: string; type: "generation" | "review" | "resource" }) {
  const colorMap: Record<string, string> = {
    completed: "#10B981",
    approved: "#10B981",
    published: "#10B981",
    pending: "#F59E0B",
    draft: "#6B7280",
    failed: "#EF4444",
    rejected: "#EF4444",
    needs_revision: "#F97316",
    generating: "#3B82F6",
    regenerating: "#8B5CF6",
  };
  const bg = colorMap[status] || "#6B7280";
  return (
    <View style={[styles.badge, { backgroundColor: bg + "20", borderColor: bg }]}>
      <Text style={[styles.badgeText, { color: bg }]}>{status}</Text>
    </View>
  );
}

interface QueuePreset {
  key: string;
  label: string;
  icon: string;
  color: string;
  reviewStatus: string;
  hasNotes: boolean;
  isRegenerated: boolean;
  sourceChanged: boolean;
  sortBy: "createdAt" | "updatedAt" | "title";
  sortOrder: "asc" | "desc";
  promptVersion: string;
}

const QUEUE_PRESETS: QueuePreset[] = [
  {
    key: "pending_review",
    label: "Pending Review",
    icon: "time-outline",
    color: "#F59E0B",
    reviewStatus: "pending",
    hasNotes: false,
    isRegenerated: false,
    sourceChanged: false,
    sortBy: "createdAt",
    sortOrder: "desc",
    promptVersion: "",
  },
  {
    key: "needs_attention",
    label: "Needs Attention",
    icon: "alert-circle-outline",
    color: "#EF4444",
    reviewStatus: "needs_revision",
    hasNotes: false,
    isRegenerated: false,
    sourceChanged: false,
    sortBy: "updatedAt",
    sortOrder: "desc",
    promptVersion: "",
  },
  {
    key: "regenerated",
    label: "Regenerated Drafts",
    icon: "git-compare-outline",
    color: "#F59E0B",
    reviewStatus: "pending",
    hasNotes: false,
    isRegenerated: true,
    sourceChanged: false,
    sortBy: "createdAt",
    sortOrder: "desc",
    promptVersion: "",
  },
  {
    key: "source_changed",
    label: "Source Changed",
    icon: "sync-outline",
    color: "#3B82F6",
    reviewStatus: "all",
    hasNotes: false,
    isRegenerated: false,
    sourceChanged: true,
    sortBy: "updatedAt",
    sortOrder: "desc",
    promptVersion: "",
  },
  {
    key: "has_notes",
    label: "Has Notes",
    icon: "document-text-outline",
    color: "#F97316",
    reviewStatus: "all",
    hasNotes: true,
    isRegenerated: false,
    sourceChanged: false,
    sortBy: "updatedAt",
    sortOrder: "desc",
    promptVersion: "",
  },
];

function FilterBar({
  reviewStatus,
  promptVersion,
  promptVersions,
  hasNotes,
  isRegenerated,
  sortBy,
  sortOrder,
  activePreset,
  presetCounts,
  onChangeReviewStatus,
  onChangePromptVersion,
  onToggleHasNotes,
  onToggleIsRegenerated,
  onChangeSortBy,
  onToggleSortOrder,
  onApplyPreset,
  theme,
}: {
  reviewStatus: string;
  promptVersion: string;
  promptVersions: string[];
  hasNotes: boolean;
  isRegenerated: boolean;
  sortBy: string;
  sortOrder: string;
  activePreset: string | null;
  presetCounts?: Record<string, number>;
  onChangeReviewStatus: (v: string) => void;
  onChangePromptVersion: (v: string) => void;
  onToggleHasNotes: () => void;
  onToggleIsRegenerated: () => void;
  onChangeSortBy: (v: "createdAt" | "updatedAt" | "title") => void;
  onToggleSortOrder: () => void;
  onApplyPreset: (preset: QueuePreset | null) => void;
  theme: any;
}) {
  const statusOptions = ["pending", "approved", "rejected", "needs_revision"];
  const sortOptions: Array<{ key: "createdAt" | "updatedAt" | "title"; label: string }> = [
    { key: "createdAt", label: "Created" },
    { key: "updatedAt", label: "Updated" },
    { key: "title", label: "Title" },
  ];

  const presetCountMap: Record<string, string> = {
    pending_review: "pendingReview",
    needs_attention: "needsAttention",
    regenerated: "regenerated",
    source_changed: "sourceChanged",
    has_notes: "hasNotes",
  };

  return (
    <View style={styles.filterBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
        {QUEUE_PRESETS.map((preset) => {
          const isActive = activePreset === preset.key;
          const countKey = presetCountMap[preset.key];
          const count = countKey && presetCounts ? presetCounts[countKey] : undefined;
          return (
            <Pressable
              key={preset.key}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isActive ? preset.color + "20" : theme.backgroundCard,
                  borderColor: isActive ? preset.color : theme.border,
                },
              ]}
              onPress={() => onApplyPreset(isActive ? null : preset)}
            >
              <Ionicons name={preset.icon as any} size={13} color={isActive ? preset.color : theme.textMuted} />
              <Text style={[styles.presetChipText, { color: isActive ? preset.color : theme.textSecondary }]}>
                {preset.label}
              </Text>
              {count !== undefined && count > 0 && (
                <View style={[styles.presetCountBadge, { backgroundColor: isActive ? preset.color : theme.textMuted }]}>
                  <Text style={styles.presetCountText}>{count > 99 ? "99+" : count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {statusOptions.map((s) => (
          <Pressable
            key={s}
            style={[
              styles.filterChip,
              {
                backgroundColor: reviewStatus === s ? theme.accent + "30" : theme.backgroundCard,
                borderColor: reviewStatus === s ? theme.accent : theme.border,
              },
            ]}
            onPress={() => onChangeReviewStatus(s)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: reviewStatus === s ? theme.accent : theme.textSecondary },
              ]}
            >
              {s.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
        <View style={styles.filterDivider} />
        <Pressable
          style={[
            styles.filterChip,
            {
              backgroundColor: isRegenerated ? "#F59E0B" + "30" : theme.backgroundCard,
              borderColor: isRegenerated ? "#F59E0B" : theme.border,
            },
          ]}
          onPress={onToggleIsRegenerated}
        >
          <Ionicons name="git-compare-outline" size={12} color={isRegenerated ? "#F59E0B" : theme.textSecondary} />
          <Text style={[styles.filterChipText, { color: isRegenerated ? "#F59E0B" : theme.textSecondary, marginLeft: 4 }]}>
            Regenerated
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterChip,
            {
              backgroundColor: hasNotes ? "#F97316" + "30" : theme.backgroundCard,
              borderColor: hasNotes ? "#F97316" : theme.border,
            },
          ]}
          onPress={onToggleHasNotes}
        >
          <Ionicons name="document-text-outline" size={12} color={hasNotes ? "#F97316" : theme.textSecondary} />
          <Text style={[styles.filterChipText, { color: hasNotes ? "#F97316" : theme.textSecondary, marginLeft: 4 }]}>
            Has Notes
          </Text>
        </Pressable>
        {promptVersions.length > 0 && (
          <View style={styles.filterDivider} />
        )}
        {promptVersions.map((v) => (
          <Pressable
            key={v}
            style={[
              styles.filterChip,
              {
                backgroundColor: promptVersion === v ? "#8B5CF6" + "30" : theme.backgroundCard,
                borderColor: promptVersion === v ? "#8B5CF6" : theme.border,
              },
            ]}
            onPress={() => onChangePromptVersion(promptVersion === v ? "" : v)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: promptVersion === v ? "#8B5CF6" : theme.textSecondary },
              ]}
            >
              {v}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <Ionicons name="swap-vertical" size={14} color={theme.textMuted} />
        {sortOptions.map((opt) => (
          <Pressable
            key={opt.key}
            style={[
              styles.sortChip,
              {
                backgroundColor: sortBy === opt.key ? theme.accent + "20" : "transparent",
                borderColor: sortBy === opt.key ? theme.accent + "60" : "transparent",
              },
            ]}
            onPress={() => onChangeSortBy(opt.key)}
          >
            <Text style={[styles.sortChipText, { color: sortBy === opt.key ? theme.accent : theme.textMuted }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={onToggleSortOrder} hitSlop={8} style={{ marginLeft: 4 }}>
          <Ionicons
            name={sortOrder === "desc" ? "arrow-down" : "arrow-up"}
            size={14}
            color={theme.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

function ReviewNotesModal({
  visible,
  onClose,
  onSubmit,
  action,
  title,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
  action: string;
  title: string;
  theme: any;
}) {
  const [notes, setNotes] = useState("");
  const insets = useSafeAreaInsets();

  const actionLabel =
    action === "approved" ? "Approve & Publish" : action === "rejected" ? "Reject" : "Request Revision";
  const actionColor = action === "approved" ? "#10B981" : action === "rejected" ? "#EF4444" : "#F97316";

  const handleSubmit = () => {
    onSubmit(notes.trim());
    setNotes("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{actionLabel}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
          <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Review Notes (optional)</Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                color: theme.text,
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this review decision..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={2000}
          />
          <View style={styles.modalActions}>
            <Pressable style={[styles.modalBtn, { backgroundColor: theme.backgroundCard }]} onPress={onClose}>
              <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, { backgroundColor: actionColor }]} onPress={handleSubmit}>
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>{actionLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PreviewModal({
  visible,
  resourceId,
  onClose,
  onRollback,
  isAdmin,
  theme,
}: {
  visible: boolean;
  resourceId: string | null;
  onClose: () => void;
  onRollback?: (resource: ResourcePreview) => void;
  isAdmin?: boolean;
  theme: any;
}) {
  const insets = useSafeAreaInsets();

  const previewPath = resourceId ? `/api/admin/pipeline/resource/${resourceId}/preview` : "";

  const { data: preview, isLoading } = useQuery<ResourcePreview>({
    queryKey: [previewPath],
    enabled: visible && !!resourceId,
  });

  const fullContent = preview?.fullContent;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.previewModalContent,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingTop: Platform.OS === "web" ? 67 : insets.top + 12,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Content Preview</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {isAdmin && preview?.resource.status === "published" && preview?.resource.supersedesResourceId && (
                <Pressable
                  onPress={() => onRollback?.(preview)}
                  hitSlop={8}
                  style={[styles.rollbackBtn, { borderColor: "#EF4444" + "60" }]}
                >
                  <Ionicons name="arrow-undo-outline" size={14} color="#EF4444" />
                  <Text style={styles.rollbackBtnText}>Rollback</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : !preview ? (
            <View style={styles.centered}>
              <Text style={{ color: theme.textSecondary }}>Failed to load preview</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={[styles.previewTitle, { color: theme.text }]}>{preview.resource.title}</Text>
              <Text style={[styles.previewDesc, { color: theme.textSecondary }]}>
                {preview.resource.description}
              </Text>

              <View style={styles.metaGrid}>
                <MetaRow label="Status" value={preview.resource.status} theme={theme} />
                <MetaRow label="Generation" value={preview.resource.generationStatus} theme={theme} />
                <MetaRow label="Review" value={preview.resource.reviewStatus} theme={theme} />
                <MetaRow label="Prompt" value={preview.resource.promptVersion || "unknown"} theme={theme} />
                <MetaRow label="Generated By" value={preview.resource.generatedBy} theme={theme} />
                <MetaRow
                  label="Created"
                  value={new Date(preview.resource.createdAt).toLocaleDateString()}
                  theme={theme}
                />
                {preview.resource.publishedAt && (
                  <MetaRow
                    label="Published"
                    value={new Date(preview.resource.publishedAt).toLocaleDateString()}
                    theme={theme}
                  />
                )}
              </View>

              {preview.generationMeta && (
                <View style={[styles.metaBlock, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <Text style={[styles.metaBlockTitle, { color: "#8B5CF6" }]}>Generation Metadata</Text>
                  {preview.generationMeta.model && (
                    <MetaRow label="Model" value={preview.generationMeta.model} theme={theme} />
                  )}
                  {preview.generationMeta.tokensUsed != null && (
                    <MetaRow
                      label="Tokens"
                      value={preview.generationMeta.tokensUsed.toLocaleString()}
                      theme={theme}
                    />
                  )}
                  {preview.generationMeta.generatedAt && (
                    <MetaRow
                      label="Generated At"
                      value={new Date(preview.generationMeta.generatedAt).toLocaleString()}
                      theme={theme}
                    />
                  )}
                </View>
              )}

              {preview.sourcePacket && (
                <View style={[styles.metaBlock, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <Text style={[styles.metaBlockTitle, { color: "#3B82F6" }]}>Source Packet</Text>
                  <MetaRow label="Title" value={preview.sourcePacket.title} theme={theme} />
                  <MetaRow label="Week" value={String(preview.sourcePacket.weekNumber)} theme={theme} />
                  <MetaRow label="Status" value={preview.sourcePacket.status} theme={theme} />
                  <MetaRow label="Hash" value={preview.sourcePacket.sourceHash.substring(0, 12)} theme={theme} />
                </View>
              )}

              {preview.reviewer && (
                <View style={[styles.metaBlock, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <Text style={[styles.metaBlockTitle, { color: "#10B981" }]}>Last Review</Text>
                  <MetaRow label="By" value={preview.reviewer.displayName || preview.reviewer.email} theme={theme} />
                  <MetaRow
                    label="At"
                    value={new Date(preview.reviewer.reviewedAt).toLocaleString()}
                    theme={theme}
                  />
                </View>
              )}

              <ReviewHistoryFeed resourceId={preview.resource.id} theme={theme} />

              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Content Sections</Text>
              {preview.contentSections.map((section) => (
                <View
                  key={section.key}
                  style={[styles.sectionBlock, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
                >
                  <Text style={[styles.sectionBlockLabel, { color: theme.accent }]}>{section.label}</Text>
                  <Text style={[styles.sectionBlockPreview, { color: theme.textSecondary }]}>
                    {section.preview}
                  </Text>
                </View>
              ))}

              {fullContent?.overview && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Full Overview</Text>
                  <Text style={[styles.previewBody, { color: theme.text }]}>{fullContent.overview}</Text>
                </>
              )}

              {fullContent?.dailyStudyPrompts && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
                    Daily Study Prompts
                  </Text>
                  {fullContent.dailyStudyPrompts.map((day: any, i: number) => (
                    <View
                      key={i}
                      style={[styles.dayCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
                    >
                      <Text style={[styles.dayTitle, { color: theme.accent }]}>
                        {day.day || `Day ${i + 1}`}
                      </Text>
                      <Text style={[styles.previewBody, { color: theme.text }]}>{day.passage || ""}</Text>
                      <Text style={[styles.previewBody, { color: theme.textSecondary, marginTop: 4 }]}>
                        {day.reflection || day.prompt || ""}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {fullContent?.discussionQuestions && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
                    Discussion Questions
                  </Text>
                  {fullContent.discussionQuestions.map((q: any, i: number) => (
                    <Text key={i} style={[styles.previewBody, { color: theme.text, marginBottom: 8 }]}>
                      {i + 1}. {typeof q === "string" ? q : q.question || q.text || JSON.stringify(q)}
                    </Text>
                  ))}
                </>
              )}

              {fullContent?.memoryVerseGuide && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
                    Memory Verse Guide
                  </Text>
                  <Text style={[styles.previewBody, { color: theme.accent }]}>
                    {fullContent.memoryVerseGuide.reference}
                  </Text>
                  <Text style={[styles.previewBody, { color: theme.text, marginTop: 4 }]}>
                    {fullContent.memoryVerseGuide.text || ""}
                  </Text>
                  {fullContent.memoryVerseGuide.techniques && (
                    <Text style={[styles.previewBody, { color: theme.textSecondary, marginTop: 4 }]}>
                      {Array.isArray(fullContent.memoryVerseGuide.techniques)
                        ? fullContent.memoryVerseGuide.techniques.join(", ")
                        : fullContent.memoryVerseGuide.techniques}
                    </Text>
                  )}
                </>
              )}

              {fullContent?.egwConnections && fullContent.egwConnections.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
                    EGW Connections
                  </Text>
                  {fullContent.egwConnections.map((conn: any, i: number) => (
                    <View
                      key={i}
                      style={[styles.dayCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
                    >
                      <Text style={[styles.dayTitle, { color: theme.accent }]}>
                        {conn.source || conn.book || `Connection ${i + 1}`}
                      </Text>
                      <Text style={[styles.previewBody, { color: theme.text }]}>
                        {conn.quote || conn.excerpt || conn.text || ""}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DiffStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    changed: { bg: "#F59E0B20", text: "#F59E0B" },
    added: { bg: "#10B98120", text: "#10B981" },
    removed: { bg: "#EF444420", text: "#EF4444" },
    unchanged: { bg: "#6B728020", text: "#6B7280" },
  };
  const colors = colorMap[status] || colorMap.unchanged;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.text }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{status}</Text>
    </View>
  );
}

function renderTextContent(value: any, type: "text" | "array" | "object"): string {
  if (!value) return "(empty)";
  if (type === "text") return String(value);
  if (type === "array" && Array.isArray(value)) {
    return value.map((item: any, i: number) => {
      if (typeof item === "string") return `${i + 1}. ${item}`;
      const text = item.question || item.studyPrompt || item.dayTitle || item.topic || item.text || item.quote || item.relevance || "";
      const label = item.day ? `Day ${item.day}` : item.reference || item.bookReference || `${i + 1}`;
      return `${label}: ${text}`;
    }).join("\n\n");
  }
  if (type === "object") {
    if (typeof value === "object") {
      return Object.entries(value)
        .filter(([k]) => k !== "_generation")
        .map(([k, v]) => {
          const displayVal = Array.isArray(v) ? (v as any[]).join(", ") : String(v || "");
          return `${k}: ${displayVal.substring(0, 200)}`;
        })
        .join("\n");
    }
  }
  return JSON.stringify(value, null, 2);
}

function DiffModal({
  visible,
  resourceId,
  onClose,
  theme,
}: {
  visible: boolean;
  resourceId: string | null;
  onClose: () => void;
  theme: any;
}) {
  const insets = useSafeAreaInsets();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const diffPath = resourceId ? `/api/admin/pipeline/resource/${resourceId}/diff` : "";

  const { data: diffData, isLoading } = useQuery<DiffData>({
    queryKey: [diffPath],
    enabled: visible && !!resourceId,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  React.useEffect(() => {
    if (diffData?.sections) {
      const changed = new Set(
        diffData.sections
          .filter((s) => s.status !== "unchanged")
          .map((s) => s.key)
      );
      setExpandedSections(changed);
    }
  }, [diffData]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.previewModalContent,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingTop: Platform.OS === "web" ? 67 : insets.top + 12,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Changes</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : !diffData?.hasPrevious ? (
            <View style={styles.centered}>
              <Ionicons name="document-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No previous version to compare
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={[styles.previewTitle, { color: theme.text }]}>
                {diffData.resource.title}
              </Text>

              {diffData.summary && (
                <View style={[styles.diffSummary, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <Text style={[styles.diffSummaryText, { color: theme.text }]}>
                    {diffData.summary.changed} of {diffData.summary.total} sections changed
                  </Text>
                </View>
              )}

              {diffData.metaDiff && (
                <View style={[styles.metaBlock, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <Text style={[styles.metaBlockTitle, { color: "#8B5CF6" }]}>Generation Metadata</Text>
                  {Object.entries(diffData.metaDiff).map(([key, meta]) => (
                    <View key={key} style={styles.diffMetaRow}>
                      <Text style={[styles.metaLabel, { color: theme.textMuted }]}>{key}</Text>
                      {meta.changed ? (
                        <View style={styles.diffMetaValues}>
                          <Text style={[styles.diffOldValue, { color: "#EF4444" }]}>
                            {meta.previous != null ? String(meta.previous) : "n/a"}
                          </Text>
                          <Ionicons name="arrow-forward" size={10} color={theme.textMuted} />
                          <Text style={[styles.diffNewValue, { color: "#10B981" }]}>
                            {meta.current != null ? String(meta.current) : "n/a"}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.metaValue, { color: theme.text }]}>
                          {meta.current != null ? String(meta.current) : "n/a"}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
                Content Sections
              </Text>

              {diffData.sections.map((section) => {
                const isExpanded = expandedSections.has(section.key);

                return (
                  <View key={section.key}>
                    <Pressable
                      style={[
                        styles.diffSectionHeader,
                        { backgroundColor: theme.backgroundCard, borderColor: theme.border },
                      ]}
                      onPress={() => toggleSection(section.key)}
                    >
                      <View style={styles.diffSectionLeft}>
                        <Ionicons
                          name={isExpanded ? "chevron-down" : "chevron-forward"}
                          size={16}
                          color={theme.textSecondary}
                        />
                        <Text style={[styles.diffSectionLabel, { color: theme.text }]}>
                          {section.label}
                        </Text>
                      </View>
                      <DiffStatusBadge status={section.status} />
                    </Pressable>

                    {isExpanded && section.status !== "unchanged" && (
                      <View style={[styles.diffContent, { borderColor: theme.border }]}>
                        {section.previous != null && (
                          <View style={[styles.diffBlock, { backgroundColor: "#EF444408", borderColor: "#EF444430" }]}>
                            <Text style={[styles.diffBlockLabel, { color: "#EF4444" }]}>Previous</Text>
                            <Text style={[styles.diffBlockText, { color: theme.textSecondary }]}>
                              {renderTextContent(section.previous, section.type)}
                            </Text>
                          </View>
                        )}
                        {section.current != null && (
                          <View style={[styles.diffBlock, { backgroundColor: "#10B98108", borderColor: "#10B98130" }]}>
                            <Text style={[styles.diffBlockLabel, { color: "#10B981" }]}>Current</Text>
                            <Text style={[styles.diffBlockText, { color: theme.text }]}>
                              {renderTextContent(section.current, section.type)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {isExpanded && section.status === "unchanged" && (
                      <View style={[styles.diffContent, { borderColor: theme.border }]}>
                        <Text style={[styles.diffUnchangedText, { color: theme.textMuted }]}>
                          Content unchanged
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function MetaRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

export default function AdminReviewScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "quarter" | "pending">("overview");
  const [filterReviewStatus, setFilterReviewStatus] = useState("pending");
  const [filterPromptVersion, setFilterPromptVersion] = useState("");
  const [filterHasNotes, setFilterHasNotes] = useState(false);
  const [filterIsRegenerated, setFilterIsRegenerated] = useState(false);
  const [filterSourceChanged, setFilterSourceChanged] = useState(false);
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "title">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [diffId, setDiffId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{ id: string; action: string; title: string } | null>(null);
  const [rollbackConfirm, setRollbackConfirm] = useState<{
    id: string;
    title: string;
    promptVersion: string;
    predecessorTitle?: string;
    predecessorPromptVersion?: string;
  } | null>(null);

  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor" || isAdmin;

  const overviewParams = new URLSearchParams({ reviewStatus: filterReviewStatus, sortBy, sortOrder });
  if (filterPromptVersion) overviewParams.set("promptVersion", filterPromptVersion);
  if (filterHasNotes) overviewParams.set("hasNotes", "true");
  if (filterIsRegenerated) overviewParams.set("isRegenerated", "true");
  if (filterSourceChanged) overviewParams.set("sourceChanged", "true");
  const overviewPath = `/api/admin/pipeline/overview?${overviewParams.toString()}`;

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<PipelineOverview>({
    queryKey: [overviewPath],
    enabled: isEditor,
  });

  const { data: quarters, isLoading: quartersLoading } = useQuery<QuarterInfo[]>({
    queryKey: ["/api/admin/pipeline/quarters"],
    enabled: isEditor,
  });

  const { data: quarterDetail, isLoading: quarterLoading } = useQuery<QuarterDetail>({
    queryKey: ["/api/admin/pipeline/quarter", selectedQuarter],
    enabled: !!selectedQuarter && isEditor,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: string; notes?: string }) => {
      return apiRequest("POST", `/api/resources/${id}/review`, { action, notes: notes || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline/overview"] });
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes("/review-history") });
      if (selectedQuarter) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline/quarter", selectedQuarter] });
      }
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (quarterCode: string) => {
      return apiRequest("POST", "/api/admin/pipeline/generate-quarter", { quarterCode });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/resources/${id}/rollback`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline"] });
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes("/review-history") });
      if (selectedQuarter) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline/quarter", selectedQuarter] });
      }
      setRollbackConfirm(null);
      setPreviewId(null);
      Alert.alert("Rollback Complete", "The previous version has been restored.");
    },
    onError: (err: any) => {
      Alert.alert("Rollback Failed", err?.message || "Could not complete rollback.");
    },
  });

  const handleApplyPreset = useCallback((preset: QueuePreset | null) => {
    if (!preset) {
      setActivePreset(null);
      setFilterReviewStatus("pending");
      setFilterHasNotes(false);
      setFilterIsRegenerated(false);
      setFilterSourceChanged(false);
      setSortBy("createdAt");
      setSortOrder("desc");
      setFilterPromptVersion("");
      return;
    }
    setActivePreset(preset.key);
    setFilterReviewStatus(preset.reviewStatus);
    setFilterHasNotes(preset.hasNotes);
    setFilterIsRegenerated(preset.isRegenerated);
    setFilterSourceChanged(preset.sourceChanged);
    setSortBy(preset.sortBy);
    setSortOrder(preset.sortOrder);
    setFilterPromptVersion(preset.promptVersion);
  }, []);

  const clearPreset = useCallback(() => {
    setActivePreset(null);
  }, []);

  const handleReviewStart = useCallback((id: string, action: string, title: string) => {
    setReviewModal({ id, action, title });
  }, []);

  const handleReviewSubmit = useCallback(
    (notes: string) => {
      if (!reviewModal) return;
      reviewMutation.mutate({ id: reviewModal.id, action: reviewModal.action, notes });
      setReviewModal(null);
    },
    [reviewModal, reviewMutation]
  );

  const handleGenerate = useCallback(
    (quarterCode: string) => {
      if (Platform.OS === "web") {
        if (confirm(`Generate all companions for ${quarterCode}? This may take several minutes.`)) {
          generateMutation.mutate(quarterCode);
        }
      } else {
        Alert.alert("Generate Quarter", `Generate all companions for ${quarterCode}?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Generate", onPress: () => generateMutation.mutate(quarterCode) },
        ]);
      }
    },
    [generateMutation]
  );

  if (!isEditor) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: "Access Denied", headerShown: true }} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Editor or admin access required
          </Text>
        </View>
      </View>
    );
  }

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const promptVersions = Object.keys(overview?.promptVersionDistribution || {});
  const pendingCount = overview?.companions?.byReviewStatus?.pending ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: "Content Pipeline",
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      />

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.backgroundCard,
            borderBottomColor: theme.border,
            marginTop: Platform.OS === "web" ? webTopInset : 0,
          },
        ]}
      >
        {(["overview", "pending", "quarter"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.accent : theme.textSecondary }]}>
              {tab === "overview"
                ? "Overview"
                : tab === "pending"
                ? `Review (${pendingCount})`
                : "Quarter"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === "web" ? 34 : insets.bottom) }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetchOverview()} tintColor={theme.accent} />
        }
      >
        {activeTab === "overview" && (
          <OverviewTab overview={overview} isLoading={overviewLoading} theme={theme} />
        )}

        {activeTab === "pending" && (
          <>
            <FilterBar
              reviewStatus={filterReviewStatus}
              promptVersion={filterPromptVersion}
              promptVersions={promptVersions}
              hasNotes={filterHasNotes}
              isRegenerated={filterIsRegenerated}
              sortBy={sortBy}
              sortOrder={sortOrder}
              activePreset={activePreset}
              presetCounts={overview?.presetCounts}
              onChangeReviewStatus={(v) => { clearPreset(); setFilterReviewStatus(v); }}
              onChangePromptVersion={(v) => { clearPreset(); setFilterPromptVersion(v); }}
              onToggleHasNotes={() => { clearPreset(); setFilterHasNotes(v => !v); }}
              onToggleIsRegenerated={() => { clearPreset(); setFilterIsRegenerated(v => !v); }}
              onChangeSortBy={(v) => { clearPreset(); setSortBy(v); }}
              onToggleSortOrder={() => { clearPreset(); setSortOrder(v => v === "desc" ? "asc" : "desc"); }}
              onApplyPreset={handleApplyPreset}
              theme={theme}
            />
            <PendingTab
              items={overview?.filteredList || []}
              isLoading={overviewLoading}
              isAdmin={isAdmin}
              onReview={handleReviewStart}
              onPreview={setPreviewId}
              onDiff={setDiffId}
              reviewLoading={reviewMutation.isPending}
              theme={theme}
            />
          </>
        )}

        {activeTab === "quarter" && (
          <QuarterTab
            quarters={quarters || []}
            selectedQuarter={selectedQuarter}
            quarterDetail={quarterDetail}
            quartersLoading={quartersLoading}
            quarterLoading={quarterLoading}
            isAdmin={isAdmin}
            onSelectQuarter={setSelectedQuarter}
            onGenerate={handleGenerate}
            generateLoading={generateMutation.isPending}
            generateSuccess={generateMutation.isSuccess}
            onReview={handleReviewStart}
            reviewLoading={reviewMutation.isPending}
            theme={theme}
          />
        )}
      </ScrollView>

      <ReviewNotesModal
        visible={!!reviewModal}
        onClose={() => setReviewModal(null)}
        onSubmit={handleReviewSubmit}
        action={reviewModal?.action || ""}
        title={reviewModal?.title || ""}
        theme={theme}
      />

      <PreviewModal
        visible={!!previewId}
        resourceId={previewId}
        onClose={() => setPreviewId(null)}
        isAdmin={isAdmin}
        onRollback={(preview) => {
          setRollbackConfirm({
            id: preview.resource.id,
            title: preview.resource.title,
            promptVersion: preview.resource.promptVersion,
            predecessorTitle: preview.predecessor?.title,
            predecessorPromptVersion: preview.predecessor?.promptVersion,
          });
        }}
        theme={theme}
      />

      <DiffModal
        visible={!!diffId}
        resourceId={diffId}
        onClose={() => setDiffId(null)}
        theme={theme}
      />

      <Modal visible={!!rollbackConfirm} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.rollbackModalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Confirm Rollback</Text>
              <Pressable onPress={() => setRollbackConfirm(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={{ gap: 12, paddingVertical: 16 }}>
              <View style={[styles.rollbackWarning, { backgroundColor: "#EF4444" + "15", borderColor: "#EF4444" + "40" }]}>
                <Ionicons name="warning-outline" size={18} color="#EF4444" />
                <Text style={[styles.rollbackWarningText, { color: "#EF4444" }]}>
                  This will archive the current published version and restore its predecessor.
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.rollbackLabel, { color: theme.textMuted }]}>Current (will be archived)</Text>
                <Text style={[styles.rollbackValue, { color: theme.text }]} numberOfLines={2}>
                  {rollbackConfirm?.title}
                </Text>
                <Text style={[styles.rollbackMeta, { color: theme.textSecondary }]}>
                  Prompt {rollbackConfirm?.promptVersion}
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.rollbackLabel, { color: theme.textMuted }]}>Predecessor (will be restored)</Text>
                {rollbackConfirm?.predecessorTitle ? (
                  <>
                    <Text style={[styles.rollbackValue, { color: theme.text }]} numberOfLines={2}>
                      {rollbackConfirm.predecessorTitle}
                    </Text>
                    <Text style={[styles.rollbackMeta, { color: theme.textSecondary }]}>
                      Prompt {rollbackConfirm.predecessorPromptVersion}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.rollbackMeta, { color: theme.textSecondary }]}>
                    The archived version this resource superseded will be republished.
                  </Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
              <Pressable
                onPress={() => setRollbackConfirm(null)}
                style={[styles.rollbackCancelBtn, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.textSecondary, fontFamily: "Inter_500Medium", fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (rollbackConfirm) rollbackMutation.mutate(rollbackConfirm.id);
                }}
                disabled={rollbackMutation.isPending}
                style={[styles.rollbackConfirmBtn, { opacity: rollbackMutation.isPending ? 0.6 : 1 }]}
              >
                {rollbackMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Rollback</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function OverviewTab({
  overview,
  isLoading,
  theme,
}: {
  overview?: PipelineOverview;
  isLoading: boolean;
  theme: any;
}) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }
  if (!overview) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.textSecondary }}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Pipeline Status</Text>
      <View style={styles.statsRow}>
        <StatCard label="Source Packets" value={overview.sourcePackets.total} color="#3B82F6" />
        <StatCard label="Companions" value={overview.companions.total} color="#10B981" />
        <StatCard label="Coverage" value={`${overview.coverage.coveragePercent}%`} color="#C9933A" />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Generation Status</Text>
      <View style={styles.statsRow}>
        {Object.entries(overview.companions.byGenerationStatus).map(([status, count]) => (
          <StatCard
            key={status}
            label={status}
            value={count}
            color={status === "completed" ? "#10B981" : status === "failed" ? "#EF4444" : "#6B7280"}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Review Status</Text>
      <View style={styles.statsRow}>
        {Object.entries(overview.companions.byReviewStatus).map(([status, count]) => (
          <StatCard
            key={status}
            label={status}
            value={count}
            color={status === "approved" ? "#10B981" : status === "pending" ? "#F59E0B" : "#EF4444"}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Prompt Versions</Text>
      <View style={styles.statsRow}>
        {Object.entries(overview.promptVersionDistribution).map(([version, count]) => (
          <StatCard key={version} label={version} value={count} color="#8B5CF6" />
        ))}
      </View>

      {overview.failedGenerations.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: "#EF4444", marginTop: 20 }]}>Failed Generations</Text>
          {overview.failedGenerations.map((item) => (
            <View
              key={item.id}
              style={[styles.listItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
            >
              <Text style={[styles.listTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.listSub, { color: theme.textMuted }]}>
                {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function PendingTab({
  items,
  isLoading,
  isAdmin,
  onReview,
  onPreview,
  onDiff,
  reviewLoading,
  theme,
}: {
  items: FilteredItem[];
  isLoading: boolean;
  isAdmin: boolean;
  onReview: (id: string, action: string, title: string) => void;
  onPreview: (id: string) => void;
  onDiff: (id: string) => void;
  reviewLoading: boolean;
  theme: any;
}) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No items matching filters</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{items.length} Items</Text>
      {items.map((item) => (
        <View
          key={item.id}
          style={[
            styles.reviewCard,
            { backgroundColor: theme.backgroundCard, borderColor: theme.border },
            item.isRegenerated && styles.reviewCardRegenerated,
          ]}
        >
          <View style={styles.reviewHeader}>
            <Pressable onPress={() => onPreview(item.id)} style={styles.reviewTitleArea}>
              <Text style={[styles.reviewTitle, { color: theme.text }]} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
            <View style={styles.reviewHeaderIcons}>
              {item.hasPreviousVersion && (
                <Pressable onPress={() => onDiff(item.id)} hitSlop={8}>
                  <Ionicons name="git-compare-outline" size={18} color="#F59E0B" />
                </Pressable>
              )}
              <Pressable onPress={() => onPreview(item.id)} hitSlop={8}>
                <Ionicons name="eye-outline" size={18} color={theme.accent} />
              </Pressable>
            </View>
          </View>
          <View style={styles.reviewMeta}>
            <StatusBadge status={item.reviewStatus} type="review" />
            {item.isRegenerated && (
              <View style={[styles.versionBadge, { backgroundColor: "#F59E0B" + "20", borderColor: "#F59E0B" + "40" }]}>
                <Ionicons name="git-compare-outline" size={10} color="#F59E0B" />
                <Text style={[styles.versionBadgeText, { color: "#F59E0B" }]}>Regenerated</Text>
              </View>
            )}
            {item.sourceChanged && (
              <View style={[styles.versionBadge, { backgroundColor: "#3B82F6" + "20", borderColor: "#3B82F6" + "40" }]}>
                <Ionicons name="sync-outline" size={10} color="#3B82F6" />
                <Text style={[styles.versionBadgeText, { color: "#3B82F6" }]}>Source Changed</Text>
              </View>
            )}
            <Text style={[styles.reviewMetaText, { color: theme.textMuted }]}>{item.promptVersion}</Text>
            <Text style={[styles.reviewMetaText, { color: theme.textMuted }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {item.reviewNotes && (
            <View style={[styles.notesPreview, { borderColor: "#F97316" + "40" }]}>
              <Ionicons name="document-text-outline" size={12} color="#F97316" />
              <Text style={[styles.notesPreviewText, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.reviewNotes}
              </Text>
            </View>
          )}
          {item.reviewStatus === "pending" && (
            <View style={styles.reviewActions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                onPress={() => onReview(item.id, "approved", item.title)}
                disabled={reviewLoading}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#F97316" }]}
                onPress={() => onReview(item.id, "needs_revision", item.title)}
                disabled={reviewLoading}
              >
                <Ionicons name="create" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Revise</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                onPress={() => onReview(item.id, "rejected", item.title)}
                disabled={reviewLoading}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function QuarterTab({
  quarters,
  selectedQuarter,
  quarterDetail,
  quartersLoading,
  quarterLoading,
  isAdmin,
  onSelectQuarter,
  onGenerate,
  generateLoading,
  generateSuccess,
  onReview,
  reviewLoading,
  theme,
}: {
  quarters: QuarterInfo[];
  selectedQuarter: string | null;
  quarterDetail?: QuarterDetail;
  quartersLoading: boolean;
  quarterLoading: boolean;
  isAdmin: boolean;
  onSelectQuarter: (code: string) => void;
  onGenerate: (code: string) => void;
  generateLoading: boolean;
  generateSuccess: boolean;
  onReview: (id: string, action: string, title: string) => void;
  reviewLoading: boolean;
  theme: any;
}) {
  if (quartersLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Quarters</Text>
      {quarters.map((q) => (
        <Pressable
          key={q.quarterCode}
          style={[
            styles.quarterCard,
            {
              backgroundColor: theme.backgroundCard,
              borderColor: selectedQuarter === q.quarterCode ? theme.accent : theme.border,
            },
          ]}
          onPress={() => onSelectQuarter(q.quarterCode)}
        >
          <View style={styles.quarterHeader}>
            <Text style={[styles.quarterCode, { color: theme.accent }]}>{q.quarterCode}</Text>
            <Text style={[styles.quarterCoverage, { color: theme.textSecondary }]}>
              {q.companionCount}/{q.lessonCount}
            </Text>
          </View>
          <Text style={[styles.quarterTitle, { color: theme.text }]} numberOfLines={2}>
            {q.title}
          </Text>
          {isAdmin && (
            <Pressable
              style={[styles.generateBtn, { backgroundColor: theme.accent, opacity: generateLoading ? 0.6 : 1 }]}
              onPress={() => onGenerate(q.quarterCode)}
              disabled={generateLoading}
            >
              {generateLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={14} color="#fff" />
                  <Text style={styles.generateBtnText}>
                    {generateSuccess ? "Started" : "Generate All"}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </Pressable>
      ))}

      {selectedQuarter && quarterLoading && (
        <View style={[styles.centered, { marginTop: 20 }]}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}

      {selectedQuarter && quarterDetail && !quarterLoading && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
            Lessons ({quarterDetail.summary.totalLessons})
          </Text>
          <View style={styles.summaryRow}>
            <StatCard label="Packets" value={quarterDetail.summary.packetsBuilt} color="#3B82F6" />
            <StatCard label="Generated" value={quarterDetail.summary.companionsGenerated} color="#10B981" />
            <StatCard label="Published" value={quarterDetail.summary.published} color="#C9933A" />
          </View>

          {quarterDetail.lessons.map((lesson) => (
            <View
              key={lesson.lessonId}
              style={[styles.lessonRow, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
            >
              <View style={styles.lessonHeader}>
                <View
                  style={[styles.lessonNum, { backgroundColor: lesson.companion ? "#10B981" : theme.border }]}
                >
                  <Text
                    style={[styles.lessonNumText, { color: lesson.companion ? "#fff" : theme.textMuted }]}
                  >
                    {lesson.lessonNumber}
                  </Text>
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={[styles.lessonTitle, { color: theme.text }]} numberOfLines={1}>
                    {lesson.title}
                  </Text>
                  <View style={styles.lessonBadges}>
                    {lesson.packet && <StatusBadge status={lesson.packet.status} type="resource" />}
                    {lesson.companion && (
                      <>
                        <StatusBadge status={lesson.companion.status} type="resource" />
                        <StatusBadge status={lesson.companion.reviewStatus} type="review" />
                      </>
                    )}
                    {!lesson.companion && (
                      <Text style={[styles.noCompanion, { color: theme.textMuted }]}>No companion</Text>
                    )}
                  </View>
                </View>
              </View>

              {lesson.companion && lesson.companion.reviewStatus === "pending" && (
                <View style={[styles.reviewActions, { marginTop: 8 }]}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                    onPress={() => onReview(lesson.companion!.id, "approved", lesson.title)}
                    disabled={reviewLoading}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                    onPress={() => onReview(lesson.companion!.id, "rejected", lesson.title)}
                    disabled={reviewLoading}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12, textAlign: "center" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scrollContent: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    minWidth: 90,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2, textTransform: "capitalize" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginRight: 4 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  listItem: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  listTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listSub: { fontSize: 12, marginTop: 2 },
  reviewCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  reviewCardRegenerated: { borderLeftWidth: 3, borderLeftColor: "#F59E0B" },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reviewTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reviewMeta: { flexDirection: "row", gap: 12, marginTop: 6, alignItems: "center" },
  reviewMetaText: { fontSize: 12 },
  reviewActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  quarterCard: { padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 10 },
  quarterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quarterCode: { fontSize: 13, fontFamily: "Inter_700Bold" },
  quarterCoverage: { fontSize: 12, fontFamily: "Inter_500Medium" },
  quarterTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  generateBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  lessonRow: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  lessonHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  lessonNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  lessonNumText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  lessonBadges: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  noCompanion: { fontSize: 11, fontStyle: "italic" },
  filterBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  filterDivider: { width: 1, height: 20, backgroundColor: "#333", marginHorizontal: 4 },
  presetRow: { flexDirection: "row", gap: 6, alignItems: "center", paddingBottom: 8 },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  presetCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 5,
    marginLeft: 2,
  },
  presetCountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  sortRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  sortChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  sortChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  rollbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  rollbackBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
  rollbackModalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  rollbackWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rollbackWarningText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  rollbackLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  rollbackValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rollbackMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rollbackCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  rollbackConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#EF4444",
  },
  notesPreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderLeftWidth: 2,
    borderRadius: 4,
  },
  notesPreviewText: { fontSize: 12, flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
  },
  previewModalContent: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    fontFamily: "Inter_400Regular",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  previewTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 8 },
  previewDesc: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  previewBody: { fontSize: 14, lineHeight: 20 },
  metaGrid: { marginTop: 16, gap: 4 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  metaLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  metaValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  metaBlock: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  metaBlockTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sectionBlock: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  sectionBlockLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  sectionBlockPreview: { fontSize: 12 },
  dayCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  dayTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  reviewTitleArea: { flex: 1, marginRight: 8 },
  versionBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  versionBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  reviewHeaderIcons: { flexDirection: "row", gap: 10, alignItems: "center" },
  diffSummary: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  diffSummaryText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  diffSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  diffSectionLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  diffSectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  diffContent: {
    marginHorizontal: 4,
    paddingVertical: 8,
    borderLeftWidth: 2,
    paddingLeft: 12,
    marginBottom: 4,
  },
  diffBlock: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  diffBlockLabel: { fontSize: 11, fontFamily: "Inter_700Bold", marginBottom: 4, textTransform: "uppercase" },
  diffBlockText: { fontSize: 13, lineHeight: 19 },
  diffUnchangedText: { fontSize: 12, fontStyle: "italic", paddingVertical: 4 },
  diffMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  diffMetaValues: { flexDirection: "row", alignItems: "center", gap: 6 },
  diffOldValue: { fontSize: 12, fontFamily: "Inter_500Medium", textDecorationLine: "line-through" },
  diffNewValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  historyEntry: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  historyActionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyActionText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  historyTransition: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  historyAuthor: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  historyDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  historyNotes: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontFamily: "Inter_400Regular",
  },
});
