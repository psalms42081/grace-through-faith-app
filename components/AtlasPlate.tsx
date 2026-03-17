import React, { useState, useCallback } from "react";
import {
  View,
  Image,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import type { AtlasPlate as AtlasPlateType, AtlasHotspot } from "@/constants/atlas-plates";

interface AtlasPlateProps {
  plate: AtlasPlateType;
  onHotspotPress: (hotspot: AtlasHotspot) => void;
}

const MIN_HIT_SIZE = 28;
const DOT_SIZE = 5;

export default function AtlasPlate({ plate, onHotspotPress }: AtlasPlateProps) {
  const [imageLayout, setImageLayout] = useState<{
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const handleContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width: containerW, height: containerH } = e.nativeEvent.layout;
      const imgAspect = plate.aspectRatio;
      const containerAspect = containerW / containerH;

      let renderW: number;
      let renderH: number;

      if (imgAspect > containerAspect) {
        renderW = containerW;
        renderH = containerW / imgAspect;
      } else {
        renderH = containerH;
        renderW = containerH * imgAspect;
      }

      const offsetX = (containerW - renderW) / 2;
      const offsetY = (containerH - renderH) / 2;

      setImageLayout({ width: renderW, height: renderH, offsetX, offsetY });
    },
    [plate.aspectRatio]
  );

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <Image
        source={plate.imageSource}
        style={styles.image}
        resizeMode="contain"
      />
      {imageLayout &&
        plate.hotspots.map((hotspot) => {
          const radiusMult = hotspot.radius || 1;
          const hitSize = MIN_HIT_SIZE * radiusMult;
          const px = imageLayout.offsetX + hotspot.x * imageLayout.width;
          const py = imageLayout.offsetY + hotspot.y * imageLayout.height;

          return (
            <Pressable
              key={hotspot.id}
              onPress={() => onHotspotPress(hotspot)}
              hitSlop={4}
              style={[
                styles.hotspot,
                {
                  left: px - hitSize / 2,
                  top: py - hitSize / 2,
                  width: hitSize,
                  height: hitSize,
                  borderRadius: hitSize / 2,
                },
              ]}
            >
              <View style={styles.dot} />
            </Pressable>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  hotspot: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "rgba(42, 34, 24, 0.55)",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
});
