import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { safeGoBack } from "@/lib/safe-back";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl, apiRequest } from "@/lib/query-client";

const GOLD = "#C9933A";
const BG = "#050507";

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number;
  memberRange: string;
  icon: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "small-church",
    name: "Small Church",
    description: "Under 100 members",
    monthlyPrice: 29.99,
    annualPrice: 299,
    memberRange: "< 100",
    icon: "home",
  },
  {
    id: "medium-church",
    name: "Medium Church",
    description: "100–500 members",
    monthlyPrice: 79.99,
    annualPrice: 799,
    memberRange: "100–500",
    icon: "business",
  },
  {
    id: "large-church",
    name: "Large Church",
    description: "500+ members",
    monthlyPrice: 149.99,
    annualPrice: 1499,
    memberRange: "500+",
    icon: "globe",
  },
  {
    id: "conference",
    name: "Conference",
    description: "Up to 100 churches",
    monthlyPrice: null,
    annualPrice: 4999,
    memberRange: "100 churches",
    icon: "git-network",
  },
  {
    id: "union",
    name: "Union",
    description: "Up to 10 conferences",
    monthlyPrice: null,
    annualPrice: 14999,
    memberRange: "10 conferences",
    icon: "layers",
  },
  {
    id: "division",
    name: "Division",
    description: "Unlimited conferences",
    monthlyPrice: null,
    annualPrice: 39999,
    memberRange: "Unlimited",
    icon: "earth",
  },
];

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function annualSavings(tier: PricingTier): number | null {
  if (!tier.monthlyPrice) return null;
  const yearlyCostMonthly = tier.monthlyPrice * 12;
  return Math.round(yearlyCostMonthly - tier.annualPrice);
}

interface EnrolledChurch {
  id: string;
  name: string;
  memberCount: number;
  tier: string;
  status: "active" | "pending" | "expired";
  renewalDate: string;
}

interface SdaChurchResult {
  id: string;
  name: string;
  city: string;
  state: string | null;
  country: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(46,204,113,0.15)", text: "#2ECC71" },
  pending: { bg: "rgba(241,196,15,0.15)", text: "#F1C40F" },
  expired: { bg: "rgba(231,76,60,0.15)", text: "#E74C3C" },
};

