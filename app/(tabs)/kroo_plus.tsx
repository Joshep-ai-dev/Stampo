import { Text } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { Ionicons } from "@expo/vector-icons";
import { Image, ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { CityVisitSearch } from "@/components/city-visit-search";
import {
  revenueCatErrorMessage,
  useKrooPlusBilling,
} from "@/components/subscription-provider";
import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import { calculateKrooScoreFromVisits } from "@/data/kroo-score";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const HERO = require("@/assets/images/other/top image.webp");
const MEMBER_GIFT_BACKGROUND = require("@/assets/images/other/kroo member background.webp");
const MEMBER_GIFT_CARD = require("@/assets/images/other/kroo card.webp");

const destinations = [
  {
    name: "Bora Bora",
    place: "French Polynesia",
    description:
      "Escape to an overwater paradise of turquoise lagoons, private villas, and breathtaking island beauty.",
    image: require("@/assets/images/vacation/Bora Bora.webp"),
  },
  {
    name: "Amalfi Coast",
    place: "Italy",
    description:
      "Live the Italian dream with cliffside luxury, Mediterranean cuisine, private boat trips, and spectacular sunsets.",
    image: require("@/assets/images/vacation/Amalfi Coast.webp"),
  },
  {
    name: "Kyoto",
    place: "Japan",
    description:
      "Discover timeless Japan through ancient temples, bamboo forests, traditional ryokans, and unforgettable cuisine.",
    image: require("@/assets/images/vacation/Kyoto.webp"),
  },
  {
    name: "Santorini",
    place: "Greece",
    description:
      "Indulge in a cliffside escape of whitewashed villages, brilliant blue seas, and legendary Aegean sunsets.",
    image: require("@/assets/images/vacation/Santorini.webp"),
  },
  {
    name: "Serengeti",
    place: "Tanzania",
    description:
      "Embark on the ultimate luxury safari amid endless savannahs and some of Africa's most spectacular wildlife.",
    image: require("@/assets/images/vacation/Serengeti.webp"),
  },
  {
    name: "$1,000 Dream Vacation Cash",
    place: "Your dream, your choice",
    description:
      "Here's $1,000 to turn your dream destination into your next adventure.",
    image: require("@/assets/images/vacation/Cash.webp"),
  },
] as const;
type Destination = (typeof destinations)[number];

function HeroShadowText({
  children,
  style,
}: {
  children: string;
  style: TextStyle;
}) {
  return <Text style={style}>{children}</Text>;
}

export default function KrooPlusScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const billing = useKrooPlusBilling();
  const { countryCode, countryName } = useLocalSearchParams<{
    countryCode?: string;
    countryName?: string;
  }>();
  const travel = useAppSelector((state) => state.travel);
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const dashboard = useAppSelector((state) => state.dashboard.data);
  const isPlus = true; //useAppSelector((state) => state.subscription.isKrooPlus);
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Destination | null>(null);
  const localKrooScore = useMemo(
    () =>
      calculateKrooScoreFromVisits(
        travel.visits,
        travel.completedSightIds,
        travel.challengePoints,
      ),
    [travel],
  );
  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) void dispatch(fetchHomeDashboard());
    }, [dispatch, isSignedIn]),
  );
  const challenge = dashboard?.challengeProgress;
  const krooScore = challenge?.krooScore ?? localKrooScore;
  const krooIq = challenge?.krooIqScore ?? 0;
  const referrals = challenge?.referralCount ?? 0;
  const deadlineLabel = challenge?.deadlineAt
    ? new Date(challenge.deadlineAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

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

  const purchase = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await billing.purchase(plan);
    } catch (error) {
      Alert.alert("Kroo+", revenueCatErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <ImageBackground
          source={HERO}
          style={[s.hero, { minHeight: Math.max(350, width * 0.79) }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
        >
          <Svg style={s.heroTextShadow} pointerEvents="none">
            <Defs>
              <RadialGradient id="heroTextShade">
                <Stop offset="0" stopColor="#000" stopOpacity="0.78" />
                <Stop offset="0.48" stopColor="#000" stopOpacity="0.58" />
                <Stop offset="1" stopColor="#000" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
              fill="url(#heroTextShade)"
            />
          </Svg>
          <View style={s.heroMark} accessible={false}>
            <Image
              source={require("@/assets/images/kroo-logo.png")}
              style={s.heroMarkImage}
              contentFit="contain"
            />
          </View>
          <HeroShadowText style={s.heroTitle}>
            {isPlus ? "Your Kroo+ Challenge" : "Join Kroo+"}
          </HeroShadowText>
          <HeroShadowText style={s.heroPrize}>Win $1,000</HeroShadowText>
          <HeroShadowText style={s.heroVacation}>
            for Your Dream Vacation
          </HeroShadowText>
          <HeroShadowText style={s.heroSubtitle}>
            Complete these 3 steps to win.
          </HeroShadowText>
        </ImageBackground>

        <View style={s.steps}>
          {[
            {
              n: "1",
              icon: "stats-chart",
              title: "Reach a Kroo Score of 5.0+",
              copy: "Explore the world\nand build your score.",
              action: () => router.navigate("/(tabs)/passport" as never),
            },
            {
              n: "2",
              icon: "bulb",
              title: "Achieve a Kroo IQ Score of 85+",
              copy: "Show off your\ntravel knowledge.",
              action: () => router.navigate("/(tabs)/community" as never),
            },
            {
              n: "3",
              icon: "people",
              title: "Refer 5 people to join Kroo",
              copy: "Share the adventure\nwith family and friends.",
              action: () => {},
            },
          ].map((step) => (
            <TouchableOpacity key={step.n} style={s.step} onPress={step.action}>
              <View style={s.stepArc}>
                <View style={s.number}>
                  <Text style={s.numberText}>{step.n}</Text>
                </View>
                {step.n === "3" ? (
                  <View
                    style={s.referralIcons}
                    accessibilityLabel="Refer five people"
                  >
                    {[0, 1, 2, 3, 4].map((person, i) => (
                      <Ionicons
                        key={person}
                        name="person"
                        size={24 - Math.abs(2 - i) * 2}
                        style={{ marginLeft: -12 }}
                        color={BrandColors.copper}
                      />
                    ))}
                  </View>
                ) : (
                  <Ionicons
                    name={step.icon as never}
                    size={28}
                    color={BrandColors.copper}
                  />
                )}
                <Text style={s.stepTitle}>{step.title}</Text>
              </View>
              <Text style={s.stepCopy}>{step.copy}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.progressPanel}>
          <Text style={s.progressHeading}>Your Progress</Text>
          <View style={s.progressItems}>
            <Progress
              label="Kroo Score"
              value={`${krooScore.toFixed(1)} / 5.0`}
              amount={krooScore / 5}
            />
            <View style={s.vr} />
            <Progress
              label="Kroo IQ"
              value={`${krooIq} / 85`}
              amount={krooIq / 85}
            />
            <View style={s.vr} />
            <Progress
              label="Referrals"
              value={`${referrals} / 5`}
              amount={referrals / 5}
              dots
            />
          </View>
          {!isPlus && (
            <Text style={s.challengeDeadline}>
              Complete requirements within 12 months of joining Kroo+.
            </Text>
          )}
          {deadlineLabel && isPlus && (
            <Text style={s.challengeDeadline}>
              Your deadline: {deadlineLabel}.
            </Text>
          )}
        </View>

        <View style={s.vacations}>
          <View style={s.sectionRow}>
            <Text style={s.lightHeading}>What&apos;s Your Dream Vacation</Text>
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
                  source={item.image}
                  style={s.destinationImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={120}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0, 20, 14, 0.6)"]}
                  locations={[0, 0.72]}
                  style={s.destinationText}
                >
                  <Text style={s.destinationName}>{item.name}</Text>
                  <Text style={s.destinationPlace}>{item.place}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {!isPlus && (
          <>
            <Text style={s.darkHeading}>Everything You Get With Kroo+</Text>
            <View style={s.benefits}>
              {[
                [
                  "trophy",
                  "Dream Vacation Challenge",
                  "Win a free vacation of a lifetime.",
                ],
                [
                  "bulb",
                  "Access to\nKroo IQ",
                  "Learn and test your travel knowledge.",
                ],
                [
                  "business",
                  "Full access to Top Sights",
                  "Explore and discover more amazing places.",
                ],
                [
                  "star",
                  "Exclusive challenges and events",
                  "Unique member experiences.",
                ],
              ].map(([icon, title, copy]) => (
                <View key={title} style={s.benefit}>
                  <View style={s.benefitInner}>
                    <Ionicons
                      name={icon as never}
                      size={30}
                      color={BrandColors.copper}
                    />
                    <Text style={s.benefitTitle}>{title}</Text>
                    <Text style={s.benefitCopy}>{copy}</Text>
                  </View>
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
            <PrimaryButton
              style={s.cta}
              disabled={busy}
              onPress={() => void purchase()}
              label={busy ? "Please Wait…" : "Get Kroo+"}
            />
            <Text style={s.terms}>Billed immediately. Cancel anytime.</Text>
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
              <Text
                style={s.underline}
                onPress={() => router.push("/legal/terms" as never)}
              >
                Terms & Conditions
              </Text>{" "}
              and{" "}
              <Text
                style={s.underline}
                onPress={() => router.push("/legal/privacy" as never)}
              >
                Privacy Policy
              </Text>
              . Dream Vacation Challenge{" "}
              <Text
                style={s.underline}
                onPress={() => router.push("/legal/vacation" as never)}
              >
                Official Rules
              </Text>{" "}
              apply.
            </Text>
          </>
        )}
        {isPlus && (
          <View style={s.memberGift}>
            <ImageBackground
              source={MEMBER_GIFT_BACKGROUND}
              style={s.memberGiftHero}
              contentFit="cover"
              cachePolicy="memory-disk"
            >
              <LinearGradient
                colors={[
                  "rgba(0, 27, 21, 0.82)",
                  "rgba(0, 27, 21, 0.32)",
                  "transparent",
                ]}
                locations={[0, 0.62, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={s.memberGiftHeroShade}
              >
                <Text style={s.memberGiftTitle}>
                  Give the Gift of{"\n"}Kroo+
                </Text>
                <Text style={s.memberGiftSubtitle}>
                  More travel. More learning.{"\n"}More possibilities.
                </Text>
              </LinearGradient>
            </ImageBackground>
            <View style={s.memberGiftCardPanel}>
              <Image
                source={MEMBER_GIFT_CARD}
                style={s.memberGiftCardImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                accessibilityLabel="Kroo+ membership gift card"
              />
              <View style={s.memberGiftCardCopy}>
                <Text style={s.memberGiftCardTitle}>
                  The Perfect Gift for Any Traveler
                </Text>
                <Text style={s.memberGiftCardDescription}>
                  Give your friends and family the gift of Kroo+. It’s the
                  ultimate way to inspire adventure, build knowledge, and
                  explore the world together.
                </Text>
              </View>
            </View>
            <View style={s.memberGiftBenefits}>
              {[
                [
                  "globe-outline",
                  "Track Your Travels",
                  "Collect stamps, earn points, and level up.",
                ],
                [
                  "bulb-outline",
                  "Kroo IQ",
                  "Access daily lessons and boost your knowledge.",
                ],
                [
                  "trophy-outline",
                  "Exclusive Challenges",
                  "Join special events and competitions.",
                ],
                [
                  "star-outline",
                  "Member Benefits",
                  "Unlock unique experiences and rewards worldwide.",
                ],
              ].map(([icon, title, copy], index) => (
                <View
                  key={title}
                  style={[
                    s.memberGiftBenefit,
                    index === 3 && s.memberGiftBenefitLast,
                  ]}
                >
                  <Ionicons
                    name={icon as never}
                    size={33}
                    color={BrandColors.copper}
                  />
                  <Text style={s.memberGiftBenefitTitle}>{title}</Text>
                  <Text style={s.memberGiftBenefitCopy}>{copy}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton
              label="Gift Kroo+"
              onPress={() =>
                router.push("/gift-kroo-plus?plan=annual" as never)
              }
              style={s.memberGiftButton}
            />
            <Text style={s.memberGiftNote}>
              A Kroo+ membership makes the perfect gift —{"\n"}and lasts for a
              full year.
            </Text>
          </View>
        )}
      </ScrollView>
      <Modal
        transparent
        animationType="slide"
        visible={Boolean(selected)}
        onRequestClose={() => setSelected(null)}
        statusBarTranslucent
        navigationBarTranslucent
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
                  <Ionicons name="close" size={22} color={BrandColors.onDark} />
                </TouchableOpacity>
                <Image
                  source={selected.image}
                  style={s.sheetImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="high"
                  transition={120}
                />
                <Text style={s.sheetTitle}>{selected.name}</Text>
                <Text style={s.sheetPlace}>{selected.place}</Text>
                <Text style={s.sheetDescription}>{selected.description}</Text>
                {/* <TouchableOpacity
                  style={s.cta}
                  onPress={() => setSelected(null)}
                >
                  <Text style={s.ctaText}>SELECT THIS DESTINATION</Text>
                </TouchableOpacity> */}
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
  memberGift: {
    marginTop: 20,
    backgroundColor: BrandColors.green,
  },
  memberGiftHero: { width: "100%", height: 120 },
  memberGiftHeroShade: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 23,
  },
  memberGiftTitle: {
    color: BrandColors.white,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(30),
    lineHeight: responsiveFontSize(34),
  },
  memberGiftSubtitle: {
    marginTop: 10,
    color: BrandColors.white,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveFontSize(21),
  },
  memberGiftCardPanel: {
    marginHorizontal: 12,
    marginTop: 14,
    paddingHorizontal: 4,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BrandColors.copper,
    borderRadius: 16,
  },
  memberGiftCardImage: { width: "40%", aspectRatio: 1.44 },
  memberGiftCardCopy: { flex: 1, paddingHorizontal: 4 },
  memberGiftCardTitle: {
    color: BrandColors.white,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(22),
    lineHeight: responsiveFontSize(26),
  },
  memberGiftCardDescription: {
    marginTop: 7,
    color: BrandColors.white,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(17),
  },
  memberGiftBenefits: {
    marginTop: 16,
    paddingHorizontal: 10,
    flexDirection: "row",
  },
  memberGiftBenefit: {
    flex: 1,
    minWidth: 0,
    minHeight: 130,
    paddingHorizontal: 2,
    alignItems: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: BrandColors.paleGreen,
  },
  memberGiftBenefitLast: { borderRightWidth: 0 },
  memberGiftBenefitTitle: {
    marginTop: 6,
    minHeight: 34,
    color: BrandColors.white,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveFontSize(18),
    textAlign: "center",
  },
  memberGiftBenefitCopy: {
    marginTop: 4,
    color: BrandColors.white,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveFontSize(14),
    textAlign: "center",
  },
  memberGiftButton: {
    marginTop: 13,
    marginHorizontal: 48,
  },
  memberGiftNote: {
    marginTop: 10,
    color: BrandColors.white,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(17),
    textAlign: "center",
  },
  hero: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 22,
  },
  heroMark: {
    alignSelf: "center",
    width: 56,
    height: 31,
    overflow: "hidden",
  },
  heroMarkImage: {
    position: "absolute",
    width: 179,
    height: 67,
    left: -11,
    top: -18,
  },
  heroTextShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  heroPrize: {
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(40),
    lineHeight: responsiveFontSize(40),
    color: BrandColors.copperDark,
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 42,
  },
  heroVacation: {
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(26),
    lineHeight: responsiveFontSize(26),
    color: BrandColors.copper,
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 42,
  },
  challengeDeadline: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(18),
    color: BrandColors.onDarkMuted,
  },
  heroTitle: {
    marginTop: 2,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(22),
    lineHeight: responsiveFontSize(22),
    color: BrandColors.white,
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 42,
  },
  heroSubtitle: {
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveFontSize(24),
    color: BrandColors.white,
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 42,
  },
  steps: {
    marginTop: -32,
    paddingHorizontal: 2,
    paddingTop: 20,
    flexDirection: "row",
    gap: 2,
    paddingBottom: 16,
  },
  step: { flex: 1, alignItems: "center", paddingHorizontal: 2 },
  stepArc: {
    width: "100%",
    maxWidth: 145,
    minWidth: 115,
    height: 120,
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
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveFontSize(17),
    color: BrandColors.onDark,
  },
  stepCopy: {
    width: "100%",
    marginTop: -20,
    paddingHorizontal: 3,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveFontSize(16),
    letterSpacing: -0.2,
    color: BrandColors.onDarkMuted,
  },
  referralIcons: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingLeft: 6,
  },
  progressPanel: {
    margin: 12,
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
  progressItems: { marginTop: 7, gap: 6, flexDirection: "row" },
  progressItem: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 5,
  },
  vr: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: BrandColors.paleGreen,
  },
  progressLabel: {
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(15),
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
    fontSize: responsiveFontSize(13),
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
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 6,
  },
  lightHeading: {
    flexShrink: 1,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(16),
    color: BrandColors.ink,
  },
  destinationRow: { paddingHorizontal: 14, paddingTop: 9, gap: 9 },
  destinationCard: {
    width: 160,
    height: 120,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: BrandColors.green,
  },
  destinationImage: { ...StyleSheet.absoluteFillObject },

  destinationText: {
    position: "absolute",
    right: 0,
    bottom: -1,
    left: 0,
    paddingTop: 24,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  destinationName: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.white,
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 16,
  },
  destinationPlace: {
    marginTop: 4,
    fontFamily: "Roboto_400Arial",
    fontSize: responsiveFontSize(9),
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: BrandColors.white,
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 16,
  },
  darkHeading: {
    marginTop: 16,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
    color: BrandColors.onDark,
  },
  benefits: { padding: 10, flexDirection: "row" },
  benefit: {
    flex: 1,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  benefitInner: {
    flex: 1,
    paddingVertical: 8,
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
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveFontSize(18),
    color: BrandColors.onDark,
  },
  benefitCopy: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveFontSize(16),
    color: BrandColors.onDarkMuted,
  },
  plans: {
    marginBottom: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 8,
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
    fontSize: responsiveFontSize(11),
    color: BrandColors.green,
  },
  planLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.onDark,
  },
  planPrice: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
    color: BrandColors.onDark,
  },
  planSuffix: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
  },
  cta: {
    minHeight: 48,
    marginHorizontal: 12,
  },
  terms: {
    margin: 10,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
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
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDark,
  },
  legal: {
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(18),
    color: BrandColors.onDarkMuted,
    paddingHorizontal: 8,
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
  sheetDescription: {
    marginTop: 12,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: responsiveFontSize(22),
    color: BrandColors.onDark,
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
    width: 132,
    height: 54,
    flex: 1,
    alignItems: "center",
  },
});
