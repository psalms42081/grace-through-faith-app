import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { confirmWebSafe } from "@/components/WebSafeConfirm";
import { D2, F } from "@/components/devotions-v2/tokens";
import { Header, LoadingState, PrimaryButton } from "@/components/devotions-v2/PreviewPrimitives";

type Plan = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  durationDays: number;
};

export default function ReadingPlansScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const plans = useQuery<Plan[]>({ queryKey: ["/api/plans"] });
  const mine = useQuery<{ planId: string }[]>({
    queryKey: ["/api/user-plans", "reading-plans"],
    queryFn: async () => (await apiRequest("GET", "/api/user-plans")).json(),
    enabled: isAuthenticated,
  });
  const enrolled = new Set((mine.data || []).map((row) => row.planId));
  const start = useMutation({
    mutationFn: async (planId: string) =>
      (await apiRequest("POST", "/api/user-plans", { planId })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user-plans"] });
      showToast("Plan started", "success");
      router.back();
    },
    onError: () => showToast("Could not start plan. Please try again in a moment.", "error"),
  });

  function begin(planId: string) {
    if (!isAuthenticated) {
      void confirmWebSafe({
        title: "Sign In Required",
        message: "Create a free account to keep a reading rhythm and track your progress.",
        confirmLabel: "Sign In",
        cancelLabel: "Not Now",
      }).then((ok) => {
        if (ok) router.push("/(auth)/login");
      });
      return;
    }
    start.mutate(planId);
  }

  return (
    <View style={s.root} testID="reading-plans-screen">
      <Header
        title="Reading plans"
        eyebrow="Devotions"
        onBack={() => router.back()}
        topInset={insets.top}
        testID="reading-plans-header"
      />
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {plans.isLoading ? (
          <LoadingState label="Loading plans" />
        ) : (plans.data || []).length === 0 ? (
          <Text style={s.empty}>No reading plans are available right now.</Text>
        ) : (
          (plans.data || []).map((plan) => {
            const expanded = openId === plan.id;
            return (
              <View key={plan.id} style={s.row} testID={`reading-plan-${plan.id}`}>
                <Pressable
                  style={s.rowTop}
                  onPress={() => setOpenId(expanded ? null : plan.id)}
                  accessibilityRole="button"
                  accessibilityLabel={plan.title}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{plan.title}</Text>
                    <Text style={s.meta}>
                      {plan.category || "Scripture"} · {plan.durationDays} days
                      {enrolled.has(plan.id) ? " · In progress" : ""}
                    </Text>
                  </View>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={D2.muted}
                  />
                </Pressable>
                {expanded ? (
                  <View style={s.detail}>
                    {plan.description ? <Text style={s.body}>{plan.description}</Text> : null}
                    <PrimaryButton
                      label={enrolled.has(plan.id) ? "Continue on Devotions" : "Start this plan"}
                      onPress={() => (enrolled.has(plan.id) ? router.back() : begin(plan.id))}
                      disabled={start.isPending}
                      testID={`reading-plan-start-${plan.id}`}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D2.surface },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  empty: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 32,
  },
  row: {
    backgroundColor: D2.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: D2.border,
    padding: 14,
    marginBottom: 10,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontFamily: F.interSemi, color: D2.ink, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: F.inter, color: D2.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  detail: { marginTop: 12, gap: 12 },
  body: { fontFamily: F.inter, color: D2.ink, fontSize: 14, lineHeight: 21 },
});
