import { Ionicons } from "@expo/vector-icons";
import { Image, ImageBackground } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityVisitSearch } from "@/components/city-visit-search";
import { useKrooPlusBilling } from "@/components/subscription-provider";
import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import { calculateKrooScoreFromVisits } from "@/data/kroo-score";
import { useAppSelector } from "@/store/hooks";

const HERO = require("@/assets/images/other/top image.webp");
const destinations = [
  {
    name: "Bali Bliss Escape",
    place: "Bali, Indonesia",
    value: "$3,800 value",
    icon: "leaf-outline",
  },
  {
    name: "Santorini Escape",
    place: "Santorini, Greece",
    value: "$5,200 value",
    icon: "boat-outline",
  },
  {
    name: "Japan Discovery",
    place: "Japan",
    value: "$6,500 value",
    icon: "flower-outline",
  },
  {
    name: "Maldives Retreat",
    place: "Maldives",
    value: "$7,000 value",
    icon: "sunny-outline",
  },
] as const;
type Destination = (typeof destinations)[number];

export default function PlusScreen() {
  const router = useRouter();
  const billing = useKrooPlusBilling();
  const { countryCode, countryName } = useLocalSearchParams<{
    countryCode?: string;
    countryName?: string;
  }>();
  const travel = useAppSelector((state) => state.travel);
  const isPlus = useAppSelector((state) => state.subscription.isKrooPlus);
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Destination | null>(null);
  const krooScore = useMemo(
    () =>
      calculateKrooScoreFromVisits(
        travel.visits,
        travel.completedSightIds,
        travel.challengePoints,
      ),
    [travel],
  );
  const krooIq = 76;
  const referrals = 3;

  if (countryCode)
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.visitHead}>
          <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
          <View>
            <Text style={s.visitTitle}>Add a Visit</Text>
            <Text style={s.muted}>
              Choose a city in {countryName ?? countryCode}
            </Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={s.visitContent}>
          <CityVisitSearch
            countryCode={countryCode}
            countryName={countryName ?? countryCode}
          />
        </ScrollView>
      </SafeAreaView>
    );

  const purchase = () => {
    setBusy(true);
    void billing
      .purchase(plan)
      .catch((error) =>
        Alert.alert(
          "Kroo+",
          error instanceof Error ? error.message : "Please try again.",
        ),
      )
      .finally(() => setBusy(false));
  };
  const restore = () => {
    setBusy(true);
    void billing
      .restore()
      .then((active) =>
        Alert.alert(
          active ? "Kroo+ restored" : "No purchase found",
          active
            ? "Your membership is active again."
            : "No active Kroo+ purchase was found.",
        ),
      )
      .catch((error) =>
        Alert.alert(
          "Kroo+",
          error instanceof Error ? error.message : "Please try again.",
        ),
      )
      .finally(() => setBusy(false));
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <ImageBackground source={HERO} style={s.hero} contentFit="cover">
          <View style={s.heroShade} />
          <View style={s.brandRow}>
            <Image
              source={require("../../assets/images/kroo_logo_text.png")}
              style={s.wordmark}
              contentFit="contain"
              accessibilityLabel="Kroo"
            />
          </View>
          {!isPlus && (
            <View style={s.heroTitleSection}>
              <Text style={s.heroTitle}>Join Kroo+</Text>
              <Text style={[s.heroTitle, { color: BrandColors.onDarkMuted }]}>
                Win Your Dream Vacation.
              </Text>
              <Text style={s.heroSubtitle}>
                Complete the 3 steps below and your next vacation is on us.
              </Text>
            </View>
          )}
          {isPlus && (
            <>
              <Text style={s.heroTitle}>
                Your Dream Vacation{`\n`}Challenge
              </Text>
              <Text style={s.heroSubtitle}>
                Keep building your score to qualify for your chosen escape.
              </Text>
            </>
          )}
          <View style={s.location}>
            <Ionicons name="location" size={16} color="#fff" />
            <Text style={s.locationText}>Phi Phi Islands, Thailand</Text>
          </View>
        </ImageBackground>

        <View style={s.steps}>
          {[
            {
              n: "1",
              icon: "stats-chart",
              title: "Reach a Kroo Score of 5.0+",
              copy: "Explore the world and build your score.",
              action: () => router.navigate("/(tabs)/passport" as never),
            },
            {
              n: "2",
              icon: "bulb",
              title: "Achieve a Kroo IQ Score of 80+",
              copy: "Show off your travel knowledge.",
              action: () => router.navigate("/(tabs)/community" as never),
            },
            {
              n: "3",
              icon: "people",
              title: "Refer 5 others to join Kroo+",
              copy: "Share the adventure with family and friends.",
              action: () => router.push("/add-friends" as never),
            },
          ].map((step) => (
            <TouchableOpacity key={step.n} style={s.step} onPress={step.action}>
              <View style={s.stepArc}>
                <View style={s.number}>
                  <Text style={s.numberText}>{step.n}</Text>
                </View>
                <Ionicons
                  name={step.icon as never}
                  size={28}
                  color={BrandColors.copper}
                />
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepCopy}>{step.copy}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.progressPanel}>
          <Text style={s.progressHeading}>YOUR PROGRESS</Text>
          <View style={s.progressItems}>
            <Progress
              label="Kroo Score"
              value={`${krooScore.toFixed(1)} / 5.0`}
              amount={krooScore / 5}
            />
            <View style={s.vr} />
            <Progress
              label="Kroo IQ"
              value={`${krooIq} / 80`}
              amount={krooIq / 80}
            />
            <View style={s.vr} />
            <Progress
              label="Referrals"
              value={`${referrals} / 5`}
              amount={referrals / 5}
              dots
            />
          </View>
          <Text style={s.progressNote}>
            You&apos;re already 2 steps away from qualifying!
          </Text>
        </View>

        <View style={s.vacations}>
          <View style={s.sectionRow}>
            <Text style={s.lightHeading}>Choose Your Dream Vacation</Text>
            <Text style={s.viewAll}>View All Destinations →</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.destinationRow}
          >
            {destinations.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={s.destinationCard}
                onPress={() => setSelected(item)}
              >
                <Image
                  source={HERO}
                  style={s.destinationImage}
                  contentFit="cover"
                />
                <View style={s.destinationShade} />
                <View style={s.destinationText}>
                  <Text style={s.destinationName}>{item.name}</Text>
                  <Text style={s.destinationValue}>{item.value}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {!isPlus && (
          <>
            <Text style={s.darkHeading}>Everything You Get with Kroo+</Text>
            <View style={s.benefits}>
              {[
                [
                  "trophy",
                  "Participate in Dream Vacation Challenge",
                  "Qualify for your dream trip.",
                ],
                ["bulb", "Access to Kroo IQ", "Test your travel knowledge."],
                [
                  "business",
                  "Full access to all top Sights",
                  "Explore more. Discover more.",
                ],
                [
                  "star",
                  "Exclusive challenges and events",
                  "Unique member experiences.",
                ],
              ].map(([icon, title, copy]) => (
                <View key={title} style={s.benefit}>
                  <Ionicons
                    name={icon as never}
                    size={30}
                    color={BrandColors.copper}
                  />
                  <Text style={s.benefitTitle}>{title}</Text>
                  <Text style={s.benefitCopy}>{copy}</Text>
                </View>
              ))}
            </View>
            <View style={s.plans}>
              <Plan
                selected={plan === "monthly"}
                label="MONTHLY"
                price={billing.prices.monthly ?? "$9.99"}
                suffix="/mo"
                onPress={() => setPlan("monthly")}
              />
              <Plan
                selected={plan === "annual"}
                label="ANNUAL"
                price={billing.prices.annual ?? "$99.99"}
                suffix="/yr"
                badge="SAVE 17%"
                onPress={() => setPlan("annual")}
              />
            </View>
            <TouchableOpacity
              style={[s.cta, busy && s.disabled]}
              disabled={busy}
              onPress={purchase}
            >
              <Text style={s.ctaText}>
                {busy ? "PLEASE WAIT…" : "START 3-DAY FREE TRIAL"}
              </Text>
            </TouchableOpacity>
            <Text style={s.terms}>
              Then {billing.prices.annual ?? "$99.99"}/year. Cancel anytime
              before trial ends. No risk.
            </Text>
            {/* <TouchableOpacity onPress={restore}>
              <Text style={s.restore}>Restore purchases</Text>
            </TouchableOpacity> */}
            <View style={s.assurances}>
              {[
                ["shield-checkmark", "Cancel anytime"],
                ["lock-closed", "Secure payment"],
                ["card", "Apple Pay / Google Pay"],
                ["globe", "Available worldwide"],
              ].map(([icon, label]) => (
                <View key={label} style={s.assurance}>
                  <Ionicons
                    name={icon as never}
                    size={25}
                    color={BrandColors.copper}
                  />
                  <Text style={s.assuranceText}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.legal}>
              By continuing, you agree to our{" "}
              <Text style={s.underline}>Terms & Conditions</Text> and{" "}
              <Text style={s.underline}>Privacy Policy</Text>.
            </Text>
          </>
        )}
      </ScrollView>
      <Modal
        transparent
        animationType="slide"
        visible={Boolean(selected)}
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalRoot}>
          <Pressable style={s.backdrop} onPress={() => setSelected(null)} />
          <View style={s.sheet}>
            {selected && (
              <>
                <TouchableOpacity
                  style={s.close}
                  onPress={() => setSelected(null)}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={BrandColors.onDark}
                  />{" "}
                </TouchableOpacity>
                <Image source={HERO} style={s.sheetImage} contentFit="cover" />
                <Text style={s.sheetTitle}>{selected.name}</Text>
                <Text style={s.sheetPlace}>{selected.place}</Text>
                <Text style={s.sheetValue}>{selected.value}</Text>
                <TouchableOpacity
                  style={s.cta}
                  onPress={() => setSelected(null)}
                >
                  <Text style={s.ctaText}>SELECT THIS DESTINATION</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Progress({
  label,
  value,
  amount,
  dots,
}: {
  label: string;
  value: string;
  amount: number;
  dots?: boolean;
}) {
  return (
    <View style={s.progressItem}>
      <Text style={s.progressLabel}>{label}</Text>
      <Text style={s.progressValue}>{value}</Text>
      {dots ? (
        <View style={s.dots}>
          {[0, 1, 2, 3, 4].map((dot) => (
            <View
              key={dot}
              style={[s.dot, dot < Math.round(amount * 5) && s.dotFilled]}
            />
          ))}
        </View>
      ) : (
        <View style={s.track}>
          <View style={[s.fill, { width: `${Math.min(1, amount) * 100}%` }]} />
        </View>
      )}
    </View>
  );
}
function Plan({
  selected,
  label,
  price,
  suffix,
  badge,
  onPress,
}: {
  selected: boolean;
  label: string;
  price: string;
  suffix: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.plan, selected && s.planSelected]}
      onPress={onPress}
    >
      {badge && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={s.planLabel}>{label}</Text>
      <Text style={s.planPrice}>
        {price}
        <Text style={s.planSuffix}>{suffix}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.canvas },
  content: { paddingBottom: 26 },
  hero: { height: 260, justifyContent: "flex-end", padding: 22, gap: 0 },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,20,14,.22)",
  },
  brandRow: {
    position: "absolute",
    top: 15,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  heroTitleSection: {
    marginBottom: 48,
  },
  heroTitle: {
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(26),
    lineHeight: responsiveFontSize(26),
    color: BrandColors.white,
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  heroSubtitle: {
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.white,
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  location: {
    marginTop: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  locationText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    color: BrandColors.white,
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 10,
  },
  steps: {
    marginTop: -32,
    paddingHorizontal: 2,
    paddingTop: 20,
    flexDirection: "row",
    gap: 2,
  },
  step: { flex: 1, minHeight: 144, alignItems: "center", paddingHorizontal: 2 },
  stepArc: {
    width: "100%",
    maxWidth: 145,
    minHeight: 120,
    paddingTop: 24,
    paddingHorizontal: 7,
    alignItems: "center",
    borderWidth: 2,
    borderColor: BrandColors.copper,
    borderBottomColor: "transparent",
    borderRadius: 80,
  },
  number: {
    position: "absolute",
    top: -14,
    alignSelf: "center",
    width: 28,
    height: 28,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.copper,
  },
  numberText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(17),
    color: BrandColors.green,
  },
  stepTitle: {
    marginTop: 7,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveFontSize(17),
    color: BrandColors.onDark,
  },
  stepCopy: {
    position: "absolute",
    top: 100,
    maxWidth: 86,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(11),
    lineHeight: responsiveFontSize(14),
    color: BrandColors.onDarkMuted,
  },
  progressPanel: {
    margin: 14,
    marginTop: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: BrandColors.mapGreen,
    borderRadius: 12,
  },
  progressHeading: {
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    color: BrandColors.onDark,
  },
  progressItems: { marginTop: 7, flexDirection: "row" },
  progressItem: {
    flex: 1,
    paddingHorizontal: 12,
  },
  vr: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: BrandColors.paleGreen,
  },
  progressLabel: {
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDark,
  },
  progressValue: {
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(17),
    color: BrandColors.onDark,
  },
  track: {
    height: 7,
    marginTop: 8,
    borderRadius: 5,
    backgroundColor: BrandColors.paleGreen,
  },
  fill: { height: 7, borderRadius: 5, backgroundColor: "#35DA8A" },
  dots: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BrandColors.onDark,
  },
  dotFilled: { backgroundColor: "#35DA8A", borderColor: "#35DA8A" },
  progressNote: {
    marginTop: 9,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  vacations: {
    paddingTop: 10,
    paddingBottom: 13,
    backgroundColor: "#F7EFE1",
  },
  sectionRow: {
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lightHeading: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(16),
    color: BrandColors.ink,
  },
  viewAll: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(12),
    color: BrandColors.muted,
  },
  destinationRow: { paddingHorizontal: 14, paddingTop: 9, gap: 9 },
  destinationCard: {
    width: 150,
    height: 120,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: BrandColors.green,
  },
  destinationImage: { ...StyleSheet.absoluteFillObject },
  destinationShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,35,24,.24)",
  },
  destinationText: {
    marginTop: "auto",
    padding: 4,
    backgroundColor: "rgba(0,35,24,.67)",
  },
  destinationName: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
    color: "#fff",
  },
  destinationValue: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
    color: "#35DA8A",
  },
  darkHeading: {
    marginTop: 16,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
    color: BrandColors.onDark,
  },
  benefits: { padding: 12, flexDirection: "row", gap: 6 },
  benefit: {
    flex: 1,
    minHeight: 110,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    borderRadius: 8,
  },
  benefitTitle: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(11),
    lineHeight: responsiveFontSize(13),
    color: BrandColors.onDark,
  },
  benefitCopy: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(9),
    color: BrandColors.onDarkMuted,
  },
  plans: {
    marginVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 16,
  },
  plan: {
    flex: 1,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BrandColors.mapGreen,
    borderRadius: 8,
  },
  planSelected: { borderColor: BrandColors.copper, borderWidth: 2 },
  badge: {
    position: "absolute",
    top: -10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: BrandColors.copper,
  },
  badgeText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(10),
    color: BrandColors.green,
  },
  planLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDark,
  },
  planPrice: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
    color: BrandColors.onDark,
  },
  planSuffix: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(10),
  },
  cta: {
    minHeight: 48,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.copper,
  },
  ctaText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    color: BrandColors.green,
  },
  disabled: { opacity: 0.6 },
  terms: {
    margin: 10,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(11),
    color: BrandColors.onDarkMuted,
  },
  restore: {
    margin: 10,
    textAlign: "center",
    textDecorationLine: "underline",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(11),
    color: BrandColors.onDarkMuted,
  },
  assurances: {
    margin: 14,
    paddingTop: 13,
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.paleGreen,
  },
  assurance: { flex: 1, alignItems: "center", gap: 5 },
  assuranceText: {
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(11),
    color: BrandColors.onDark,
  },
  legal: {
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(11),
    color: BrandColors.onDarkMuted,
  },
  underline: { textDecorationLine: "underline" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.65)",
  },
  sheet: {
    padding: 22,
    paddingBottom: 34,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: BrandColors.greenDeep,
  },
  close: { alignSelf: "flex-end", padding: 6 },
  sheetImage: { width: "100%", height: 190, borderRadius: 14 },
  sheetTitle: {
    marginTop: 16,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(24),
    color: BrandColors.onDark,
  },
  sheetPlace: {
    marginTop: 3,
    fontFamily: "Lora_400Regular",
    color: BrandColors.onDarkMuted,
  },
  sheetValue: {
    marginTop: 8,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(18),
    color: "#35DA8A",
  },
  visitHead: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  visitTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(25),
    color: BrandColors.onDark,
  },
  muted: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    color: BrandColors.onDarkMuted,
  },
  visitContent: { paddingBottom: 40 },
  wordmark: {
    width: 200,
    height: 75,
    top: -25,
    left: 0,
  },
});
