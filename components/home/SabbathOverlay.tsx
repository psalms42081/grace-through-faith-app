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
import { onSabbathTestTrigger } from "@/lib/sabbath-test-events";
import Svg, { Path, Rect, Defs, RadialGradient, Stop } from "react-native-svg";

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

const AnimatedView = Animated.View;

function CandleFlame({ size }: FlameProps) {
  const flicker = useSharedValue(1);
  const sway = useSharedValue(0);
  const glowPulse = useSharedValue(0.12);

  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(0.88, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
    sway.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(2.5, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.06, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, []);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: flicker.value },
      { rotate: `${sway.value}deg` },
    ],
    opacity: interpolate(flicker.value, [0.88, 1], [0.8, 1]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  const svgW = 80;
  const svgH = 160;
  const scale = size / 60;

  return (
    <View style={{ alignItems: "center", width: svgW * scale, height: svgH * scale }}>
      <AnimatedView style={[glowStyle, {
        position: "absolute",
        width: 120 * scale,
        height: 120 * scale,
        borderRadius: 60 * scale,
        top: 10 * scale,
        left: (svgW * scale - 120 * scale) / 2,
        backgroundColor: "#D4A245",
      }]} />

      <Svg
        width={svgW * scale}
        height={svgH * scale}
        viewBox={`0 0 ${svgW} ${svgH}`}
      >
        <Rect x="34" y="88" width="12" height="60" rx="3" fill="#F5ECD7" />
        <Rect x="37" y="82" width="6" height="10" rx="1" fill="#555" />
      </Svg>

      <AnimatedView style={[flameStyle, {
        position: "absolute",
        top: 0,
        left: 0,
        width: svgW * scale,
        height: svgH * scale,
      }]}>
        <Svg
          width={svgW * scale}
          height={svgH * scale}
          viewBox={`0 0 ${svgW} ${svgH}`}
        >
          <Defs>
            <RadialGradient id="outerFlame" cx="50%" cy="60%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FFD070" stopOpacity="1" />
              <Stop offset="50%" stopColor="#F0A830" stopOpacity="1" />
              <Stop offset="100%" stopColor="#E08A20" stopOpacity="0.9" />
            </RadialGradient>
            <RadialGradient id="innerFlame" cx="50%" cy="65%" rx="40%" ry="50%">
              <Stop offset="0%" stopColor="#FFFDE8" stopOpacity="1" />
              <Stop offset="60%" stopColor="#FFE4A0" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFD060" stopOpacity="0.8" />
            </RadialGradient>
          </Defs>
          <Path
            d="M40 18 C40 18, 54 45, 54 62 C54 72, 48 82, 40 82 C32 82, 26 72, 26 62 C26 45, 40 18, 40 18 Z"
            fill="url(#outerFlame)"
          />
          <Path
            d="M40 35 C40 35, 48 52, 48 62 C48 69, 45 76, 40 76 C35 76, 32 69, 32 62 C32 52, 40 35, 40 35 Z"
            fill="url(#innerFlame)"
          />
        </Svg>
      </AnimatedView>
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
    return onSabbathTestTrigger(async (testMode) => {
      const dateKey = getSabbathDateKey();
      const key = testMode === "welcome" ? WELCOME_KEY : CLOSING_KEY;
      await AsyncStorage.setItem(key, dateKey).catch(() => {});
      showOverlay(testMode);
    });
  }, []);

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
