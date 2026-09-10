import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { BrandColors } from "@/constants/theme";

export function StampHeroFrame({ children }: { children: ReactNode }) {
  return <View style={styles.frame}>{children}</View>;
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 1.5,
    overflow: "hidden",
    borderWidth: 4.5,
    borderRadius: 12,
    borderStyle: "dotted",
    borderColor: BrandColors.surface,
  },
});
