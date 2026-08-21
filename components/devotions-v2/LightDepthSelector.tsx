import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStudyDepth, StudyDepth } from "@/contexts/StudyDepthContext";
import { D2, F } from "./tokens";

export default function LightDepthSelector({ compact = false }: { compact?: boolean }) {
  const { depth, setDepth, allConfigs } = useStudyDepth();
  return (
    <View style={compact ? styles.compact : styles.wrap} testID="devotions-preview-depth-selector">
      {!compact && <><Text style={styles.title}>Choose your study depth</Text><Text style={styles.subtitle}>Set the pace for this reading.</Text></>}
      <View style={styles.row}>
        {allConfigs.map((config) => {
          const active = depth === config.key;
          return (
            <Pressable
              key={config.key}
              onPress={() => setDepth(config.key as StudyDepth)}
              style={[styles.pill, active && styles.active]}
              testID={`devotions-preview-depth-${config.key}`}
            >
              <Ionicons name={config.icon as any} size={14} color={active ? "#fff" : D2.violet} />
              <Text style={[styles.label, active && styles.activeText]}>{config.label}</Text>
              <Text style={[styles.minutes, active && styles.activeText]}>{config.minutes}m</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 12 },
  compact: { paddingHorizontal: 20, paddingVertical: 10 },
  title: { fontFamily: F.loraSemi, color: D2.ink, fontSize: 17 },
  subtitle: { fontFamily: F.inter, color: D2.muted, fontSize: 12, marginTop: 3, marginBottom: 11 },
  row: { flexDirection: "row", gap: 6 },
  pill: { flex: 1, minHeight: 35, paddingHorizontal: 6, borderRadius: 18, borderWidth: 1, borderColor: "#DCD3EE", backgroundColor: "#F7F4FC", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 },
  active: { backgroundColor: D2.violet, borderColor: D2.violet },
  label: { fontFamily: F.interSemi, color: D2.violet, fontSize: 11 },
  minutes: { fontFamily: F.inter, color: D2.muted, fontSize: 10 },
  activeText: { color: "#fff" },
});