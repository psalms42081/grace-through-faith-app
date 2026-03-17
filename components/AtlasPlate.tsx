import React, { useState, useCallback } from "react";
import {
  View,
  Image,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { AtlasPlate as AtlasPlateType, AtlasHotspot } from "@/constants/atlas-plates";

interface AtlasPlateProps {
  plate: AtlasPlateType;
  onHotspotPress: (hotspot: AtlasHotspot) => void;
}

const MIN_HIT_SIZE = 28;
const DOT_SIZE = 4;

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
      {imageLayout && (
        <View
          style={[
            styles.titleOverlay,
            {
              left: imageLayout.offsetX,
              right: imageLayout.offsetX,
              bottom: imageLayout.offsetY,
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["transparent", "rgba(20,18,14,0.45)"]}
            style={styles.titleGradient}
          />
        </View>
      )}
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
    backgroundColor: "#1a1710",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  titleOverlay: {
    position: "absolute",
    overflow: "hidden",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  titleGradient: {
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 10,
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
    backgroundColor: "rgba(201, 147, 58, 0.5)",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
});
