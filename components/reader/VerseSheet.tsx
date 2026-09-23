import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { AIGeneratedLabel } from "@/components/AIGeneratedLabel";
import { apiRequest } from "@/lib/query-client";
import {
  formatStrongId,
  wordStudyChipsForVerse,
  type ReaderStrongMap,
} from "@/lib/reader-word-study";
import { SABBATH_SCHOOL_READING_OVERLAY } from "@/lib/sabbath-school-route-containment";
import {
  refreshVerseMapAfterGeneration,
  VerseMapGenerationGate,
} from "@/lib/verse-map-generation";
import {
  VERSE_SHEET_ATTRIBUTION,
  VERSE_SHEET_COLLAPSED_HEIGHT,
  VERSE_SHEET_HIGHLIGHTS,
  formatSheetReference,
  type VerseSheetHighlightKey,
} from "@/lib/verse-sheet";

export { VERSE_SHEET_COLLAPSED_HEIGHT };

const INK = PathB.ink;
const MUTED = "#6B6660";
const BORDER = "#E7E0D2";
const PILL = "#F1EBDD";

type VerseSheetContext = {
  commentators: { id: string; name: string; content: string }[];
  ellenWhite: {
    id: string;
    kind: "egw" | "pioneer";
    title: string;
    subtitle: string;
    hrefKind: "egw" | "pioneer";
  }[];
  sabbathSchool: {
    dayNumber: number;
    title: string;
    lessonNumber: number;
    quarterCode: string;
  } | null;
  hasBookOverview?: boolean;
};

type CrossRef = {
  ref: string;
  text: string;
  connection: string;
  source?: string;
};

type VerseMapPayload = {
  words?: ReaderStrongMap[];
  crossReferences?: CrossRef[];
  relatedVerses?: CrossRef[];
  hasCachedData?: boolean;
};

