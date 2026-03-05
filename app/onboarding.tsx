import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  FlatList,
  ViewToken,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  FadeIn,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ONBOARDING_KEY = "@grace-through-faith/onboarded";

const GOLD = "#C9933A";
const NAVY = "#1A1F3C";
const DEEP_NAVY = "#0D1025";
const PARCHMENT = "#F5EFE0";
const PARCHMENT_DIM = "rgba(245, 239, 224, 0.08)";
const GOLD_DIM = "rgba(201, 147, 58, 0.15)";

interface PageData {
  key: string;
}

const PAGES: PageData[] = [
  { key: "welcome" },
  { key: "study-model" },
  { key: "features" },
  { key: "get-started" },
];

function WelcomePage() {
  return (
    <View style={pageStyles.container}>
      <View style={pageStyles.topSection}>
        <Animated.View entering={FadeIn.delay(200).duration(800)} style={pageStyles.crossContainer}>
          <View style={[pageStyles.crossVertical, { backgroundColor: GOLD }]} />
          <View style={[pageStyles.crossHorizontal, { backgroundColor: GOLD }]} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(400).duration(800)} style={pageStyles.doveRow}>
          <Ionicons name="leaf-outline" size={18} color={GOLD} style={{ transform: [{ rotate: "-45deg" }] }} />
          <Ionicons name="leaf-outline" size={18} color={GOLD} style={{ transform: [{ rotate: "45deg" }, { scaleX: -1 }] }} />
        </Animated.View>
      </View>
      <Animated.View entering={FadeIn.delay(600).duration(800)} style={pageStyles.centerContent}>
        <Text style={[pageStyles.appTitle, { fontFamily: "Lora_700Bold" }]}>
          Grace{"\n"}through{"\n"}Faith
        </Text>
        <View style={pageStyles.dividerLine} />
        <Text style={[pageStyles.tagline, { fontFamily: "Lora_400Regular_Italic" }]}>
          "For by grace are ye saved{"\n"}through faith"
        </Text>
        <Text style={[pageStyles.taglineRef, { fontFamily: "Inter_500Medium" }]}>
          Ephesians 2:8
        </Text>
      </Animated.View>
      <View style={pageStyles.bottomSpacer} />
    </View>
  );
}

