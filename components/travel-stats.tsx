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
              size={24}
              color={BrandColors.copper}
            />
            <View style={styles.numberRow}>
              <Text style={styles.value}>{item.value}</Text>
              {item.total ? (
                <Text style={styles.total}>/{item.total}</Text>
              ) : null}
            </View>
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
            {item.onInfo ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`About ${item.label.toLowerCase()}`}
                hitSlop={8}
                style={styles.infoButton}
                onPress={item.onInfo}
              >
                <Text style={styles.infoText}>i</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 94,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(179,141,118,.58)",
    backgroundColor: "rgba(8,42,32,.34)",
    flexDirection: "row",
    alignItems: "center",
  },
  stat: { flex: 1, minWidth: 0, alignItems: "center" },
  border: {
    borderRightWidth: 1,
    borderRightColor: "rgba(246,241,228,.2)",
  },
  top: { flexDirection: "row", alignItems: "center", gap: 6 },
  numberRow: { flexDirection: "row", alignItems: "baseline" },
  value: {
    fontFamily: "Lora_400Regular",
    fontSize: 23,
    color: BrandColors.onDark,
  },
  total: {
    marginLeft: 2,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
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
    fontFamily: "monospace",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.45,
    color: BrandColors.onDark,
  },
  infoButton: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    marginTop: -1,
    fontFamily: "Lora_700Bold",
    fontSize: 8,
    color: BrandColors.copper,
  },
});
