import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { BrandColors } from "@/constants/theme";

export type TravelStatItem = {
  icon: string;
  value: number;
  total?: number;
  label: string;
};

export function TravelStats({ items }: { items: TravelStatItem[] }) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <View key={item.label} style={[styles.stat, index < items.length - 1 && styles.border]}>
          <View style={styles.top}>
            <Ionicons name={item.icon as never} size={24} color={BrandColors.copper} />
            <View style={styles.numberRow}>
              <Text style={styles.value}>{item.value}</Text>
              {item.total ? <Text style={styles.total}>/{item.total}</Text> : null}
            </View>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.label}>
            {item.label}
          </Text>
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
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,0.20)",
    flexDirection: "row",
    alignItems: "center",
  },
  stat: { flex: 1, minWidth: 0, alignItems: "center" },
  border: { borderRightWidth: 1, borderRightColor: BrandColors.paleGreen },
  top: { flexDirection: "row", alignItems: "center", gap: 6 },
  numberRow: { flexDirection: "row", alignItems: "baseline" },
  value: { fontFamily: "Lora_400Regular", fontSize: 23, color: BrandColors.onDark },
  total: { marginLeft: 2, fontFamily: "Lora_500Medium", fontSize: 12, color: BrandColors.onDarkMuted },
  label: { width: "100%", marginTop: 4, paddingHorizontal: 4, textAlign: "center", fontFamily: "Lora_600SemiBold", fontSize: 13, color: BrandColors.onDark },
});
