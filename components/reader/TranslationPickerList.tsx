import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PathB } from "@/constants/colors";
import {
  availableCatalog,
  filterTranslationGroups,
  groupTranslationsByLanguage,
  type CatalogTranslation,
  type TranslationLanguageGroup,
} from "@/lib/translation-catalog";

const INK = "#1F1A12";
const INK_MUTED = "#6B6660";
const PILL = "#F1EBDD";
const BORDER = "#E7E0D2";

type Row =
  | { kind: "language"; key: string; group: TranslationLanguageGroup; expanded: boolean }
  | { kind: "translation"; key: string; entry: CatalogTranslation };

interface Props {
  catalog: CatalogTranslation[] | undefined;
  selected: string;
  onSelect: (code: string) => void;
  /** A code to leave out, e.g. the primary translation in the side-by-side picker. */
  exclude?: string;
  maxHeight?: number;
  testID?: string;
}

/** Translation picker grouped by language, English first, with search across every version. */
export function TranslationPickerList({ catalog, selected, onSelect, exclude, maxHeight = 420, testID }: Props) {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const groups = useMemo(
    () =>
      groupTranslationsByLanguage(
        availableCatalog(catalog).filter((entry) => !exclude || entry.abbreviation !== exclude),
      ),
    [catalog, exclude],
  );
  const [openLanguages, setOpenLanguages] = useState<Set<string>>(() => {
    const open = new Set<string>(["English"]);
    const current = groupTranslationsByLanguage(availableCatalog(catalog)).find((group) =>
      group.entries.some((entry) => entry.abbreviation === selected),
    );
    if (current) open.add(current.languageName);
    return open;
  });

  const toggleLanguage = useCallback((languageName: string) => {
    setOpenLanguages((previous) => {
      const next = new Set(previous);
      if (next.has(languageName)) next.delete(languageName);
      else next.add(languageName);
      return next;
    });
  }, []);

  const searching = query.trim().length > 0;
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const group of filterTranslationGroups(groups, query)) {
      const expanded = searching || openLanguages.has(group.languageName);
      out.push({ kind: "language", key: `lang-${group.languageName}`, group, expanded });
      if (expanded) {
        for (const entry of group.entries) {
          out.push({ kind: "translation", key: `tx-${entry.abbreviation}`, entry });
        }
      }
    }
    return out;
  }, [groups, query, searching, openLanguages]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === "language") {
        const count = item.group.entries.length;
        return (
          <Pressable
            onPress={() => toggleLanguage(item.group.languageName)}
            disabled={searching}
            accessibilityRole="button"
            accessibilityState={{ expanded: item.expanded }}
            accessibilityLabel={`${item.group.languageName}, ${count} ${count === 1 ? "version" : "versions"}`}
            style={styles.languageRow}
          >
            <Text style={styles.languageName} numberOfLines={1}>
              {item.group.languageName}
            </Text>
            <Text style={styles.languageCount}>{count}</Text>
            {!searching ? (
              <Ionicons name={item.expanded ? "chevron-up" : "chevron-down"} size={14} color={INK_MUTED} />
            ) : null}
          </Pressable>
        );
      }
      const entry = item.entry;
      const active = entry.abbreviation === selected;
      const label = entry.displayAbbreviation || entry.abbreviation;
      return (
        <Pressable
          onPress={() => onSelect(entry.abbreviation)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={`${label}, ${entry.name}`}
          testID={`translation-option-${entry.abbreviation}`}
          style={[styles.option, active && styles.optionActive]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionAbbr, active && styles.optionAbbrActive]} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.optionName} numberOfLines={2}>
              {entry.name}
            </Text>
          </View>
          {active ? <Ionicons name="checkmark" size={16} color={INK} /> : null}
        </Pressable>
      );
    },
    [onSelect, searching, selected, toggleLanguage],
  );

  return (
    <View style={{ maxHeight }} testID={testID}>
      <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
        <Ionicons name="search" size={14} color={searchFocused ? PathB.coralInk : INK_MUTED} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search versions or languages"
          placeholderTextColor={INK_MUTED}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search versions or languages"
          testID="translation-picker-search"
        />
      </View>
      <FlatList
        style={{ flexShrink: 1 }}
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        initialNumToRender={30}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>No versions match “{query.trim()}”.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    backgroundColor: PILL,
  },
  searchBoxFocused: {
    borderColor: PathB.coralInk,
  },
  searchInput: {
    flex: 1,
    minHeight: 36,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: INK,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  languageName: {
    flex: 1,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
  },
  languageCount: { fontSize: 11, fontFamily: "Inter_500Medium", color: INK_MUTED },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  optionActive: { backgroundColor: INK + "10" },
  optionAbbr: { fontSize: 15, fontFamily: "Inter_500Medium", color: INK },
  optionAbbrActive: { fontFamily: "Inter_700Bold" },
  optionName: { fontSize: 12, fontFamily: "Inter_400Regular", color: INK_MUTED, marginTop: 1 },
  empty: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
  },
});
