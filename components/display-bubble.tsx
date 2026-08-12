import { StyleSheet, Text, View } from "react-native";

import { BrandColors } from "@/constants/theme";

export function DisplayBubble({
  label,
  accent = false,
}: {
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.bubble, accent && styles.accentBubble]}>
      <Text style={[styles.text, accent && styles.accentText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    justifyContent: "center",
    backgroundColor: "rgba(10,43,32,.25)",
  },
  accentBubble: {
    borderColor: BrandColors.copper,
    backgroundColor: "rgba(215,146,95,.13)",
  },
  text: {
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  accentText: { color: BrandColors.copper, fontFamily: "Lora_700Bold" },
});