export default function ConferencePortalScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [churchCount, setChurchCount] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<"none" | "valid" | "invalid">("none");
  const [showAddChurch, setShowAddChurch] = useState(false);
  const [churchSearch, setChurchSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SdaChurchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: myOrg } = useQuery<{ organization: any; role: string | null }>({
    queryKey: ["/api/organizations/my-org"],
  });

  const conferenceId = myOrg?.organization?.id;
  const isConference = myOrg?.organization?.type === "conference";

  const { data: enrolledRaw, isLoading: enrolledLoading } = useQuery<any[]>({
    queryKey: [`/api/organizations/${conferenceId}/churches`],
    enabled: !!conferenceId && isConference,
  });

  const enrolledChurches: EnrolledChurch[] = useMemo(() => {
    if (!enrolledRaw) return [];
    return enrolledRaw.map((c: any) => ({
      id: c.id,
      name: c.name,
      memberCount: c.memberCount || 0,
      tier: c.tier || "free",
      status: (c.tier && c.tier !== "free" ? "active" : "pending") as "active" | "pending" | "expired",
      renewalDate: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
    }));
  }, [enrolledRaw]);

  const handleChurchSearch = useCallback((query: string) => {
    setChurchSearch(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = new URL("/api/churches", getApiUrl());
        url.searchParams.set("city", query.trim());
        const resp = await fetch(url.toString());
        const data = await resp.json();
        setSearchResults((data as SdaChurchResult[]).slice(0, 30));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  async function handleAddChurch(church: SdaChurchResult) {
    if (!conferenceId) return;
    try {
      await apiRequest(`/api/organizations/${conferenceId}/churches`, "POST", { name: church.name }, token || undefined);
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${conferenceId}/churches`] });
      setShowAddChurch(false);
      setChurchSearch("");
      setSearchResults([]);
      const msg = `${church.name} has been added to your conference.`;
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Church Added", msg);
      }
    } catch {
      const errMsg = "Failed to add church. Please try again.";
      if (Platform.OS === "web") {
        window.alert(errMsg);
      } else {
        Alert.alert("Error", errMsg);
      }
    }
  }

  const activeTierId = selectedTier || "small-church";
  const activeTier = PRICING_TIERS.find((t) => t.id === activeTierId)!;

  const calcSummary = useMemo(() => {
    const showMonthly = billingCycle === "monthly" && activeTier.monthlyPrice !== null;
    const unitPrice = showMonthly ? activeTier.monthlyPrice! : activeTier.annualPrice;
    const subtotal = unitPrice * churchCount;
    const discountRate = promoApplied === "valid" ? 0.2 : 0;
    const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
    const total = subtotal - discountAmount;
    const period = showMonthly ? "/mo" : "/yr";
    return { unitPrice, subtotal, discountRate, discountAmount, total, period };
  }, [activeTier, churchCount, billingCycle, promoApplied]);

  function handleApplyPromo() {
    if (promoCode.trim().toUpperCase() === "BETA2026") {
      setPromoApplied("valid");
    } else {
      setPromoApplied("invalid");
    }
  }

  function handleRequestQuote() {
    const msg = "Your quote request has been sent. Our team will contact you at your registered email within 24 hours.";
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Quote Requested", msg);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => safeGoBack(router, "/(tabs)/profile")} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Conference Portal</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.headerSub}>
          Manage church subscriptions and bulk licensing
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Pricing Plans</Text>
        <Text style={styles.sectionSub}>
          Choose the right plan for your organization
        </Text>

        <View style={styles.cycleToggle}>
          <Pressable
            onPress={() => setBillingCycle("monthly")}
            style={[
              styles.cycleBtn,
              billingCycle === "monthly" && styles.cycleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.cycleBtnText,
                billingCycle === "monthly" && styles.cycleBtnTextActive,
              ]}
            >
              Monthly
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBillingCycle("annual")}
            style={[
              styles.cycleBtn,
              billingCycle === "annual" && styles.cycleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.cycleBtnText,
                billingCycle === "annual" && styles.cycleBtnTextActive,
              ]}
            >
              Annual
            </Text>
          </Pressable>
        </View>

        <View style={styles.tiersGrid}>
          {PRICING_TIERS.map((tier) => {
            const isSelected = selectedTier === tier.id;
            const savings = annualSavings(tier);
            const showMonthly = billingCycle === "monthly" && tier.monthlyPrice !== null;
            const displayPrice = showMonthly ? tier.monthlyPrice! : tier.annualPrice;
            const period = showMonthly ? "/mo" : "/yr";
            const noMonthly = billingCycle === "monthly" && tier.monthlyPrice === null;

            return (
              <Pressable
                key={tier.id}
                onPress={() => setSelectedTier(isSelected ? null : tier.id)}
                style={[
                  styles.tierCard,
                  isSelected && styles.tierCardSelected,
                ]}
              >
                {billingCycle === "annual" && savings !== null && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>
                      Save ${formatPrice(savings)}
                    </Text>
                  </View>
                )}

                <View style={styles.tierIconWrap}>
                  <Ionicons name={tier.icon as any} size={24} color={isSelected ? GOLD : "rgba(255,255,255,0.5)"} />
                </View>

                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierDesc}>{tier.description}</Text>

                <View style={styles.tierPriceRow}>
                  {noMonthly ? (
                    <Text style={styles.tierAnnualOnly}>Annual only</Text>
                  ) : (
                    <>
                      <Text style={styles.tierDollar}>$</Text>
                      <Text style={styles.tierPrice}>{formatPrice(displayPrice)}</Text>
                      <Text style={styles.tierPeriod}>{period}</Text>
                    </>
                  )}
                </View>

                <Pressable
                  onPress={() => setSelectedTier(tier.id)}
                  style={[
                    styles.selectBtn,
                    isSelected && styles.selectBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.selectBtnText,
                      isSelected && styles.selectBtnTextActive,
                    ]}
                  >
                    {isSelected ? "Selected" : "Select Plan"}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>BULK ENROLLMENT CALCULATOR</Text>

        <View style={styles.calcCard}>
          <Text style={styles.calcFieldLabel}>Number of Churches</Text>
          <View style={styles.counterRow}>
            <Pressable
              onPress={() => setChurchCount((c) => Math.max(1, c - 1))}
              style={styles.counterBtn}
            >
              <Ionicons name="remove" size={22} color="#fff" />
            </Pressable>
            <View style={styles.counterDisplay}>
              <Text style={styles.counterText}>{churchCount}</Text>
            </View>
            <Pressable
              onPress={() => setChurchCount((c) => Math.min(500, c + 1))}
              style={styles.counterBtn}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>

          <Text style={[styles.calcFieldLabel, { marginTop: 16 }]}>Subscription Tier</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calcTierRow}
          >
            {PRICING_TIERS.filter((t) => ["small-church", "medium-church", "large-church"].includes(t.id)).map((tier) => {
              const isActive = activeTierId === tier.id;
              return (
                <Pressable
                  key={tier.id}
                  onPress={() => setSelectedTier(tier.id)}
                  style={[
                    styles.calcTierChip,
                    isActive && styles.calcTierChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.calcTierChipText,
                      isActive && styles.calcTierChipTextActive,
                    ]}
                  >
                    {tier.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>Cost Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Per church ({activeTier.name})</Text>
            <Text style={styles.summaryValue}>
              ${formatPrice(calcSummary.unitPrice)}{calcSummary.period}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Churches</Text>
            <Text style={styles.summaryValue}>{churchCount}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ${formatPrice(calcSummary.subtotal)}{calcSummary.period}
            </Text>
          </View>

          <View style={styles.promoRow}>
            <TextInput
              style={styles.promoInput}
              placeholder="Promo code"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={promoCode}
              onChangeText={(t) => {
                setPromoCode(t);
                if (promoApplied !== "none") setPromoApplied("none");
              }}
              autoCapitalize="characters"
            />
            <Pressable onPress={handleApplyPromo} style={styles.promoApplyBtn}>
              <Text style={styles.promoApplyText}>Apply</Text>
            </Pressable>
          </View>
          {promoApplied === "invalid" && (
            <Text style={styles.promoError}>Invalid promo code</Text>
          )}
          {promoApplied === "valid" && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Discount (20%)</Text>
              <Text style={styles.discountValue}>
                -${formatPrice(calcSummary.discountAmount)}
              </Text>
            </View>
          )}

          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalValue}>
              ${formatPrice(calcSummary.total)}{calcSummary.period}
            </Text>
          </View>

          <Pressable onPress={handleRequestQuote} style={styles.quoteBtn}>
            <Text style={styles.quoteBtnText}>Request Quote</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>ENROLLED CHURCHES</Text>

        {enrolledLoading ? (
          <View style={styles.enrolledLoadingWrap}>
            <ActivityIndicator size="small" color={GOLD} />
          </View>
        ) : enrolledChurches.length === 0 ? (
          <View style={styles.emptyEnrolledCard}>
            <Ionicons name="business-outline" size={32} color="rgba(201,147,58,0.4)" />
            <Text style={styles.emptyEnrolledTitle}>No churches enrolled yet</Text>
            <Text style={styles.emptyEnrolledSub}>Add your first church below to get started</Text>
          </View>
        ) : (
          <View style={styles.enrolledList}>
            {enrolledChurches.map((church) => {
              const statusStyle = STATUS_COLORS[church.status] || STATUS_COLORS.pending;
              return (
                <View key={church.id} style={styles.enrolledRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.enrolledName}>{church.name}</Text>
                    <Text style={styles.enrolledMembers}>{church.memberCount} members</Text>
                  </View>
                  <View style={styles.enrolledRight}>
                    <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {church.status.charAt(0).toUpperCase() + church.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.enrolledRenewal}>{church.renewalDate}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => setShowAddChurch(true)}
          style={styles.addChurchBtn}
        >
          <Ionicons name="add" size={20} color={GOLD} />
          <Text style={styles.addChurchBtnText}>Add Church</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>BILLING SUMMARY</Text>

        <View style={styles.billingCard}>
          <View style={styles.billingRow}>
            <Ionicons name="calendar-outline" size={20} color={GOLD} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.billingLabel}>Next Renewal</Text>
              <Text style={styles.billingValue}>
                {(() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() + 1);
                  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                })()}
              </Text>
            </View>
          </View>

          <View style={styles.billingDividerLine} />

          <View style={styles.billingRow}>
            <Ionicons name="card-outline" size={20} color={GOLD} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.billingLabel}>Payment Method</Text>
              <Text style={styles.billingValueGold}>Invoice billing available for conferences</Text>
            </View>
          </View>

          <View style={styles.billingDividerLine} />

          <View style={styles.billingRow}>
            <Ionicons name="mail-outline" size={20} color={GOLD} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.billingLabel}>Billing Contact</Text>
              <Text style={styles.billingValue}>{user?.email || "Not set"}</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => {
            const msg = "Invoice download will be available after your subscription is activated.";
            if (Platform.OS === "web") { window.alert(msg); } else { Alert.alert("Coming Soon", msg); }
          }}
          style={styles.invoiceBtn}
        >
          <Ionicons name="document-text-outline" size={18} color={GOLD} />
          <Text style={styles.invoiceBtnText}>Download Invoice</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const msg = "Contact us at joseph@gracethroughfaith.app or visit gracethroughfaith.app to discuss enterprise licensing.";
            if (Platform.OS === "web") { window.alert(msg); } else { Alert.alert("Contact Sales", msg); }
          }}
          style={styles.contactSalesBtn}
        >
          <Ionicons name="call-outline" size={18} color="#fff" />
          <Text style={styles.contactSalesBtnText}>Contact Sales Team</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showAddChurch}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddChurch(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Church</Text>
                <Pressable onPress={() => { setShowAddChurch(false); setChurchSearch(""); setSearchResults([]); }} hitSlop={12}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              <View style={styles.modalSearchRow}>
                <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search churches by name or city"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={churchSearch}
                  onChangeText={handleChurchSearch}
                  autoFocus
                />
                {churchSearch.length > 0 && (
                  <Pressable onPress={() => { setChurchSearch(""); setSearchResults([]); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                )}
              </View>

              {searching ? (
                <View style={styles.modalLoadingWrap}>
                  <ActivityIndicator size="small" color={GOLD} />
                  <Text style={styles.modalLoadingText}>Searching...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  style={styles.modalResultsList}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleAddChurch(item)}
                      style={({ pressed }) => [
                        styles.modalResultRow,
                        pressed && { backgroundColor: "rgba(201,147,58,0.1)" },
                      ]}
                    >
                      <View style={styles.modalResultIcon}>
                        <Ionicons name="business" size={18} color={GOLD} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalResultName}>{item.name}</Text>
                        <Text style={styles.modalResultLocation}>
                          {[item.city, item.state, item.country].filter(Boolean).join(", ")}
                        </Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={GOLD} />
                    </Pressable>
                  )}
                />
              ) : churchSearch.trim().length >= 2 ? (
                <View style={styles.modalEmptyWrap}>
                  <Ionicons name="search-outline" size={32} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.modalEmptyText}>No churches found for "{churchSearch}"</Text>
                </View>
              ) : (
                <View style={styles.modalEmptyWrap}>
                  <Ionicons name="earth-outline" size={32} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.modalEmptyText}>Search from 96,800+ SDA churches worldwide</Text>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: BG,
    zIndex: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Lora_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 20,
  },
  scroll: { flex: 1 },

  sectionTitle: {
    fontSize: 20,
    fontFamily: "Lora_700Bold",
    color: "#fff",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  cycleToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cycleBtnActive: {
    backgroundColor: GOLD,
  },
  cycleBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
  },
  cycleBtnTextActive: {
    color: "#fff",
  },

  tiersGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tierCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.25)",
    padding: 20,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  tierCardSelected: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,147,58,0.08)",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  savingsBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(201,147,58,0.18)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.35)",
  },
  savingsBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
  },
  tierIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(201,147,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tierName: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  tierDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 14,
  },
  tierPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
    minHeight: 40,
  },
  tierDollar: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
    marginBottom: 4,
  },
  tierPrice: {
    fontSize: 36,
    fontFamily: "Lora_700Bold",
    color: "#fff",
    lineHeight: 40,
  },
  tierPeriod: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 6,
    marginLeft: 2,
  },
  tierAnnualOnly: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  selectBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.4)",
    alignItems: "center",
  },
  selectBtnActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  selectBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
  },
  selectBtnTextActive: {
    color: "#fff",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 20,
    marginVertical: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Lora_700Bold",
    color: GOLD,
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  calcCard: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 20,
    marginBottom: 16,
  },
  calcFieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(201,147,58,0.15)",
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterDisplay: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  calcTierRow: {
    gap: 8,
  },
  calcTierChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  calcTierChipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  calcTierChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },
  calcTierChipTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },

  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.2)",
    padding: 20,
    marginBottom: 16,
  },
  summaryHeading: {
    fontSize: 16,
    fontFamily: "Lora_700Bold",
    color: "#fff",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 10,
  },
  promoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  promoInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#fff",
  },
  promoApplyBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "rgba(201,147,58,0.15)",
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  promoApplyText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
  },
  promoError: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#E74C3C",
    marginBottom: 8,
  },
  discountLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#2ECC71",
  },
  discountValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#2ECC71",
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Lora_700Bold",
    color: "#fff",
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Lora_700Bold",
    color: GOLD,
  },
  quoteBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: "center",
  },
  quoteBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  enrolledLoadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyEnrolledCard: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.2)",
    padding: 30,
    alignItems: "center",
    gap: 8,
  },
  emptyEnrolledTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
  },
  emptyEnrolledSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  enrolledList: {
    marginHorizontal: 20,
    gap: 8,
  },
  enrolledRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  enrolledName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    marginBottom: 2,
  },
  enrolledMembers: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: GOLD,
  },
  enrolledRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  enrolledRenewal: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
  addChurchBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.4)",
  },
  addChurchBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "80%",
  },
  modalContent: {
    backgroundColor: "#1A1A1E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    color: "#fff",
  },
  modalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#fff",
    padding: 0,
  },
  modalLoadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  modalResultsList: {
    flex: 1,
  },
  modalResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  modalResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(201,147,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalResultName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    marginBottom: 2,
  },
  modalResultLocation: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  modalEmptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  modalEmptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
  },

  billingCard: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
  },
  billingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  billingDividerLine: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 2,
  },
  billingLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 2,
  },
  billingValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  billingValueGold: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    color: GOLD,
  },
  invoiceBtn: {
    marginHorizontal: 20,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.4)",
  },
  invoiceBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
  },
  contactSalesBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GOLD,
  },
  contactSalesBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
