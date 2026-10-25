import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Animated,
  Easing,
  AccessibilityInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * A background shape that plays one entrance transition on mount: it eases
 * from an offset (and faded out) to its resting position, then stays put.
 * Transform + opacity only, so it runs on the native driver. With the OS
 * "reduce motion" setting on it just appears in place.
 *
 * The resting opacity comes from `style`, so the shape keeps its look.
 */
export function EnterShape({
  style,
  delay = 0,
  duration = 1100,
  fromX = 0,
  fromY = 0,
  restRotate = 0,
  fromRotate = 0,
  fromScale = 1,
}: {
  style: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  /** starting offset, in px, relative to the resting position */
  fromX?: number;
  fromY?: number;
  /** resting rotation in degrees, and how many degrees off it starts */
  restRotate?: number;
  fromRotate?: number;
  /** starting scale (1 = no scale change) */
  fromScale?: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const restOpacity = StyleSheet.flatten(style)?.opacity ?? 1;

  useEffect(() => {
    let cancelled = false;
    let anim: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        t.setValue(1);
        return;
      }
      anim = Animated.timing(t, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      anim.start();
    });

    return () => {
      cancelled = true;
      anim?.stop();
    };
  }, [t, duration, delay]);

  const range = (from: number, to: number) =>
    t.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: range(0, Number(restOpacity)),
          transform: [
            { translateX: range(fromX, 0) },
            { translateY: range(fromY, 0) },
            {
              rotate: t.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  `${restRotate + fromRotate}deg`,
                  `${restRotate}deg`,
                ],
              }),
            },
            { scale: range(fromScale, 1) },
          ],
        },
      ]}
    />
  );
}
