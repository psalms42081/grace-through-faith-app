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
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import ChurchMap from "@/components/ChurchMap";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useToast } from "@/contexts/ToastContext";

const C = {
  surface: PathB.surface,
  card: PathB.surfaceCard,
  ink: PathB.ink,
  inkMuted: HV2.inkMutedText,
  coral: PathB.coral,
  pill: "#F1EBDD",
  border: "#E7E0D2",
};

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
      <View style={[s.loadingContainer, { backgroundColor: C.surface }]}>
        <ActivityIndicator size="large" color={C.inkMuted} />
      </View>
    );
  }

  if (!church) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: C.surface }]}>
        <Text style={[s.errorText, { color: C.inkMuted }]}>Church not found</Text>
      </View>
    );
  }

  const serviceTimesList = church.serviceTimes?.split("|").map(s => s.trim()) || [];

  return (
    <View style={[s.container, { backgroundColor: C.surface }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        <View style={[s.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.ink} />
          </Pressable>
        </View>

        <View style={s.mapSection}>
          <ChurchMap
            churches={[{ id: church.id, name: church.name, lat: church.lat, lng: church.lng }]}
            userLat={parseFloat(church.lat)}
            userLng={parseFloat(church.lng)}
          />
        </View>

        <View style={[s.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[s.churchIcon, { backgroundColor: C.pill }]}>
            <Ionicons name="business" size={28} color={C.ink} />
          </View>
          <Text style={[s.churchName, { color: C.ink, fontFamily: "Lora_700Bold" }]}>
            {church.name}
          </Text>
          <Text style={[s.churchLocation, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>
            {church.address}
          </Text>
          <Text style={[s.churchLocation, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>
            {church.city}{church.state ? `, ${church.state}` : ""}, {church.country}
          </Text>
        </View>

        <View style={s.claimWrap}>
          {!isAuthenticated ? (
            <Pressable
              onPress={() => router.push("/(auth)/login" as any)}
              style={[s.claimBtnOutline, { borderColor: C.border }]}
              testID="church-detail-claim"
            >
              <Ionicons name="log-in-outline" size={18} color={C.ink} />
              <Text style={[s.claimBtnOutlineText, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>
                Sign in to set as My Church
              </Text>
            </Pressable>
          ) : isMyChurch ? (
            <View style={[s.claimedBanner, { backgroundColor: C.pill, borderColor: C.border }]} testID="church-detail-claimed">
              <Ionicons name="checkmark-circle" size={18} color={C.ink} />
              <Text style={[s.claimedText, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>
                This is your church
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              style={[s.claimBtn, { backgroundColor: C.coral, opacity: claimMutation.isPending ? 0.7 : 1 }]}
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
          <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="time" size={18} color={C.inkMuted} />
              <Text style={[s.sectionTitle, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>
                Service Times
              </Text>
            </View>
            {serviceTimesList.map((time, i) => (
              <View key={i} style={[s.timeRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                <Text style={[s.timeText, { color: C.ink, fontFamily: "Inter_500Medium" }]}>{time}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="information-circle" size={18} color={C.inkMuted} />
            <Text style={[s.sectionTitle, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>
              Details
            </Text>
          </View>
          {church.pastorName ? (
            <View style={s.infoRow}>
              <Ionicons name="person" size={16} color={C.inkMuted} />
              <Text style={[s.infoLabel, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>Pastor</Text>
              <Text style={[s.infoValue, { color: C.ink, fontFamily: "Inter_500Medium" }]}>{church.pastorName}</Text>
            </View>
          ) : null}
          {church.membershipSize ? (
            <View style={s.infoRow}>
              <Ionicons name="people" size={16} color={C.inkMuted} />
              <Text style={[s.infoLabel, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>Size</Text>
              <Text style={[s.infoValue, { color: C.ink, fontFamily: "Inter_500Medium" }]}>
                {church.membershipSize.charAt(0).toUpperCase() + church.membershipSize.slice(1)} congregation
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.actionsRow}>
          <Pressable onPress={openDirections} style={[s.actionBtn, { backgroundColor: C.coral }]}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={[s.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>Directions</Text>
          </Pressable>
          {church.contactPhone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${church.contactPhone}`)}
              style={[s.actionBtnOutline, { borderColor: C.border }]}
            >
              <Ionicons name="call" size={18} color={C.ink} />
              <Text style={[s.actionBtnOutlineText, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>Call</Text>
            </Pressable>
          ) : null}
          {church.website ? (
            <Pressable
              onPress={() => Linking.openURL(church.website!)}
              style={[s.actionBtnOutline, { borderColor: C.border }]}
            >
              <Ionicons name="globe" size={18} color={C.ink} />
              <Text style={[s.actionBtnOutlineText, { color: C.ink, fontFamily: "Inter_600SemiBold" }]}>Web</Text>
            </Pressable>
          ) : null}
        </View>

        {church.contactEmail ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${church.contactEmail}`)}
            style={[s.emailBtn, { borderColor: C.border }]}
          >
            <Ionicons name="mail" size={16} color={C.inkMuted} />
            <Text style={[s.emailText, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
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
