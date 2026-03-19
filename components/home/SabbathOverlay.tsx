import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WELCOME_KEY = "@grace-through-faith/sabbath-welcome-shown";
const CLOSING_KEY = "@grace-through-faith/sabbath-closing-shown";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const WELCOME_BLESSINGS = [
  "The Lord bless you and keep you;\nthe Lord make His face shine upon you,\nand be gracious to you.",
  "Come to Me, all you who labor\nand are heavy laden,\nand I will give you rest.",
  "Be still, and know that I am God.",
  "This is the day the Lord has made;\nlet us rejoice and be glad in it.",
  "He gives power to the weak,\nand to those who have no might\nHe increases strength.",
];

const WELCOME_REFS = [
  "Numbers 6:24-25",
  "Matthew 11:28",
  "Psalm 46:10",
  "Psalm 118:24",
  "Isaiah 40:29",
];

const CLOSING_VERSES = [
  "The Lord will keep your going out\nand your coming in\nfrom this time forth and forevermore.",
  "May the God of hope fill you\nwith all joy and peace in believing,\nso that you may abound in hope.",
  "The peace of God, which surpasses\nall understanding, will guard your hearts\nand your minds in Christ Jesus.",
];

const CLOSING_REFS = [
  "Psalm 121:8",
  "Romans 15:13",
  "Philippians 4:7",
];

function getSabbathDateKey(): string {
  const now = new Date();
  const day = now.getDay();
  const friday = new Date(now);
  if (day === 5) {
    // already Friday
  } else if (day === 6) {
    friday.setDate(friday.getDate() - 1);
  } else {
    const daysBack = (day + 2) % 7;
    friday.setDate(friday.getDate() - daysBack);
  }
  return `${friday.getFullYear()}-${String(friday.getMonth() + 1).padStart(2, "0")}-${String(friday.getDate()).padStart(2, "0")}`;
}

function getWeeklyIndex(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 86400000));
  return weekNumber;
}

interface FlameProps {
  size: number;
}

function CandleFlame({ size }: FlameProps) {
  const flicker = useSharedValue(1);
  const sway = useSharedValue(0);
  const innerGlow = useSharedValue(0.6);

  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
    sway.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
    innerGlow.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, []);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: flicker.value },
      { rotate: `${sway.value}deg` },
    ],
    opacity: interpolate(flicker.value, [0.85, 1], [0.7, 1]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: innerGlow.value,
  }));

  const h = size;
  const w = size * 0.55;

  return (
    <View style={{ alignItems: "center", height: h + 40, justifyContent: "flex-end" }}>
      <Animated.View style={[glowStyle, {
        position: "absolute",
        width: size * 2.5,
        height: size * 2.5,
        borderRadius: size * 1.25,
        backgroundColor: "#D4A245",
        bottom: 20,
      }]} />
      <Animated.View style={[outerStyle, {
        width: w,
        height: h,
        borderTopLeftRadius: w / 2,
        borderTopRightRadius: w / 2,
        borderBottomLeftRadius: w * 0.4,
        borderBottomRightRadius: w * 0.4,
        backgroundColor: "#F0A830",
        alignItems: "center",
        justifyContent: "center",
        transformOrigin: "bottom",
      }]}>
        <View style={{
          width: w * 0.45,
          height: h * 0.55,
          borderTopLeftRadius: w * 0.22,
          borderTopRightRadius: w * 0.22,
          borderBottomLeftRadius: w * 0.15,
          borderBottomRightRadius: w * 0.15,
          backgroundColor: "#FFE4A0",
        }} />
      </Animated.View>
      <View style={{
        width: 6,
        height: 20,
        backgroundColor: "#8B7355",
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
      }} />
    </View>
  );
}

type OverlayMode = "welcome" | "closing";

interface SabbathOverlayProps {
  isSabbath: boolean;
  isClosingPhase: boolean;
  onDismissWelcome?: () => void;
  onDismissClosing?: () => void;
}

