import React, { ReactNode } from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface ListItemProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: ReactNode;
  showChevron?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export default function ListItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
  style,
  testID,
}: ListItemProps) {
  const { theme, isDark } = useTheme();
  const resolvedIconColor = iconColor || theme.accent;

  const content = (
    <View
      style={[
        s.container,
        {
          backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {icon ? (
        <View style={[s.iconWrap, { backgroundColor: resolvedIconColor + "12" }]}>
          <Ionicons name={icon} size={20} color={resolvedIconColor} />
        </View>
      ) : null}
      <View style={s.textWrap}>
        <Text
          style={[s.title, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[s.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement}
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) return <View testID={testID}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
});