function StudyModelPage() {
  const layers = [
    {
      icon: "document-text-outline" as const,
      title: "Text",
      desc: "Read Scripture in multiple translations with Strong's numbers",
    },
    {
      icon: "layers-outline" as const,
      title: "Context",
      desc: "Historical background, cultural setting, and literary structure",
    },
    {
      icon: "people-outline" as const,
      title: "Historic Voices",
      desc: "Insights from Church fathers, reformers, and theologians",
    },
    {
      icon: "heart-outline" as const,
      title: "Application",
      desc: "Devotional plans and personal reflection for daily life",
    },
  ];

  return (
    <ScrollView style={pageStyles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.container}>
        <Animated.View entering={FadeIn.delay(200).duration(600)} style={pageStyles.modelHeader}>
          <Text style={[pageStyles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            WHAT MAKES US DIFFERENT
          </Text>
          <Text style={[pageStyles.sectionTitle, { fontFamily: "Lora_700Bold" }]}>
            The 4-Layer{"\n"}Study Model
          </Text>
        </Animated.View>
        <View style={pageStyles.layersContainer}>
          {layers.map((layer, i) => (
            <Animated.View
              key={layer.title}
              entering={FadeIn.delay(400 + i * 150).duration(600)}
              style={pageStyles.layerCard}
            >
              <View style={pageStyles.layerIconWrap}>
                <Ionicons name={layer.icon} size={24} color={GOLD} />
              </View>
              <View style={pageStyles.layerTextWrap}>
                <Text style={[pageStyles.layerTitle, { fontFamily: "Lora_600SemiBold" }]}>
                  {layer.title}
                </Text>
                <Text style={[pageStyles.layerDesc, { fontFamily: "Inter_400Regular" }]}>
                  {layer.desc}
                </Text>
              </View>
              <View style={pageStyles.layerNumber}>
                <Text style={[pageStyles.layerNum, { fontFamily: "Inter_700Bold" }]}>
                  {i + 1}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
        <View style={pageStyles.bottomPadding} />
      </View>
    </ScrollView>
  );
}

function FeaturesPage() {
  const features = [
    { icon: "headset-outline" as const, label: "Audio Bible", sub: "Listen with lifelike AI voices" },
    { icon: "cloud-offline-outline" as const, label: "Offline Reading", sub: "Full text always available" },
    { icon: "language-outline" as const, label: "Strong's Concordance", sub: "Greek & Hebrew word study" },
    { icon: "flame-outline" as const, label: "Devotional Plans", sub: "Guided daily reading" },
    { icon: "map-outline" as const, label: "Maps & Timeline", sub: "Biblical geography & history" },
    { icon: "color-palette-outline" as const, label: "Highlights & Notes", sub: "Mark and organize passages" },
  ];

  return (
    <ScrollView style={pageStyles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.container}>
        <Animated.View entering={FadeIn.delay(200).duration(600)} style={pageStyles.modelHeader}>
          <Text style={[pageStyles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            POWERFUL TOOLS
          </Text>
          <Text style={[pageStyles.sectionTitle, { fontFamily: "Lora_700Bold" }]}>
            Everything You{"\n"}Need to Study
          </Text>
        </Animated.View>
        <View style={pageStyles.featuresGrid}>
          {features.map((f, i) => (
            <Animated.View
              key={f.label}
              entering={FadeIn.delay(350 + i * 100).duration(500)}
              style={pageStyles.featureItem}
            >
              <View style={pageStyles.featureIconWrap}>
                <Ionicons name={f.icon} size={22} color={GOLD} />
              </View>
              <Text style={[pageStyles.featureLabel, { fontFamily: "Inter_600SemiBold" }]}>
                {f.label}
              </Text>
              <Text style={[pageStyles.featureSub, { fontFamily: "Inter_400Regular" }]}>
                {f.sub}
              </Text>
            </Animated.View>
          ))}
        </View>
        <View style={pageStyles.bottomPadding} />
      </View>
    </ScrollView>
  );
}

function GetStartedPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <View style={pageStyles.container}>
      <Animated.View entering={FadeIn.delay(200).duration(800)} style={pageStyles.startCenter}>
        <View style={pageStyles.startCrossContainer}>
          <View style={[pageStyles.startCrossV, { backgroundColor: GOLD }]} />
          <View style={[pageStyles.startCrossH, { backgroundColor: GOLD }]} />
        </View>
        <Text style={[pageStyles.startTitle, { fontFamily: "Lora_700Bold" }]}>
          Begin Your{"\n"}Journey
        </Text>
        <Text style={[pageStyles.startDesc, { fontFamily: "Inter_400Regular" }]}>
          A study Bible designed for every believer seeking deeper understanding of God's Word.
        </Text>
        <Pressable
          style={({ pressed }) => [pageStyles.startBtn, pressed && { opacity: 0.85 }]}
          onPress={onGetStarted}
        >
          <Text style={[pageStyles.startBtnText, { fontFamily: "Inter_700Bold" }]}>
            Get Started
          </Text>
          <Ionicons name="arrow-forward" size={20} color={NAVY} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function DotIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === current ? dotStyles.dotActive : dotStyles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (value) {
        router.replace("/(tabs)");
      }
    });
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentPage(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleGetStarted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  }, []);

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  }, []);

  const handleNext = useCallback(() => {
    if (currentPage < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
    }
  }, [currentPage]);

  const renderItem = useCallback(
    ({ item }: { item: PageData }) => {
      const pageContent = () => {
        switch (item.key) {
          case "welcome":
            return <WelcomePage />;
          case "study-model":
            return <StudyModelPage />;
          case "features":
            return <FeaturesPage />;
          case "get-started":
            return <GetStartedPage onGetStarted={handleGetStarted} />;
          default:
            return null;
        }
      };
      return <View style={{ width: SCREEN_WIDTH }}>{pageContent()}</View>;
    },
    [handleGetStarted]
  );

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled
        bounces={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
      <View style={[styles.bottomBar, { paddingBottom: 16 }]}>
        {currentPage < PAGES.length - 1 ? (
          <>
            <Pressable onPress={handleSkip} hitSlop={12}>
              <Text style={[styles.skipText, { fontFamily: "Inter_500Medium" }]}>Skip</Text>
            </Pressable>
            <DotIndicator current={currentPage} total={PAGES.length} />
            <Pressable onPress={handleNext} hitSlop={12} style={styles.nextBtn}>
              <Ionicons name="arrow-forward" size={22} color={NAVY} />
            </Pressable>
          </>
        ) : (
          <>
            <View />
            <DotIndicator current={currentPage} total={PAGES.length} />
            <View />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DEEP_NAVY,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  skipText: {
    color: "rgba(237, 229, 213, 0.5)",
    fontSize: 15,
  },
  nextBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
});

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    backgroundColor: GOLD,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: "rgba(201, 147, 58, 0.3)",
    borderRadius: 4,
  },
});

