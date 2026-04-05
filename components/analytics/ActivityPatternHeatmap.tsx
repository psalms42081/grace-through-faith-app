import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ActivityTile {
  day_of_week: number;
  time_block: number;
  engagement_score: number;
}

export interface ActivityPatternHeatmapProps {
  tiles: ActivityTile[];
  node_user_count: number;
  selected_topic?: string;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "Sa"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_LABELS = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];
const TIME_RANGES = ["12am – 4am", "4am – 8am", "8am – 12pm", "12pm – 4pm", "4pm – 8pm", "8pm – 12am"];

const CELL_SIZE = 12;
const CELL_GAP = 3;
const CELL_RADIUS = 3;
const TIME_LABEL_WIDTH = 40;
const GOLD = "#C9933A";

function buildGrid(tiles: ActivityTile[]): number[][] {
  const grid: number[][] = Array.from({ length: 6 }, () => Array(7).fill(0));
  for (const t of tiles) {
    if (t.day_of_week >= 0 && t.day_of_week <= 6 && t.time_block >= 0 && t.time_block <= 5) {
      grid[t.time_block][t.day_of_week] = t.engagement_score;
    }
  }
  return grid;
}

interface TooltipData {
  day: number;
  timeBlock: number;
  score: number;
  x: number;
  y: number;
}

export default function ActivityPatternHeatmap({
  tiles,
  node_user_count,
  selected_topic,
}: ActivityPatternHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (node_user_count < 5) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>
          {selected_topic ? `Activity: ${selected_topic}` : "Activity Pattern"}
        </Text>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed-outline" size={32} color={GOLD} />
          <Text style={styles.lockedText}>
            Not enough activity to display patterns
          </Text>
        </View>
      </View>
    );
  }

  const grid = buildGrid(tiles);

  const handleCellPress = (dayIdx: number, timeBlock: number, score: number) => {
    const x = TIME_LABEL_WIDTH + dayIdx * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
    const headerOffset = 24 + 18;
    const y = headerOffset + timeBlock * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
    setTooltip({ day: dayIdx, timeBlock, score, x, y });
  };

  return (
    <TouchableWithoutFeedback onPress={() => setTooltip(null)}>
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>
          {selected_topic ? `Activity: ${selected_topic}` : "Activity Pattern"}
        </Text>

        <View style={styles.gridContainer}>
          <View style={styles.dayHeaderRow}>
            <View style={{ width: TIME_LABEL_WIDTH }} />
            {DAY_LABELS.map((d, i) => (
              <View key={i} style={[styles.dayLabelCell, i === 6 && styles.sabbathHeaderBorder]}>
                <Text style={styles.dayLabel}>{d}</Text>
              </View>
            ))}
          </View>

          {grid.map((row, timeBlock) => (
            <View key={timeBlock} style={styles.gridRow}>
              <Text style={styles.timeLabel}>{TIME_LABELS[timeBlock]}</Text>
              {row.map((score, dayIdx) => {
                const opacity = score / 100;
                const isSabbath = dayIdx === 6;
                return (
                  <TouchableOpacity
                    key={dayIdx}
                    activeOpacity={0.8}
                    onPress={() => handleCellPress(dayIdx, timeBlock, score)}
                    style={[
                      styles.cellWrapper,
                      isSabbath && styles.sabbathCellBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.cell,
                        {
                          backgroundColor: score > 0 ? GOLD : "#1E1F24",
                          opacity: score > 0 ? Math.max(opacity, 0.15) : 1,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Less</Text>
          {[0, 0.25, 0.5, 0.75, 1].map((op, i) => (
            <View
              key={i}
              style={[
                styles.legendCell,
                {
                  backgroundColor: op === 0 ? "#1E1F24" : GOLD,
                  opacity: op === 0 ? 1 : Math.max(op, 0.15),
                },
              ]}
            />
          ))}
          <Text style={styles.legendLabel}>More</Text>
        </View>

        {tooltip && (
          <View
            style={[
              styles.tooltip,
              {
                left: Math.max(8, Math.min(tooltip.x - 60, 200)),
                top: tooltip.y + 20,
              },
            ]}
          >
            <Text style={styles.tooltipDay}>{DAY_NAMES[tooltip.day]}</Text>
            <Text style={styles.tooltipTime}>{TIME_RANGES[tooltip.timeBlock]}</Text>
            <Text style={styles.tooltipScore}>
              Engagement: {tooltip.score}%
            </Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#141518",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1F24",
    padding: 16,
    position: "relative",
  },
  sectionTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 15,
    color: GOLD,
    marginBottom: 14,
  },
  gridContainer: {
    alignItems: "flex-start",
  },
  dayHeaderRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "center",
  },
  dayLabelCell: {
    width: CELL_SIZE,
    marginRight: CELL_GAP,
    alignItems: "center",
  },
  sabbathHeaderBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(201, 147, 58, 0.4)",
    paddingLeft: 2,
    marginLeft: -1,
  },
  dayLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: CELL_GAP,
  },
  timeLabel: {
    width: TIME_LABEL_WIDTH,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#6B7280",
    textAlign: "right",
    paddingRight: 6,
  },
  cellWrapper: {
    marginRight: CELL_GAP,
  },
  sabbathCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(201, 147, 58, 0.4)",
    paddingLeft: 2,
    marginLeft: -1,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_RADIUS,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    justifyContent: "center",
  },
  legendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#6B7280",
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  lockedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  lockedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "#141518",
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 100,
    minWidth: 120,
  },
  tooltipDay: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#F5F5F0",
    marginBottom: 2,
  },
  tooltipTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  tooltipScore: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: GOLD,
  },
});