export default function SabbathOverlay({ isSabbath, isClosingPhase, onDismissWelcome, onDismissClosing }: SabbathOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<OverlayMode>("welcome");
  const opacity = useSharedValue(0);
  const contentY = useSharedValue(30);
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const welcomeCheckedRef = useRef(false);
  const closingCheckedRef = useRef(false);

  const showOverlay = (overlayMode: OverlayMode) => {
    setMode(overlayMode);
    setVisible(true);
    opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    contentY.value = withDelay(200, withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }));
  };

  useEffect(() => {
    if (!isSabbath || isClosingPhase || welcomeCheckedRef.current) return;
    welcomeCheckedRef.current = true;

    (async () => {
      const dateKey = getSabbathDateKey();
      const welcomeShown = await AsyncStorage.getItem(WELCOME_KEY).catch(() => null);
      if (welcomeShown !== dateKey) {
        showOverlay("welcome");
        await AsyncStorage.setItem(WELCOME_KEY, dateKey).catch(() => {});
      }
    })();
  }, [isSabbath, isClosingPhase]);

  useEffect(() => {
    if (!isSabbath || !isClosingPhase || closingCheckedRef.current || visible) return;
    closingCheckedRef.current = true;

    (async () => {
      const dateKey = getSabbathDateKey();
      const closingShown = await AsyncStorage.getItem(CLOSING_KEY).catch(() => null);
      if (closingShown !== dateKey) {
        showOverlay("closing");
        await AsyncStorage.setItem(CLOSING_KEY, dateKey).catch(() => {});
      }
    })();
  }, [isSabbath, isClosingPhase, visible]);

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) });
    contentY.value = withTiming(20, { duration: 300 });
    setTimeout(() => {
      setVisible(false);
      if (mode === "welcome") onDismissWelcome?.();
      else onDismissClosing?.();
    }, 420);
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const isClosing = mode === "closing";
  const weekIdx = getWeeklyIndex();
  const blessing = isClosing
    ? CLOSING_VERSES[weekIdx % CLOSING_VERSES.length]
    : WELCOME_BLESSINGS[weekIdx % WELCOME_BLESSINGS.length];
  const ref = isClosing
    ? CLOSING_REFS[weekIdx % CLOSING_REFS.length]
    : WELCOME_REFS[weekIdx % WELCOME_BLESSINGS.length];

  const bg = isClosing ? "#0A0806" : "#060504";
  const accentColor = isClosing ? "#C8875A" : "#D4A245";

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        overlayStyle,
        { backgroundColor: bg, zIndex: 9999 },
      ]}
    >
      <Pressable
        onPress={handleDismiss}
        style={[styles.touchArea, { paddingTop: topPad, paddingBottom: bottomPad }]}
        testID="sabbath-overlay"
      >
        <Animated.View style={[styles.content, contentStyle]}>
          <CandleFlame size={isClosing ? 50 : 60} />

          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: accentColor }]}>
              {isClosing ? "SABBATH CLOSING" : "SHABBAT SHALOM"}
            </Text>

            <Text style={styles.blessing}>{blessing}</Text>
            <Text style={[styles.ref, { color: accentColor }]}>{ref}</Text>
          </View>

          <Text style={[styles.closingMessage, { color: isClosing ? "#A08060" : "#887755" }]}>
            {isClosing
              ? "Carry the Sabbath peace into your week."
              : "The Sabbath has begun. Rest in His presence."}
          </Text>

          <View style={[styles.dismissHint, { borderColor: accentColor + "40" }]}>
            <Text style={[styles.dismissText, { color: accentColor + "90" }]}>
              Tap anywhere to enter
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 32,
  },
  textWrap: {
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  blessing: {
    fontSize: 20,
    fontFamily: "Lora_400Regular",
    color: "#E8DCC8",
    textAlign: "center",
    lineHeight: 32,
  },
  ref: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  closingMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  dismissHint: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  dismissText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
});
