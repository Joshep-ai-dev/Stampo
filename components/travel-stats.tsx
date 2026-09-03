import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BrandColors } from "@/constants/theme";

export type TravelStatItem = {
  icon: string;
  value: number;
  total?: number;
  label: string;
  onInfo?: () => void;
};

export function TravelStats({ items }: { items: TravelStatItem[] }) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[styles.stat, index < items.length - 1 && styles.border]}
        >
          <View style={styles.top}>
            <Ionicons
              name={item.icon as never}
              size={20}
              color={BrandColors.copper}
            />
            <View style={styles.numberRow}>
              <Text style={styles.value}>{item.value}</Text>
              {item.total ? (
                <Text style={styles.total}>/{item.total}</Text>
              ) : null}
            </View>
            {item.onInfo ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`About ${item.label.toLowerCase()}`}
                hitSlop={8}
                style={[styles.infoButton, { margin: 4 }]}
                onPress={item.onInfo}
              >
                <Text style={styles.infoText}>i</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.labelRow}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={styles.label}
            >
              {item.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,0.20)",
    flexDirection: "row",
    alignItems: "center",
  },
  stat: { flex: 1, minWidth: 0, alignItems: "center" },
  border: { borderRightWidth: 1, borderRightColor: BrandColors.paleGreen },
  top: { flexDirection: "row", alignItems: "center", gap: 6 },
  numberRow: { flexDirection: "row", alignItems: "baseline" },
  value: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(23),
    color: BrandColors.onDark,
  },
  total: {
    marginLeft: 2,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  labelRow: {
    width: "100%",
    marginTop: 4,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  label: {
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.onDark,
  },
  infoButton: {
    width: 11,
    height: 11,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -3,
    transform: [{ translateY: -2 }],
  },
  infoText: {
    marginTop: -1,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(8),
    color: BrandColors.copper,
  },
});
