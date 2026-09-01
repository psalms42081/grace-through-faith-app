import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import ChurchMap from "@/components/ChurchMap";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useToast } from "@/contexts/ToastContext";

interface Church {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  lat: string;
  lng: string;
  serviceTimes: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  pastorName: string | null;
  membershipSize: string | null;
}

export default function ChurchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { data: church, isLoading } = useQuery<Church>({
    queryKey: [`/api/churches/${id}`],
    enabled: !!id,
  });

  const { data: myChurchData } = useQuery<{ church: Church | null }>({
    queryKey: ["/api/me/church"],
    enabled: isAuthenticated,
    staleTime: 0,
  });
  const isMyChurch = !!church && myChurchData?.church?.id === church.id;

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/churches/${id}/claim`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/me/church"] });
      showToast("This is now your church.", "success");
    },
    onError: (err: any) => {
      showToast(err?.message || "Could not set your church", "error");
    },
  });

  const openDirections = () => {
    if (!church) return;
    const addr = encodeURIComponent(`${church.address}, ${church.city}, ${church.country}`);
    if (Platform.OS === "web") {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${addr}`);
    } else if (Platform.OS === "ios") {
      Linking.openURL(`maps://app?daddr=${addr}`);
    } else {
      Linking.openURL(`google.navigation:q=${addr}`);
    }
  };

  if (isLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!church) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[s.errorText, { color: theme.textSecondary }]}>Church not found</Text>
      </View>
    );
  }

  const serviceTimesList = church.serviceTimes?.split("|").map(s => s.trim()) || [];

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        <View style={[s.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
        </View>

        <View style={s.mapSection}>
          <ChurchMap
            churches={[{ id: church.id, name: church.name, lat: church.lat, lng: church.lng }]}
            userLat={parseFloat(church.lat)}
            userLng={parseFloat(church.lng)}
          />
        </View>

        <View style={[s.infoCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={[s.churchIcon, { backgroundColor: theme.accent + "18" }]}>
            <Ionicons name="business" size={28} color={theme.accent} />
          </View>
          <Text style={[s.churchName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {church.name}
          </Text>
          <Text style={[s.churchLocation, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {church.address}
          </Text>
          <Text style={[s.churchLocation, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {church.city}{church.state ? `, ${church.state}` : ""}, {church.country}
          </Text>
        </View>

        <View style={s.claimWrap}>
          {!isAuthenticated ? (
            <Pressable
              onPress={() => router.push("/(auth)/login" as any)}
              style={[s.claimBtnOutline, { borderColor: theme.accent }]}
              testID="church-detail-claim"
            >
              <Ionicons name="log-in-outline" size={18} color={theme.accent} />
              <Text style={[s.claimBtnOutlineText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Sign in to set as My Church
              </Text>
            </Pressable>
          ) : isMyChurch ? (
            <View style={[s.claimedBanner, { backgroundColor: theme.accent + "18", borderColor: theme.accent }]} testID="church-detail-claimed">
              <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
              <Text style={[s.claimedText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                This is your church
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              style={[s.claimBtn, { backgroundColor: theme.accent, opacity: claimMutation.isPending ? 0.7 : 1 }]}
              testID="church-detail-claim"
            >
              {claimMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="home" size={18} color="#fff" />
                  <Text style={[s.claimBtnText, { fontFamily: "Inter_600SemiBold" }]}>Set as My Church</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {serviceTimesList.length > 0 ? (
          <View style={[s.section, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="time" size={18} color={theme.accent} />
              <Text style={[s.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Service Times
              </Text>
            </View>
            {serviceTimesList.map((time, i) => (
              <View key={i} style={[s.timeRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                <Text style={[s.timeText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{time}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[s.section, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="information-circle" size={18} color={theme.accent} />
            <Text style={[s.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Details
            </Text>
          </View>
          {church.pastorName ? (
            <View style={s.infoRow}>
              <Ionicons name="person" size={16} color={theme.textMuted} />
              <Text style={[s.infoLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Pastor</Text>
              <Text style={[s.infoValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{church.pastorName}</Text>
            </View>
          ) : null}
          {church.membershipSize ? (
            <View style={s.infoRow}>
              <Ionicons name="people" size={16} color={theme.textMuted} />
              <Text style={[s.infoLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Size</Text>
              <Text style={[s.infoValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                {church.membershipSize.charAt(0).toUpperCase() + church.membershipSize.slice(1)} congregation
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.actionsRow}>
          <Pressable onPress={openDirections} style={[s.actionBtn, { backgroundColor: theme.accent }]}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={[s.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>Directions</Text>
          </Pressable>
          {church.contactPhone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${church.contactPhone}`)}
              style={[s.actionBtnOutline, { borderColor: theme.accent }]}
            >
              <Ionicons name="call" size={18} color={theme.accent} />
              <Text style={[s.actionBtnOutlineText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>Call</Text>
            </Pressable>
          ) : null}
          {church.website ? (
            <Pressable
              onPress={() => Linking.openURL(church.website!)}
              style={[s.actionBtnOutline, { borderColor: theme.accent }]}
            >
              <Ionicons name="globe" size={18} color={theme.accent} />
              <Text style={[s.actionBtnOutlineText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>Web</Text>
            </Pressable>
          ) : null}
        </View>

        {church.contactEmail ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${church.contactEmail}`)}
            style={[s.emailBtn, { borderColor: theme.border }]}
          >
            <Ionicons name="mail" size={16} color={theme.textSecondary} />
            <Text style={[s.emailText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {church.contactEmail}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { padding: 4, alignSelf: "flex-start" },
  mapSection: { height: 220, marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  infoCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  churchIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  churchName: { fontSize: 22, textAlign: "center" },
  churchLocation: { fontSize: 14, textAlign: "center" },
  claimWrap: { marginHorizontal: 16, marginBottom: 12 },
  claimBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  claimBtnText: { color: "#fff", fontSize: 15 },
  claimBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  claimBtnOutlineText: { fontSize: 15 },
  claimedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  claimedText: { fontSize: 15 },
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16 },
  timeRow: { paddingVertical: 10 },
  timeText: { fontSize: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  infoLabel: { fontSize: 13, width: 55 },
  infoValue: { fontSize: 14, flex: 1 },
  actionsRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: { color: "#fff", fontSize: 14 },
  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnOutlineText: { fontSize: 14 },
  emailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emailText: { fontSize: 13 },
});
