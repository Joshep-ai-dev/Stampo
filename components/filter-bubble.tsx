import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { BrandColors } from "@/constants/theme";

export function FilterBubble({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.bubble, selected && styles.selectedBubble]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>
        {label}
      </Text>
    </TouchableOpacity>
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
    backgroundColor: "transparent",
  },
  selectedBubble: {
    borderColor: BrandColors.copper,
    backgroundColor: "rgba(215,146,95,.13)",
  },
  text: {
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  selectedText: {
    color: BrandColors.copper,
    fontFamily: "Lora_700Bold",
  },
});
