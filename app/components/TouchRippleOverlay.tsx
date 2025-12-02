import React, { useRef, useState } from "react";
import { View, Animated, StyleSheet, PanResponder } from "react-native";

export default function TouchRippleOverlay({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ripples, setRipples] = useState<
    {
      id: number;
      x: number;
      y: number;
      scale: Animated.Value;
      opacity: Animated.Value;
    }[]
  >([]);

  //
  // Creates a new expanding/fading ripple
  //
  const createRipple = (x: number, y: number) => {
    const id = Date.now() + Math.random();
    const scale = new Animated.Value(0);
    const opacity = new Animated.Value(0.6);

    setRipples((prev) => [...prev, { id, x, y, scale, opacity }]);

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Remove ripple after animation finishes
      setRipples((prev) => prev.filter((r) => r.id !== id));
    });
  };

  //
  // PanResponder collects touch positions but still lets
  // underlying UI receive the event (because we don't become the responder)
  //
  const panResponder = useRef(
    PanResponder.create({
      // Don't become the responder - this allows touches to pass through
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => false,

      // Capture touches during the capture phase to observe them
      onStartShouldSetPanResponderCapture: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        createRipple(pageX, pageY);
        return false; // Don't block the event
      },

      // Capture move/drag events to create ripples while dragging
      onMoveShouldSetPanResponderCapture: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        createRipple(pageX, pageY);
        return false; // Don't block the event
      },
    }),
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {/* Your actual app UI */}
      {children}

      {/* The ripple overlay: draws circles but IGNORES touches */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ripples.map((ripple) => (
          <Animated.View
            key={ripple.id}
            style={[
              styles.ripple,
              {
                left: ripple.x - RADIUS,
                top: ripple.y - RADIUS,
                transform: [{ scale: ripple.scale }],
                opacity: ripple.opacity,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const RADIUS = 50;
const SIZE = RADIUS * 2;

const styles = StyleSheet.create({
  ripple: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: RADIUS,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});
