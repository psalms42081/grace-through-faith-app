import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Animated as RNAnimated,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useKidsMode } from "@/context/KidsModeContext";
import { apiRequest, queryClient } from "@/lib/query-client";
import { SHOP_ITEMS, SHOP_CATEGORIES, getShopItemsByCategory, DAILY_QUEST_STAR_REWARD, type ShopItem } from "@/constants/kids-shop";

const KIDS_BG = "#1A1040";
const KIDS_CARD = "#251860";
const KIDS_ACCENT = "#FFD700";

function StarBadge({ count }: { count: number }) {
  return (
    <View style={st.starBadge}>
      <Ionicons name="star" size={18} color={KIDS_ACCENT} />
      <Text style={[st.starBadgeText, { fontFamily: "Inter_700Bold" }]}>{count}</Text>
    </View>
  );
}

function ShopItemCard({
  item,
  owned,
  equipped,
  canAfford,
  onBuy,
  onEquip,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  return (
    <View style={[st.itemCard, owned && st.itemCardOwned]}>
      <View style={[st.itemIconWrap, { backgroundColor: item.color + "25" }]}>
        <Ionicons name={item.icon as any} size={32} color={item.color} />
      </View>
      <Text style={[st.itemName, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[st.itemDesc, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
        {item.description}
      </Text>
      {owned ? (
        <Pressable
          onPress={onEquip}
          style={[st.itemBtn, equipped ? st.itemBtnEquipped : st.itemBtnOwned]}
        >
          <Text style={[st.itemBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {equipped ? "Equipped" : "Equip"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onBuy}
          style={[st.itemBtn, canAfford ? st.itemBtnBuy : st.itemBtnDisabled]}
          disabled={!canAfford}
        >
          <Ionicons name="star" size={14} color={canAfford ? "#1A1040" : "#666"} />
          <Text style={[st.itemBtnText, { fontFamily: "Inter_600SemiBold", color: canAfford ? "#1A1040" : "#666" }]}>
            {item.starCost}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function KidsShopScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { userId } = useAuth();
  const { activeChild } = useKidsMode();

  const [selectedCategory, setSelectedCategory] = useState<ShopItem["category"]>("avatar_frame");

  const { data: progressData } = useQuery<any[]>({
    queryKey: [`/api/kids/progress`],
  });

  const { data: purchasesData, refetch: refetchPurchases } = useQuery<any[]>({
    queryKey: [`/api/kids/shop/purchases?childId=${activeChild?.id || ""}`],
  });

  const totalStars = useMemo(() => {
    if (!progressData) return 0;
    let stars = 0;
    for (const p of progressData) {
      if (p.completed) stars += 1;
      if (p.quizScore != null && p.quizScore > 0) {
        if (p.quizScore === 100) stars += 3;
        else if (p.quizScore >= 66) stars += 2;
        else stars += 1;
      }
      if (p.memoryVerseMemorized) stars += 2;
    }
    return stars;
  }, [progressData]);

  const spentStars = useMemo(() => {
    if (!purchasesData) return 0;
    return purchasesData.reduce((sum: number, p: any) => sum + p.starCost, 0);
  }, [purchasesData]);

  const availableStars = totalStars - spentStars;

  const ownedItemIds = useMemo(() => {
    return new Set(purchasesData?.map((p: any) => p.itemId) || []);
  }, [purchasesData]);

  const equippedItemIds = useMemo(() => {
    return new Set(purchasesData?.filter((p: any) => p.equipped).map((p: any) => p.itemId) || []);
  }, [purchasesData]);

  const purchaseMutation = useMutation({
    mutationFn: async (item: ShopItem) => {
      return apiRequest("POST", "/api/kids/shop/purchase", {
        itemId: item.id,
        childId: activeChild?.id,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchPurchases();
      queryClient.invalidateQueries({ queryKey: [`/api/kids/progress`] });
    },
    onError: (err: any) => {
      Alert.alert("Oops!", err?.message || "Could not purchase this item");
    },
  });

  const equipMutation = useMutation({
    mutationFn: async ({ itemId, category }: { itemId: string; category: string }) => {
      return apiRequest("POST", "/api/kids/shop/equip", {
        itemId: equippedItemIds.has(itemId) ? null : itemId,
        childId: activeChild?.id,
        category,
      });
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      refetchPurchases();
    },
  });

  const handleBuy = useCallback((item: ShopItem) => {
    Alert.alert(
      `Get ${item.name}?`,
      `This costs ${item.starCost} stars. You have ${availableStars} stars.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy!",
          onPress: () => purchaseMutation.mutate(item),
        },
      ]
    );
  }, [availableStars, purchaseMutation]);

  const handleEquip = useCallback((item: ShopItem) => {
    equipMutation.mutate({ itemId: item.id, category: item.category });
  }, [equipMutation]);

  const filteredItems = getShopItemsByCategory(selectedCategory);

  return (
    <View style={[st.container, { backgroundColor: KIDS_BG }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { fontFamily: "Inter_700Bold" }]}>
            Star Shop
          </Text>
        </View>
        <StarBadge count={availableStars} />
      </View>

      <View style={st.balanceRow}>
        <View style={st.balanceCard}>
          <Ionicons name="star" size={28} color={KIDS_ACCENT} />
          <View>
            <Text style={[st.balanceLabel, { fontFamily: "Inter_400Regular" }]}>Available Stars</Text>
            <Text style={[st.balanceValue, { fontFamily: "Inter_700Bold" }]}>{availableStars}</Text>
          </View>
        </View>
        <View style={st.balanceCard}>
          <Ionicons name="bag-handle" size={28} color="#E8456B" />
          <View>
            <Text style={[st.balanceLabel, { fontFamily: "Inter_400Regular" }]}>Items Owned</Text>
            <Text style={[st.balanceValue, { fontFamily: "Inter_700Bold" }]}>{ownedItemIds.size}</Text>
          </View>
        </View>
      </View>

      <View style={st.categoryRow}>
        {SHOP_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(cat.id);
              }}
              style={[st.categoryChip, active && st.categoryChipActive]}
            >
              <Ionicons name={cat.icon as any} size={18} color={active ? "#1A1040" : "#B0A0D0"} />
              <Text style={[st.categoryChipText, { fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium", color: active ? "#1A1040" : "#B0A0D0" }]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.itemGrid}>
          {filteredItems.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              owned={ownedItemIds.has(item.id)}
              equipped={equippedItemIds.has(item.id)}
              canAfford={availableStars >= item.starCost}
              onBuy={() => handleBuy(item)}
              onEquip={() => handleEquip(item)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    color: "#fff",
  },
  starBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,215,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  starBadgeText: {
    fontSize: 16,
    color: KIDS_ACCENT,
  },
  balanceRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  balanceCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: KIDS_CARD,
    borderRadius: 16,
    padding: 14,
  },
  balanceLabel: {
    fontSize: 11,
    color: "#B0A0D0",
  },
  balanceValue: {
    fontSize: 20,
    color: "#fff",
  },
  categoryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: KIDS_CARD,
  },
  categoryChipActive: {
    backgroundColor: KIDS_ACCENT,
  },
  categoryChipText: {
    fontSize: 13,
  },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 20,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  itemCard: {
    width: "47%" as any,
    backgroundColor: KIDS_CARD,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  itemCardOwned: {
    borderWidth: 1.5,
    borderColor: KIDS_ACCENT + "40",
  },
  itemIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
  },
  itemDesc: {
    fontSize: 11,
    color: "#B0A0D0",
    textAlign: "center",
    lineHeight: 15,
  },
  itemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
    width: "100%",
  },
  itemBtnBuy: {
    backgroundColor: KIDS_ACCENT,
  },
  itemBtnDisabled: {
    backgroundColor: "#333",
  },
  itemBtnOwned: {
    backgroundColor: "rgba(255,215,0,0.2)",
  },
  itemBtnEquipped: {
    backgroundColor: "#27AE60",
  },
  itemBtnText: {
    fontSize: 13,
    color: "#fff",
  },
});
