import { Image } from "expo-image";
import { StyleSheet } from "react-native";

export function StampCardBackground() {
  return (
    <Image
      pointerEvents="none"
      source={require("@/assets/images/other/stamp_border.webp")}
      style={StyleSheet.absoluteFillObject}
      contentFit="fill"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