const pageStyles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  topSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  crossContainer: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  crossVertical: {
    position: "absolute",
    width: 4,
    height: 50,
    borderRadius: 2,
  },
  crossHorizontal: {
    position: "absolute",
    width: 36,
    height: 4,
    borderRadius: 2,
    top: 14,
  },
  doveRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  centerContent: {
    alignItems: "center",
  },
  appTitle: {
    fontSize: 44,
    color: PARCHMENT,
    textAlign: "center",
    lineHeight: 52,
    marginBottom: 20,
  },
  dividerLine: {
    width: 48,
    height: 2,
    backgroundColor: GOLD,
    marginBottom: 20,
    borderRadius: 1,
  },
  tagline: {
    fontSize: 17,
    color: "rgba(237, 229, 213, 0.7)",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 8,
  },
  taglineRef: {
    fontSize: 12,
    color: GOLD,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  bottomSpacer: { height: 80 },
  modelHeader: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    color: GOLD,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 32,
    color: PARCHMENT,
    lineHeight: 40,
  },
  layersContainer: {
    gap: 12,
  },
  layerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PARCHMENT_DIM,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 147, 58, 0.12)",
  },
  layerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: GOLD_DIM,
    alignItems: "center",
    justifyContent: "center",
  },
  layerTextWrap: {
    flex: 1,
  },
  layerTitle: {
    fontSize: 16,
    color: PARCHMENT,
    marginBottom: 2,
  },
  layerDesc: {
    fontSize: 12,
    color: "rgba(237, 229, 213, 0.55)",
    lineHeight: 17,
  },
  layerNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(201, 147, 58, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  layerNum: {
    fontSize: 13,
    color: GOLD,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureItem: {
    width: "46%",
    flexGrow: 1,
    backgroundColor: PARCHMENT_DIM,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 147, 58, 0.12)",
    gap: 6,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: GOLD_DIM,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  featureLabel: {
    fontSize: 14,
    color: PARCHMENT,
  },
  featureSub: {
    fontSize: 11,
    color: "rgba(237, 229, 213, 0.5)",
    lineHeight: 15,
  },
  startCenter: {
    alignItems: "center",
  },
  startCrossContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  startCrossV: {
    position: "absolute",
    width: 3,
    height: 40,
    borderRadius: 1.5,
  },
  startCrossH: {
    position: "absolute",
    width: 28,
    height: 3,
    borderRadius: 1.5,
    top: 10,
  },
  startTitle: {
    fontSize: 38,
    color: PARCHMENT,
    textAlign: "center",
    lineHeight: 46,
    marginBottom: 16,
  },
  startDesc: {
    fontSize: 15,
    color: "rgba(237, 229, 213, 0.6)",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 36,
    maxWidth: 300,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 16,
    gap: 10,
    marginBottom: 20,
  },
  startBtnText: {
    color: NAVY,
    fontSize: 17,
  },
  startNote: {
    fontSize: 12,
    color: "rgba(237, 229, 213, 0.35)",
  },
  bottomPadding: {
    height: 40,
  },
});
