import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BookOpen } from "lucide-react-native";
import { D2, F } from "./tokens";

export function Header({
  title,
  eyebrow,
  onBack,
  action,
  testID,
  topInset = 0,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  action?: () => void;
  testID?: string;
  topInset?: number;
}) {
  return (
    <View
      accessibilityLabel={testID ? `${title} preview header` : undefined}
      nativeID={testID}
      style={[s.header, { paddingTop: 14 + topInset }]}
      testID={testID}
    >
      {onBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={onBack}
          hitSlop={12}
          testID="preview-back"
        >
          <Ionicons name="arrow-back" size={22} color={D2.ink} />
        </Pressable>
      ) : (
        <View style={{ width: 22 }} />
      )}
      <View style={{ flex: 1, marginHorizontal: 14 }}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable
          accessibilityLabel="Share this reading"
          accessibilityRole="button"
          onPress={action}
          hitSlop={12}
        >
          <Ionicons name="share-outline" size={21} color={D2.ink} />
        </Pressable>
      ) : (
        <View style={{ width: 22 }} />
      )}
    </View>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  testID,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  testID?: string;
}) {
  return (
    <View style={s.sectionHeading} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={s.sectionSub}>{subtitle}</Text> : null}
      </View>
      {action ? <Text style={s.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function LoadingState({ label = "Preparing today's reading" }: { label?: string }) {
  return (
    <View style={s.state}>
      <ActivityIndicator color={D2.violet} />
      <Text style={s.stateText}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  onRetry,
  label = "This reading could not be opened.",
}: {
  onRetry: () => void;
  label?: string;
}) {
  return (
    <View style={s.state}>
      <Ionicons name="cloud-offline-outline" size={30} color={D2.muted} />
      <Text style={s.stateTitle}>A quiet pause</Text>
      <Text style={s.stateText}>{label}</Text>
      <Pressable onPress={onRetry} style={s.outlineButton}>
        <Text style={s.outlineText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
  onAction,
  testID,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <View style={s.empty} testID={testID}>
      <View style={s.emptyIcon}>
        <BookOpen size={25} color={D2.violet} strokeWidth={1.8} />
      </View>
      <Text style={s.stateTitle}>{title}</Text>
      <Text style={s.stateText}>{body}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={s.outlineButton}>
          <Text style={s.outlineText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  testID,
  disabled,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        s.primaryButton,
        { opacity: disabled ? 0.55 : pressed ? 0.82 : 1 },
      ]}
    >
      <Text style={s.primaryText}>{label}</Text>
      <Ionicons name="arrow-forward" size={17} color="#fff" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  eyebrow: {
    fontFamily: F.interSemi,
    fontSize: 10,
    letterSpacing: 1.4,
    color: D2.muted,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontFamily: F.loraSemi,
    fontSize: 21,
    color: D2.ink,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 25,
    marginBottom: 11,
  },
  sectionTitle: {
    fontFamily: F.loraSemi,
    color: D2.ink,
    fontSize: 21,
  },
  sectionSub: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 18,
  },
  sectionAction: {
    fontFamily: F.interSemi,
    color: D2.violet,
    fontSize: 12,
    paddingBottom: 3,
  },
  state: {
    alignItems: "center",
    justifyContent: "center",
    padding: 42,
    gap: 10,
  },
  stateTitle: {
    fontFamily: F.loraSemi,
    fontSize: 18,
    color: D2.ink,
    textAlign: "center",
  },
  stateText: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 300,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: D2.violet,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 5,
  },
  outlineText: {
    fontFamily: F.interSemi,
    color: D2.violet,
    fontSize: 13,
  },
  empty: {
    alignItems: "center",
    padding: 26,
    borderRadius: 18,
    backgroundColor: D2.card,
    borderWidth: 1,
    borderColor: D2.border,
    gap: 9,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: D2.violetFill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: D2.coral,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 20,
  },
  primaryText: {
    fontFamily: F.interBold,
    color: "#fff",
    fontSize: 15,
  },
});
