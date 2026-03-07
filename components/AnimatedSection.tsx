import React from "react";
import Animated, { FadeInDown } from "react-native-reanimated";

interface AnimatedSectionProps {
  children: React.ReactNode;
  index: number;
  delayMultiplier?: number;
}

export default function AnimatedSection({ children, index, delayMultiplier = 80 }: AnimatedSectionProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * delayMultiplier).duration(500).springify()}>
      {children}
    </Animated.View>
  );
}
