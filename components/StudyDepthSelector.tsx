import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStudyDepth, StudyDepth, DEPTH_CONFIGS } from "@/contexts/StudyDepthContext";

interface Props {
  compact?: boolean;
  onSelect?: (depth: StudyDepth) => void;
}

export default function StudyDepthSelector({ compact = false, onSelect }: Props) {
  const { depth, setDepth, allConfigs } = useStudyDepth();

  const handleSelect = (d: StudyDepth) => {
    setDepth(d);
    onSelect?.(d);
  };

  if (compact) {
    return (
      <View style={styles.compactRow}>
        {allConfigs.map((cfg) => {
          const active = depth === cfg.key;
          return (
            <TouchableOpacity
              key={cfg.key}
              style={[styles.compactPill, active && styles.compactPillActive]}
              onPress={() => handleSelect(cfg.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cfg.icon as any}
                size={14}
                color={active ? "#050507" : "#C9933A"}
              />
              <Text style={[styles.compactLabel, active && styles.compactLabelActive]}>
                {cfg.label}
              </Text>
              <Text style={[styles.compactTime, active && styles.compactTimeActive]}>
                {cfg.minutes}m
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Study Depth</Text>
      <Text style={styles.subtitle}>How much time do you have?</Text>
      <View style={styles.cardRow}>
        {allConfigs.map((cfg) => {
          const active = depth === cfg.key;
          return (
            <TouchableOpacity
              key={cfg.key}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => handleSelect(cfg.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                <Ionicons
                  name={cfg.icon as any}
                  size={22}
                  color={active ? "#050507" : "#C9933A"}
                />
              </View>
              <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>
                {cfg.label}
              </Text>
              <Text style={[styles.cardTime, active && styles.cardTimeActive]}>
                {cfg.minutes} min
              </Text>
              <Text style={[styles.cardDesc, active && styles.cardDescActive]}>
                {cfg.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function DepthBadge() {
  const { depthConfig } = useStudyDepth();
  return (
    <View style={styles.badge}>
      <Ionicons name={depthConfig.icon as any} size={12} color="#C9933A" />
      <Text style={styles.badgeText}>
        {depthConfig.label} \u2022 {depthConfig.minutes}m
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 18,
    color: "#F5F0E8",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(245, 240, 232, 0.5)",
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "rgba(201, 147, 58, 0.08)",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(201, 147, 58, 0.15)",
  },
  cardActive: {
    backgroundColor: "rgba(201, 147, 58, 0.2)",
    borderColor: "#C9933A",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(201, 147, 58, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconCircleActive: {
    backgroundColor: "#C9933A",
  },
  cardLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#F5F0E8",
    marginBottom: 2,
  },
  cardLabelActive: {
    color: "#C9933A",
  },
  cardTime: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(245, 240, 232, 0.5)",
    marginBottom: 6,
  },
  cardTimeActive: {
    color: "rgba(201, 147, 58, 0.8)",
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(245, 240, 232, 0.4)",
    textAlign: "center",
    lineHeight: 14,
  },
  cardDescActive: {
    color: "rgba(245, 240, 232, 0.7)",
  },
  compactRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 8,
  },
  compactPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(201, 147, 58, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(201, 147, 58, 0.15)",
  },
  compactPillActive: {
    backgroundColor: "#C9933A",
    borderColor: "#C9933A",
  },
  compactLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#F5F0E8",
  },
  compactLabelActive: {
    color: "#050507",
  },
  compactTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245, 240, 232, 0.5)",
  },
  compactTimeActive: {
    color: "rgba(5, 5, 7, 0.6)",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(201, 147, 58, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(201, 147, 58, 0.2)",
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#C9933A",
  },
});
