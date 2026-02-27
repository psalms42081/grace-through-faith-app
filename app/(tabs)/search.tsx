import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const SEARCH_SUGGESTIONS = [
  "John 3:16",
  "Psalm 23",
  "Romans 8:28",
  "love",
  "faith",
  "grace",
  "hope",
  "prayer",
  "wisdom",
  "salvation",
];

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Search
        </Text>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: focused ? theme.accent : theme.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            placeholder='Search verses or type "John 3:16"'
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={query.length === 0 ? SEARCH_SUGGESTIONS : []}
        keyExtractor={(item) => item}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 120 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          query.length === 0 ? (
            <View>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                Suggestions
              </Text>
            </View>
          ) : (
            <View style={[styles.noDataBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="book-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.noDataTitle, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
                Bible data not yet loaded
              </Text>
              <Text style={[styles.noDataSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Full-text search will be available after KJV data is imported in Milestone 2.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.suggestionRow,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={[styles.suggestionIcon, { backgroundColor: theme.accent + "18" }]}>
              <Ionicons
                name={item.includes(":") || /^\w+\s\d+$/.test(item) ? "navigate-outline" : "search-outline"}
                size={16}
                color={theme.accent}
              />
            </View>
            <Text style={[styles.suggestionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
              {item}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={theme.textMuted} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 24, marginBottom: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 4,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: { flex: 1, fontSize: 15 },
  noDataBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  noDataTitle: { fontSize: 16 },
  noDataSub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
