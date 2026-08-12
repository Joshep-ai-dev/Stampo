import { Image, type ImageProps } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

import { BrandColors } from "@/constants/theme";

const DEFAULT_PLACE_IMAGE = require("@/assets/images/other/globe-airplane.png");
const IMAGE_TIMEOUT_MS = 8_000;

type Props = Pick<ImageProps, "contentFit" | "blurRadius"> & {
  uri?: string;
  style: StyleProp<ViewStyle>;
};

export function ProgressivePlaceImage({
  uri,
  style,
  contentFit = "cover",
  blurRadius,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(!uri);
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    setLoaded(false);
    setUseFallback(!uri);
    if (!uri) return;
    const timeout = setTimeout(() => setUseFallback(true), IMAGE_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [uri]);

  useEffect(() => {
    if (loaded) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [loaded, pulse]);

  return (
    <View style={[styles.frame, style]}>
      {!loaded ? (
        <Animated.View style={[styles.skeleton, { opacity: pulse }]} />
      ) : null}
      <Image
        source={useFallback ? DEFAULT_PLACE_IMAGE : { uri }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        blurRadius={blurRadius}
        cachePolicy="memory-disk"
        transition={220}
        onLoad={() => setLoaded(true)}
        onError={() => setUseFallback(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BrandColors.paleGreen,
  },
});
