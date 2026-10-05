import { Image, type ImageProps } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { BrandColors } from "@/constants/theme";

type Props = Pick<ImageProps, "contentFit" | "blurRadius" | "priority"> & {
  uri?: string;
  fallbackUri?: string;
  style: StyleProp<ViewStyle>;
};

export function ProgressivePlaceImage({
  uri,
  fallbackUri,
  style,
  contentFit = "cover",
  blurRadius,
  priority = "normal",
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0.45)).current;
  const imageUri = uri && failedUri === uri ? fallbackUri : uri;

  useEffect(() => {
    setLoaded(false);
    setFailedUri(null);
  }, [uri, fallbackUri]);

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
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          recyclingKey={imageUri}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          blurRadius={blurRadius}
          cachePolicy="memory-disk"
          priority={priority}
          transition={120}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            if (imageUri === uri && fallbackUri && fallbackUri !== uri) {
              setFailedUri(uri);
            }
          }}
        />
      ) : null}
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