function SheetAction({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      testID={`reader-verse-action-${label.toLowerCase()}`}
      style={({ pressed }) => [s.action, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={active ? PathB.coral : INK} />
      <Text style={[s.actionLabel, active ? s.actionLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function CollapsibleSection({
  title,
  testID,
  children,
}: {
  title: string;
  testID: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <View style={s.section} testID={testID}>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={`${open ? "Collapse" : "Expand"} ${title}`}
        style={s.sectionHead}
      >
        <Text style={s.sectionTitle}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={MUTED} />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

export function VerseSheet({
  verses,
  bookName,
  bookId,
  chapter,
  translation,
  bottomPad,
  maps,
  userId,
  isAuthenticated,
  onHighlight,
  onRemoveHighlight,
  onBookmark,
  onCopy,
  onShare,
  onDismiss,
  onWordActivate,
  onOpenDeepDive,
  onOpenBookOverview,
  activeColor,
  bookmarked,
  notice,
}: {
  verses: { id: string; verse: number; text: string }[];
  bookName: string;
  bookId: string;
  chapter: string;
  translation: string;
  bottomPad: number;
  maps: ReaderStrongMap[];
  userId: string | null;
  isAuthenticated: boolean;
  onHighlight: (color: VerseSheetHighlightKey) => void;
  onRemoveHighlight: () => void;
  onBookmark: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDismiss: () => void;
  onWordActivate: (surface: string, mapping: ReaderStrongMap) => void;
  onOpenDeepDive: () => void;
  onOpenBookOverview: () => void;
  activeColor: VerseSheetHighlightKey | null;
  bookmarked: boolean;
  notice?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const queryClient = useQueryClient();
  const { height: windowHeight } = useWindowDimensions();
  const expandedHeight = Math.round(windowHeight * 0.78);
  const verseMapGenerationGate = useRef(new VerseMapGenerationGate()).current;

  const sorted = useMemo(
    () => [...verses].sort((a, b) => a.verse - b.verse),
    [verses],
  );
  const first = sorted[0];
  const reference = formatSheetReference(
    bookName,
    chapter,
    sorted.map((v) => v.verse),
  );
  const showingLabel =
    sorted.length > 1 && first
      ? `Showing ${bookName} ${chapter}:${first.verse}`
      : null;

  const verseMapKey = first?.id
    ? `/api/verse-map/${encodeURIComponent(first.id)}?translation=${encodeURIComponent(translation)}`
    : null;

  const contextQuery = useQuery<VerseSheetContext>({
    queryKey: [
      `/api/verse-sheet?bookId=${encodeURIComponent(bookId)}&chapter=${encodeURIComponent(chapter)}&verse=${encodeURIComponent(String(first?.verse ?? ""))}&bookName=${encodeURIComponent(bookName)}&fields=overview`,
    ],
    enabled: expanded && !!first,
  });

  const xrefQuery = useQuery<VerseMapPayload>({
    queryKey: [verseMapKey as string],
    enabled: expanded && !!verseMapKey,
  });

  const sheetMaps = useMemo<ReaderStrongMap[]>(() => {
    if (maps.length > 0) return maps;
    return Array.isArray(xrefQuery.data?.words) ? xrefQuery.data.words : [];
  }, [maps, xrefQuery.data?.words]);

  const chips = useMemo(
    () => (first ? wordStudyChipsForVerse(first.text, sheetMaps) : []),
    [first, sheetMaps],
  );

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -36) {
          setExpanded(true);
          return;
        }
        if (g.dy > 36) {
          if (expandedRef.current) setExpanded(false);
          else onDismiss();
        }
      },
    }),
  ).current;

  const commentators = contextQuery.data?.commentators ?? [];
  const ellenWhite = useMemo(() => {
    const rows = contextQuery.data?.ellenWhite ?? [];
    return [
      ...rows.filter((row) => row.kind === "egw"),
      ...rows.filter((row) => row.kind !== "egw"),
    ];
  }, [contextQuery.data?.ellenWhite]);
  const sabbathSchool = contextQuery.data?.sabbathSchool?.title
    ? contextQuery.data.sabbathSchool
    : null;
  const crossRefs = (xrefQuery.data?.relatedVerses ?? xrefQuery.data?.crossReferences ?? []).filter(
    (row) => row.ref,
  );
  const loadingExpanded = expanded && (contextQuery.isLoading || xrefQuery.isLoading);

  useEffect(() => {
    verseMapGenerationGate.resetFor(verseMapKey);
  }, [verseMapKey, verseMapGenerationGate]);

  useEffect(() => {
    if (!expanded || !verseMapKey || !first?.id || !reference) return;
    if (xrefQuery.isLoading || !xrefQuery.isFetched) return;
    if (crossRefs.length > 0) return;
    if (!verseMapGenerationGate.tryStart(verseMapKey)) return;
    void apiRequest("POST", "/api/verse-map/generate", {
      verseId: first.id,
      verseReference: reference,
      translation,
    })
      .then(() => refreshVerseMapAfterGeneration(queryClient, verseMapKey))
      .catch(() => {});
  }, [
    expanded,
    verseMapKey,
    first?.id,
    reference,
    translation,
    xrefQuery.isLoading,
    xrefQuery.isFetched,
    crossRefs.length,
    queryClient,
    verseMapGenerationGate,
  ]);

  const saveNote = async () => {
    if (!isAuthenticated || !userId) return;
    if (!noteText.trim() || !first) return;
    setNoteBusy(true);
    try {
      await apiRequest("POST", "/api/notes", {
        userId,
        verseId: first.id,
        content: noteText.trim(),
      });
      setNoteText("");
      setShowNote(false);
    } finally {
      setNoteBusy(false);
    }
  };

  return (
    <>
      {expanded ? (
        <Pressable
          testID="reader-verse-sheet-dim"
          accessibilityLabel="Dismiss verse sheet"
          onPress={onDismiss}
          style={s.dim}
        />
      ) : null}
      <View
        testID="reader-verse-sheet"
        accessibilityRole="toolbar"
        accessibilityLabel={`${sorted.length} verse${sorted.length === 1 ? "" : "s"} selected`}
        style={[
          s.sheet,
          {
            paddingBottom: bottomPad + 8,
            ...(expanded
              ? { height: expandedHeight, maxHeight: expandedHeight }
              : {}),
          },
        ]}
      >
        <View {...pan.panHandlers}>
          <Pressable
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Collapse verse sheet" : "Expand verse sheet"}
            testID="reader-verse-sheet-handle"
            hitSlop={8}
            style={s.handleHit}
          >
            <View style={s.handle} />
          </Pressable>
          <Text style={s.ref} numberOfLines={1} testID="reader-verse-sheet-ref">
            {reference}
          </Text>
          {notice ? (
            <Text style={s.notice} testID="reader-verse-sheet-notice">
              {notice}
            </Text>
          ) : null}
        </View>

        <View style={s.actions}>
          <View style={s.colorRow}>
            {VERSE_SHEET_HIGHLIGHTS.map((dot) => {
              const isActive = activeColor === dot.key;
              return (
                <Pressable
                  key={dot.key}
                  onPress={() => (isActive ? onRemoveHighlight() : onHighlight(dot.key))}
                  accessibilityLabel={
                    isActive ? `Remove ${dot.label} highlight` : `Highlight ${dot.label}`
                  }
                  testID={`reader-verse-highlight-${dot.key}`}
                  style={({ pressed }) => [
                    s.dot,
                    {
                      backgroundColor: dot.bg,
                      opacity: pressed ? 0.65 : 1,
                    },
                    isActive ? s.dotActive : null,
                  ]}
                />
              );
            })}
            <Pressable
              onPress={onRemoveHighlight}
              accessibilityLabel="Remove highlight"
              testID="reader-verse-highlight-remove"
              style={({ pressed }) => [s.removeDot, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Ionicons name="close" size={11} color={INK} />
            </Pressable>
          </View>
          <SheetAction
            icon={bookmarked ? "bookmark" : "bookmark-outline"}
            label="Bookmark"
            onPress={onBookmark}
            active={bookmarked}
          />
          <SheetAction
            icon="create-outline"
            label="Note"
            onPress={() => setShowNote((prev) => !prev)}
          />
          <SheetAction icon="copy-outline" label="Copy" onPress={onCopy} />
          <SheetAction icon="share-outline" label="Share" onPress={onShare} />
        </View>

        {showNote ? (
          <View style={s.noteBox} testID="reader-verse-sheet-note">
            <TextInput
              style={s.noteInput}
              placeholder={isAuthenticated ? "Write a note…" : "Sign in to save notes"}
              placeholderTextColor={MUTED}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              editable={isAuthenticated}
              maxLength={500}
            />
            <View style={s.noteRow}>
              <Pressable onPress={() => setShowNote(false)} hitSlop={8}>
                <Text style={s.noteCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveNote()}
                disabled={!isAuthenticated || noteBusy || !noteText.trim()}
                style={[s.noteSave, { opacity: !isAuthenticated || !noteText.trim() ? 0.4 : 1 }]}
              >
                <Text style={s.noteSaveText}>{noteBusy ? "Saving" : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {expanded ? (
          <ScrollView
            testID="reader-verse-sheet-expanded"
            style={s.expandedScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.expandedBody}
          >
            {showingLabel ? (
              <Text style={s.showing} testID="reader-verse-sheet-showing">
                {showingLabel}
              </Text>
            ) : null}
            {loadingExpanded ? (
              <ActivityIndicator color={INK} style={{ marginVertical: 16 }} />
            ) : null}

            {chips.length > 0 ? (
              <CollapsibleSection title="Words" testID="reader-verse-sheet-words">
                <View style={s.chipWrap}>
                  {chips.map((chip) => {
                    const mapping = sheetMaps[chip.mapIndex];
                    if (!mapping) return null;
                    return (
                      <Pressable
                        key={`${chip.mapIndex}-${chip.strongId}`}
                        onPress={() => onWordActivate(chip.surface, mapping)}
                        accessibilityRole="button"
                        accessibilityLabel={`${chip.surface} ${chip.strongId}`}
                        style={({ pressed }) => [s.chip, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Text style={s.chipText}>
                          {chip.surface}
                          {" → "}
                          {formatStrongId(chip.strongId)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </CollapsibleSection>
            ) : null}

            {commentators.length > 0 ? (
              <CollapsibleSection title="Classic Commentators" testID="reader-verse-sheet-commentators">
                {commentators.map((item) => {
                  const open = !!openComments[item.id];
                  return (
                    <View key={item.id} style={s.card}>
                      <Text style={s.cardTitle}>{item.name}</Text>
                      <Text style={s.cardBody} numberOfLines={open ? undefined : 3}>
                        {item.content}
                      </Text>
                      {item.content.trim().length > 180 ? (
                        <Pressable
                          onPress={() =>
                            setOpenComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                          }
                          hitSlop={6}
                        >
                          <Text style={s.readMore}>{open ? "Show less" : "Read more"}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </CollapsibleSection>
            ) : null}

            {crossRefs.length > 0 ? (
              <CollapsibleSection title="Cross-references" testID="reader-verse-sheet-xrefs">
                {crossRefs.map((row, index) => (
                  <View key={`${row.ref}-${index}`} style={s.card}>
                    <View style={s.xrefHead}>
                      <Text style={s.cardTitle}>{row.ref}</Text>
                      <AIGeneratedLabel />
                    </View>
                    {row.text ? <Text style={s.cardBody}>{row.text}</Text> : null}
                    {row.connection ? <Text style={s.cardMeta}>{row.connection}</Text> : null}
                  </View>
                ))}
              </CollapsibleSection>
            ) : null}

            {ellenWhite.length > 0 ? (
              <CollapsibleSection title="Ellen White & Pioneers" testID="reader-verse-sheet-egw">
                {ellenWhite.map((row) => (
                  <Pressable
                    key={`${row.hrefKind}-${row.id}`}
                    onPress={() =>
                      router.push({
                        pathname: "/pioneer-chapter",
                        params: {
                          id: row.id,
                          ...(row.hrefKind === "egw" ? { kind: "egw" } : {}),
                        },
                      } as any)
                    }
                    style={({ pressed }) => [s.linkRow, { opacity: pressed ? 0.65 : 1 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.linkTitle}>{row.title}</Text>
                      <Text style={s.cardMeta}>{row.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  </Pressable>
                ))}
              </CollapsibleSection>
            ) : null}

            {sabbathSchool?.title ? (
              <CollapsibleSection title="Sabbath School" testID="reader-verse-sheet-ss">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: SABBATH_SCHOOL_READING_OVERLAY,
                      params: {
                        lessonNumber: String(sabbathSchool.lessonNumber),
                        dayNumber: String(sabbathSchool.dayNumber),
                        quarterCode: sabbathSchool.quarterCode,
                      },
                    } as any)
                  }
                  style={({ pressed }) => [s.linkRow, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.linkTitle}>{sabbathSchool.title}</Text>
                    <Text style={s.cardMeta}>This week’s lesson cites this verse</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </Pressable>
              </CollapsibleSection>
            ) : null}

            <CollapsibleSection title="See also" testID="reader-verse-sheet-see-also">
              {first ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/verse-explain" as any,
                      params: {
                        bookId,
                        bookName,
                        chapter,
                        verse: String(first.verse),
                        verseId: first.id,
                        text: first.text,
                        translation,
                      },
                    })
                  }
                  testID="reader-verse-sheet-explain"
                  style={({ pressed }) => [s.linkRow, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <AIGeneratedLabel />
                    <Text style={s.linkTitle}>Explain This Verse</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={onOpenDeepDive}
                style={({ pressed }) => [s.linkRow, { opacity: pressed ? 0.65 : 1 }]}
              >
                <Text style={s.linkTitle}>Deep Dive</Text>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </Pressable>
              {contextQuery.data?.hasBookOverview ? (
                <Pressable
                  onPress={onOpenBookOverview}
                  testID="reader-verse-book-overview"
                  style={({ pressed }) => [s.linkRow, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <Text style={s.linkTitle}>Book overview</Text>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </Pressable>
              ) : null}
            </CollapsibleSection>

            <Text style={s.footer}>{VERSE_SHEET_ATTRIBUTION}</Text>
          </ScrollView>
        ) : null}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31, 26, 18, 0.4)",
    zIndex: 190,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingTop: 6,
    flexDirection: "column",
    overflow: "hidden",
    shadowColor: "#1F1A12",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  expandedScroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  handleHit: {
    alignItems: "center",
    paddingVertical: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8D0BE",
  },
  ref: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
    color: INK,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  notice: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: -4,
    marginBottom: 6,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
    zIndex: 2,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(31,26,18,0.12)",
  },
  dotActive: {
    borderWidth: 2,
    borderColor: INK,
  },
  removeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(31,26,18,0.28)",
    backgroundColor: "#F1EBDD",
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
  },
  actionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: INK,
  },
  actionLabelActive: {
    color: PathB.coral,
    fontFamily: "Inter_600SemiBold",
  },
  noteBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  noteInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: INK,
    backgroundColor: PILL,
    textAlignVertical: "top",
  },
  noteRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
  },
  noteCancel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },
  noteSave: {
    backgroundColor: INK,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  noteSaveText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  expandedBody: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 4,
  },
  showing: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
    marginBottom: 8,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: MUTED,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: PILL,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: INK,
  },
  card: {
    backgroundColor: PILL,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: INK,
  },
  cardBody: {
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: INK,
  },
  cardMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },
  readMore: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: INK,
    marginTop: 2,
  },
  xrefHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  aiLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: MUTED,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  linkTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: INK,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
    marginTop: 12,
  },
});
