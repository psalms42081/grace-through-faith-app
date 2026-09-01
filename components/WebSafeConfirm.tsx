import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { PathB } from "@/constants/colors";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  destructive?: boolean;
  testID?: string;
};

export type ActionItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export type ActionOptions = {
  title?: string;
  message?: string;
  actions: ActionItem[];
  cancelLabel?: string;
  testID?: string;
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

let presentConfirm: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;
let presentActions: ((opts: ActionOptions) => void) | null = null;

export function confirmWebSafe(opts: ConfirmOptions): Promise<boolean> {
  if (!presentConfirm) return Promise.resolve(false);
  return presentConfirm(opts);
}

export function showWebSafeActions(opts: ActionOptions): void {
  presentActions?.(opts);
}

export function useConfirm() {
  return {
    confirm: confirmWebSafe,
    showActions: showWebSafeActions,
  };
}

export function WebSafeConfirmHost({ children }: { children: React.ReactNode }) {
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [actionReq, setActionReq] = useState<ActionOptions | null>(null);
  const confirmReqRef = useRef<ConfirmRequest | null>(null);

  const settleConfirm = useCallback((value: boolean) => {
    const current = confirmReqRef.current;
    confirmReqRef.current = null;
    setConfirmReq(null);
    current?.resolve(value);
  }, []);

  useEffect(() => {
    presentConfirm = (opts) =>
      new Promise<boolean>((resolve) => {
        if (confirmReqRef.current) confirmReqRef.current.resolve(false);
        const next = { ...opts, resolve };
        confirmReqRef.current = next;
        setActionReq(null);
        setConfirmReq(next);
      });
    presentActions = (opts) => {
      if (confirmReqRef.current) {
        confirmReqRef.current.resolve(false);
        confirmReqRef.current = null;
        setConfirmReq(null);
      }
      setActionReq(opts);
    };
    return () => {
      if (presentConfirm) presentConfirm = null;
      if (presentActions) presentActions = null;
      if (confirmReqRef.current) {
        confirmReqRef.current.resolve(false);
        confirmReqRef.current = null;
      }
    };
  }, []);

  const confirmVisible = confirmReq != null;
  const actionsVisible = actionReq != null;
  const hideCancel = confirmReq?.cancelLabel === null;

  return (
    <>
      {children}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => settleConfirm(false)}
      >
        <Pressable
          style={s.overlay}
          onPress={() => {
            if (!hideCancel) settleConfirm(false);
          }}
        >
          <Pressable
            style={s.sheet}
            onPress={() => {}}
            testID={confirmReq?.testID ?? "web-safe-confirm"}
          >
            <View style={s.handle} />
            <Text style={s.title}>{confirmReq?.title}</Text>
            {confirmReq?.message ? (
              <Text style={s.message}>{confirmReq.message}</Text>
            ) : null}
            <View style={s.row}>
              {!hideCancel ? (
                <Pressable
                  onPress={() => settleConfirm(false)}
                  style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}
                  testID="web-safe-confirm-cancel"
                  accessibilityRole="button"
                  accessibilityLabel={confirmReq?.cancelLabel ?? "Cancel"}
                >
                  <Text style={s.secondaryText}>{confirmReq?.cancelLabel ?? "Cancel"}</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => settleConfirm(true)}
                style={({ pressed }) => [
                  s.primaryBtn,
                  confirmReq?.destructive && s.destructiveBtn,
                  pressed && s.pressed,
                  hideCancel && { flex: 1 },
                ]}
                testID="web-safe-confirm-ok"
                accessibilityRole="button"
                accessibilityLabel={confirmReq?.confirmLabel ?? "OK"}
              >
                <Text style={s.primaryText}>{confirmReq?.confirmLabel ?? "OK"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={actionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionReq(null)}
      >
        <Pressable style={s.overlay} onPress={() => setActionReq(null)}>
          <Pressable
            style={s.sheet}
            onPress={() => {}}
            testID={actionReq?.testID ?? "web-safe-actions"}
          >
            <View style={s.handle} />
            {actionReq?.title ? <Text style={s.title}>{actionReq.title}</Text> : null}
            {actionReq?.message ? <Text style={s.message}>{actionReq.message}</Text> : null}
            {actionReq?.actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  setActionReq(null);
                  action.onPress();
                }}
                style={({ pressed }) => [s.actionRow, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Text style={[s.actionText, action.destructive && s.destructiveText]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setActionReq(null)}
              style={({ pressed }) => [s.secondaryBtn, { marginTop: 12 }, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={actionReq?.cancelLabel ?? "Cancel"}
            >
              <Text style={s.secondaryText}>{actionReq?.cancelLabel ?? "Cancel"}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(31,26,18,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: PathB.surfaceCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(31,26,18,0.15)",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: PathB.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: PathB.inkMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(31,26,18,0.12)",
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: PathB.ink,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PathB.coral,
    alignItems: "center",
  },
  destructiveBtn: {
    backgroundColor: "#EF4444",
  },
  primaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  actionRow: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(31,26,18,0.08)",
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: PathB.ink,
  },
  destructiveText: {
    color: "#EF4444",
  },
  pressed: {
    opacity: 0.76,
  },
});
