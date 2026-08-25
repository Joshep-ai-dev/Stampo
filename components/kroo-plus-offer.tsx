import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type KrooPlusPlan = "monthly" | "annual";

const colors = {
  deep: "#031D14",
  panel: "#062B20",
  cream: "#F6F1E4",
  copper: "#D7925F",
  mint: "#3ECF8E",
  dim: "#315749",
  line: "rgba(62,207,142,.28)",
};
const features = [
  ["Country & landmark stamps", "check", "check"],
  ["Photo verifications / month", "5", "infinite"],
  ["Special Lists access", "3", "All"],
  ["Ads", "close", "check"],
  ["Daily Destination streak freeze", "dash", "check"],
  ["Advanced score breakdown", "dash", "check"],
  ["Custom passport cover designs", "dash", "check"],
  ["Early access to new countries", "dash", "check"],
] as const;

export function KrooPlusOffer({
  monthlyPrice = "$5.99",
  annualPrice = "$59.99",
  busy = false,
  onPurchase,
  onRestore,
  onPlanChange,
}: {
  monthlyPrice?: string;
  annualPrice?: string;
  busy?: boolean;
  onPurchase: (plan: KrooPlusPlan) => void;
  onRestore?: () => void;
  onPlanChange?: (plan: KrooPlusPlan) => void;
}) {
  const [plan, setPlan] = useState<KrooPlusPlan>("annual");
  const choose = (next: KrooPlusPlan) => {
    setPlan(next);
    onPlanChange?.(next);
  };
  return (
    <View style={s.root}>
      <View style={s.table}>
        <View style={[s.row, s.header]}>
          <Text style={[s.feature, s.headerText]}>FEATURE</Text>
          <Text style={s.headerText}>FREE</Text>
          <Text style={[s.headerText, s.copper]}>KROO+</Text>
        </View>
        {features.map(([name, free, plus]) => (
          <View style={s.row} key={name}>
            <Text style={s.feature}>{name}</Text>
            <Value value={free} />
            <Value value={plus} plus />
          </View>
        ))}
      </View>
      <View style={s.plans}>
        <TouchableOpacity
          style={[s.plan, plan === "monthly" && s.selected]}
          onPress={() => choose("monthly")}
        >
          <Text style={s.planLabel}>MONTHLY</Text>
          <Price value={monthlyPrice} suffix="/mo" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.plan, plan === "annual" && s.selected]}
          onPress={() => choose("annual")}
        >
          <View style={s.badge}>
            <Text style={s.badgeText}>SAVE 17%</Text>
          </View>
          <Text style={s.planLabel}>ANNUAL</Text>
          <Price value={annualPrice} suffix="/yr" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[s.cta, busy && s.disabled]}
        disabled={busy}
        onPress={() => onPurchase(plan)}
      >
        <Text style={s.ctaText}>
          {busy ? "CONNECTING TO GOOGLE PLAY..." : "START 7-DAY FREE TRIAL"}
        </Text>
      </TouchableOpacity>
      <Text style={s.terms}>
        Then{" "}
        {plan === "annual" ? `${annualPrice}/year` : `${monthlyPrice}/month`}.
        Cancel anytime before trial ends.
      </Text>
      {onRestore && (
        <TouchableOpacity disabled={busy} onPress={onRestore}>
          <Text style={s.restore}>Restore purchase</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Value({ value, plus }: { value: string; plus?: boolean }) {
  if (value === "check" || value === "close")
    return (
      <View style={s.value}>
        <Ionicons
          name={value === "check" ? "checkmark" : "close"}
          size={21}
          color={value === "check" ? colors.mint : colors.dim}
        />
      </View>
    );
  if (value === "infinite") value = "∞";
  if (value === "dash") value = "—";
  return <Text style={[s.valueText, plus && s.copper]}>{value}</Text>;
}
function Price({ value, suffix }: { value: string; suffix: string }) {
  return (
    <Text style={s.price}>
      {value}
      <Text style={s.suffix}>{suffix}</Text>
    </Text>
  );
}

const s = StyleSheet.create({
  root: { width: "100%" },
  table: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 7,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  header: { minHeight: 48 },
  feature: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 8,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    lineHeight: 18,
    color: colors.cream,
  },
  headerText: {
    width: 64,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(11),
    color: colors.copper,
    textAlign: "center",
  },
  value: { width: 64, alignItems: "center" },
  valueText: {
    width: 64,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
    color: colors.copper,
    textAlign: "center",
  },
  copper: { color: colors.copper },
  plans: { marginTop: 24, flexDirection: "row", gap: 11 },
  plan: {
    flex: 1,
    height: 112,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panel,
  },
  selected: { borderWidth: 2, borderColor: colors.copper },
  badge: {
    position: "absolute",
    top: -14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: colors.copper,
  },
  badgeText: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(10), color: colors.deep },
  planLabel: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(11), color: colors.cream },
  price: {
    marginTop: 12,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(27),
    color: colors.cream,
  },
  suffix: { fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(13) },
  cta: {
    minHeight: 58,
    marginTop: 20,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.copper,
  },
  disabled: { opacity: 0.6 },
  ctaText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(15),
    letterSpacing: 1,
    color: colors.deep,
  },
  terms: {
    marginTop: 11,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: colors.copper,
  },
  restore: {
    marginTop: 16,
    textAlign: "center",
    textDecorationLine: "underline",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    color: colors.copper,
  },
});
