import React, { useEffect, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";

/**
 * Coloured placeholder first, then the Adventech image. A missing file
 * removes the frame so the surrounding cream layout stays as it is.
 */
export function SabbathSchoolArtwork({
  uri,
  title,
  color,
  width,
  height,
  radius = 10,
  style,
  testID,
}: {
  uri: string | null;
  title: string;
  color: string;
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [uri]);
  if (!uri || failed) return null;
  return (
    <View
      style={[{ width, height, borderRadius: radius, overflow: "hidden", backgroundColor: color }, style]}
      testID={testID}
    >
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={uri}
        priority="low"
        transition={0}
        accessibilityLabel={`Cover of ${title}`}
        alt={`Cover of ${title}`}
        onError={() => setFailed(true)}
      />
    </View>
  );
}
