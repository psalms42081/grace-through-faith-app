import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GOLD = "#C9933A";
const TEAL = "#2A8B8B";
const PURPLE = "#7B68AE";
const INACTIVE_DOT = "#333";

const AUTO_INTERVAL = 8000;
const RESUME_DELAY = 10000;
const SWIPE_THRESHOLD = 50;

interface TouchPointData {
  title: string;
  excerpt: string;
  route?: string;
}

interface DevotionalData {
  thought: string;
  source: string;
}

interface RotatingPanelProps {
  touchpoints: TouchPointData[];
  devotionals: DevotionalData[];
}

function getDayIndex(len: number) {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return dayOfYear % len;
}

export default function RotatingPanel({
  touchpoints,
  devotionals,
}: RotatingPanelProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panXRef = useRef(0);

  const todayTouchpoint = touchpoints.length > 0 ? touchpoints[getDayIndex(touchpoints.length)] : { title: "God's Love", excerpt: "For God so loved the world that He gave His only begotten Son." };
  const todayDevotional = devotionals.length > 0 ? devotionals[getDayIndex(devotionals.length)] : { thought: "Draw near to God, and He will draw near to you.", source: "James 4:8" };

  const startAutoRotate = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 2);
    }, AUTO_INTERVAL);
  }, []);

  const pauseAutoRotate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => {
      startAutoRotate();
    }, RESUME_DELAY);
  }, [startAutoRotate]);

  useEffect(() => {
    startAutoRotate();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, [startAutoRotate]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        panXRef.current = 0;
      },
      onPanResponderMove: (_, gs) => {
        panXRef.current = gs.dx;
      },
      onPanResponderRelease: () => {
        if (panXRef.current < -SWIPE_THRESHOLD) {
          setActiveIndex((prev) => (prev + 1) % 2);
          pauseAutoRotate();
        } else if (panXRef.current > SWIPE_THRESHOLD) {
          setActiveIndex((prev) => (prev - 1 + 2) % 2);
          pauseAutoRotate();
        }
      },
    })
  ).current;

  return (
    <View style={panelStyles.wrapper} {...panResponder.panHandlers}>
      {activeIndex === 0 && (
        <View style={panelStyles.cardWrap}>
          <LinearGradient
            colors={["#0D2B2B", "#0A2222", "#071A1A"]}
            style={[panelStyles.solidCard, panelStyles.overlay]}
          >
            <View style={panelStyles.badge}>
              <View style={[panelStyles.badgeDot, { backgroundColor: TEAL }]} />
              <Text style={[panelStyles.badgeText, { fontFamily: "Inter_600SemiBold" }]}>
                Signpost of the Day
              </Text>
            </View>
            <Text style={[panelStyles.topicTitle, { color: TEAL, fontFamily: "Lora_700Bold" }]}>
              {todayTouchpoint.title}
            </Text>
            <Text style={[panelStyles.excerptText, { fontFamily: "Lora_400Regular_Italic" }]}>
              {"\u201C"}{todayTouchpoint.excerpt}{"\u201D"}
            </Text>
            <View style={panelStyles.footer}>
              <Pressable
                onPress={() => router.push((todayTouchpoint.route || "/touchpoints") as any)}
                style={[panelStyles.explorePill, { backgroundColor: TEAL + "30" }]}
              >
                <Text style={[panelStyles.exploreText, { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>
                  Explore Topic
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}

      {activeIndex === 1 && (
        <View style={panelStyles.cardWrap}>
          <LinearGradient
            colors={["#1A1530", "#151025", "#0F0B1A"]}
            style={[panelStyles.solidCard, panelStyles.overlay]}
          >
            <View style={panelStyles.badge}>
              <View style={[panelStyles.badgeDot, { backgroundColor: PURPLE }]} />
              <Text style={[panelStyles.badgeText, { fontFamily: "Inter_600SemiBold" }]}>
                Daily Reflection
              </Text>
            </View>
            <Text style={[panelStyles.reflectionText, { fontFamily: "Lora_400Regular_Italic" }]}>
              {"\u201C"}{todayDevotional.thought}{"\u201D"}
            </Text>
            <View style={panelStyles.footer}>
              <Text style={[panelStyles.reflectionSource, { color: PURPLE, fontFamily: "Lora_600SemiBold" }]}>
                {todayDevotional.source}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      <View style={panelStyles.dots}>
        {[0, 1].map((i) => (
          <Pressable key={i} onPress={() => { setActiveIndex(i); pauseAutoRotate(); }}>
            <View
              style={[
                panelStyles.dot,
                { backgroundColor: i === activeIndex ? GOLD : INACTIVE_DOT },
                i === activeIndex && panelStyles.dotActive,
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const panelStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  cardWrap: {
    borderRadius: 18,
    overflow: "hidden",
  },
  solidCard: {
    borderRadius: 18,
  },
  overlay: {
    flex: 1,
    padding: 20,
    paddingTop: 22,
    justifyContent: "flex-end",
    minHeight: 220,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  topicTitle: {
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 8,
  },
  excerptText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 14,
  },
  reflectionText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 14,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reflectionSource: {
    fontSize: 14,
    marginBottom: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  explorePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  exploreText: {
    fontSize: 12,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
