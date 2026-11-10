import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiRequest } from "@/lib/query-client";
import {
  UGC_REPORT_REASONS,
  UGC_REPORT_THANKS,
  ugcMemberId,
  type UgcReportReason,
  type UgcSurface,
} from "@/lib/ugc-moderation";
import { confirmWebSafe } from "@/components/WebSafeConfirm";

const FONT_CAP = 1.6;

export function useBlockedUserIds(): Set<string> {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: ["/api/ugc/blocks"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ugc/blocks");
      const data = (await res.json()) as { blockedUserIds?: string[] };
      return Array.isArray(data.blockedUserIds) ? data.blockedUserIds : [];
    },
  });
  return new Set(query.data ?? []);
}

type Props = {
  surface: UgcSurface;
  contentId: string;
  targetUserId?: string | null;
  authorName?: string | null;
  snapshot: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** Opens the report sheet immediately, for a live-room tile message. */
  sheetOnly?: boolean;
  onClose?: () => void;
};

export function ReportOrBlock({
  surface,
  contentId,
  targetUserId,
  authorName,
  snapshot,
  color,
  style,
  sheetOnly,
  onClose,
}: Props) {
  const { userId, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const blocked = useBlockedUserIds();
  const [open, setOpen] = useState(!!sheetOnly);
  const [reason, setReason] = useState<UgcReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [thanks, setThanks] = useState(false);
  const ink = color ?? "#6B6660";
  const memberId = ugcMemberId(targetUserId);
  const isSelf = !!memberId && memberId === userId;
  const isBlocked = !!memberId && blocked.has(memberId);

  const reportMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/ugc/reports", {
        surface,
        contentId,
        targetUserId: memberId,
        snapshot: snapshot.slice(0, 4000),
        reason,
        comment: comment.trim() || null,
      });
    },
    onSuccess: () => {
      setThanks(true);
      setTimeout(() => {
        setOpen(false);
        setThanks(false);
        setReason(null);
        setComment("");
        onClose?.();
      }, 1200);
    },
    onError: () => showToast("Could not send the report. Please try again.", "error"),
  });

  const blockMutation = useMutation({
    mutationFn: async (block: boolean) => {
      if (!memberId) return;
      if (block) {
        await apiRequest("POST", "/api/ugc/blocks", { blockedUserId: memberId });
      } else {
        await apiRequest("DELETE", `/api/ugc/blocks/${encodeURIComponent(memberId)}`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/ugc/blocks"] });
    },
    onError: () => showToast("Could not update this block. Please try again.", "error"),
  });

  if (isSelf) return null;

  const close = () => {
    if (reportMutation.isPending) return;
    setOpen(false);
    setThanks(false);
    onClose?.();
  };

  const onBlock = () => {
    if (!isAuthenticated) {
      showToast("Sign in to block a member.", "error");
      return;
    }
    if (!memberId || blockMutation.isPending) return;
    if (isBlocked) {
      blockMutation.mutate(false);
      return;
    }
    const name = authorName?.trim() || "this member";
    void confirmWebSafe({
      title: "Block member",
      message: `Block ${name}? Their posts, replies, and prayers will be hidden from you.`,
      confirmLabel: "Block",
      destructive: true,
    }).then((ok) => {
      if (ok) blockMutation.mutate(true);
    });
  };

  const buttons = sheetOnly ? null : (
    <View style={[styles.row, style]}>
      <Pressable
        onPress={() => {
          if (!isAuthenticated) {
            showToast("Sign in to report this.", "error");
            return;
          }
          setOpen(true);
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={authorName ? `Report ${authorName}` : "Report"}
        testID={`ugc-report-${contentId}`}
      >
        <Text style={[styles.link, { color: ink }]} maxFontSizeMultiplier={FONT_CAP}>
          Report
        </Text>
      </Pressable>
      {memberId ? (
        <Pressable
          onPress={onBlock}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isBlocked ? `Unblock ${authorName || "member"}` : `Block ${authorName || "member"}`}
          testID={`ugc-block-${contentId}`}
        >
          <Text style={[styles.link, { color: ink }]} maxFontSizeMultiplier={FONT_CAP}>
            {isBlocked ? "Unblock" : "Block"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <>
      {buttons}
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {thanks ? (
              <Text style={styles.thanks} maxFontSizeMultiplier={FONT_CAP}>
                {UGC_REPORT_THANKS}
              </Text>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle} maxFontSizeMultiplier={FONT_CAP}>
                    Report
                  </Text>
                  <Pressable onPress={close} accessibilityLabel="Close report" hitSlop={8}>
                    <Ionicons name="close" size={20} color={PathB.ink} />
                  </Pressable>
                </View>
                {UGC_REPORT_REASONS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setReason(item)}
                    style={[styles.reason, reason === item && styles.reasonOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: reason === item }}
                  >
                    <Text style={styles.reasonText} maxFontSizeMultiplier={FONT_CAP}>
                      {item}
                    </Text>
                  </Pressable>
                ))}
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Add a note (optional)"
                  placeholderTextColor="#8A847A"
                  style={styles.input}
                  multiline
                  maxLength={500}
                />
                {memberId ? (
                  <Pressable onPress={onBlock} style={styles.block} testID="ugc-report-block">
                    <Text style={styles.blockText} maxFontSizeMultiplier={FONT_CAP}>
                      {isBlocked ? "Unblock" : "Block"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.send, (!reason || reportMutation.isPending) && { opacity: 0.5 }]}
                  disabled={!reason || reportMutation.isPending}
                  onPress={() => reportMutation.mutate()}
                  testID="ugc-report-send"
                >
                  {reportMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendText} maxFontSizeMultiplier={FONT_CAP}>
                      Send
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 6 },
  link: { fontSize: 13, fontFamily: "Inter_500Medium" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    gap: 8,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: PathB.ink },
  reason: {
    borderWidth: 1,
    borderColor: "#E7E0D2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  reasonOn: { borderColor: PathB.coral, backgroundColor: "#FFF6F4" },
  reasonText: { fontSize: 15, color: PathB.ink, fontFamily: "Inter_500Medium" },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#E7E0D2",
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: PathB.ink,
    textAlignVertical: "top",
  },
  block: {
    borderWidth: 1,
    borderColor: PathB.coral,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  blockText: { color: PathB.coralInk, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  send: {
    backgroundColor: PathB.coral,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sendText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  thanks: {
    fontSize: 16,
    color: PathB.ink,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingVertical: 24,
  },
});
