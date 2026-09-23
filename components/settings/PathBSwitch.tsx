import React from "react";
import { Switch, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { PathB } from "@/constants/colors";

export const PATH_B_SWITCH_TRACK = {
  false: "#D8D0BE",
  true: PathB.coral,
} as const;
export const PATH_B_SWITCH_THUMB = "#FFFFFF";
export const PATH_B_SWITCH_IOS_BACKGROUND = "#D8D0BE";

export function PathBSwitch({
  value,
  onValueChange,
  disabled,
  testID,
  style,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ ...PATH_B_SWITCH_TRACK }}
      thumbColor={PATH_B_SWITCH_THUMB}
      ios_backgroundColor={PATH_B_SWITCH_IOS_BACKGROUND}
      testID={testID}
      style={style ?? styles.switch}
    />
  );
}

const styles = StyleSheet.create({
  switch: { marginRight: 4 },
});
