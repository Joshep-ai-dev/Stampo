import { Text } from "@/components/app-text";
import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import {
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, style, disabled && styles.disabled]}
    >
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.55 },
  label: {
    color: BrandColors.white,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
