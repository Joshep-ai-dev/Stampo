import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export function StampHeroFrame({ children }: { children: ReactNode }) {
  return (
    <View style={styles.frame}>
      {children}
      <Image
        source={require("@/assets/images/other/border.webp")}
        style={styles.borderImage}
        contentFit="fill"
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 1.5,
    overflow: "hidden",
  },
  borderImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
