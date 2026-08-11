import { BrandColors } from "@/constants/theme";
import { franceGuide } from "@/data/explore";
import { api } from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sightToggled, wishlistToggled } from "@/store/travel-slice";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CityScreen() {
  const { id = "paris" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const dispatch = useAppDispatch();
  const city =
    franceGuide.cities.find((x) => x.id === id) ?? franceGuide.cities[0];
  const done = useAppSelector((x) => x.travel.completedSightIds ?? []);
  const wished = useAppSelector((x) => x.travel.wishlistIds ?? []).includes(
    `city-${id}`,
  );
  const isSignedIn = useAppSelector((x) => x.profile.isSignedIn);
  const pct =
    Math.round(
      (done.filter((x) => city.sights.some((y) => y.id === x)).length /
        city.sights.length) *
        100,
    ) || 0;
  const toggleSight = (sightId: string, checked: boolean) => {
    dispatch(sightToggled(sightId));
    if (isSignedIn)
      void api
        .setSightCompleted(sightId, !checked)
        .then(() => dispatch(fetchHomeDashboard()))
        .catch(() => dispatch(sightToggled(sightId)));
  };
  const toggleWishlist = () => {
    const targetId = `city-${id}`;
    dispatch(wishlistToggled(targetId));
    if (isSignedIn)
      void api
        .setWishlist(targetId, !wished)
        .catch(() => dispatch(wishlistToggled(targetId)));
  };
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <View style={s.hero}>
          <View style={s.sky}>
            <Ionicons
              name="business-outline"
              size={110}
              color="rgba(245,229,205,.45)"
            />
          </View>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={25}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
          <Text style={s.title}>🇫🇷 {city.name}</Text>
          <Text style={s.subtitle}>{city.subtitle}</Text>
          <Text style={s.location}>⌖ France · Île-de-France</Text>
          <View style={s.heroButtons}>
            <TouchableOpacity
              style={s.add}
              onPress={() => router.push("/visits")}
            >
              <Text style={s.addText}>＋ Add Visit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.wish} onPress={toggleWishlist}>
              <Ionicons
                name={wished ? "heart" : "heart-outline"}
                size={17}
                color={BrandColors.onDark}
              />
              <Text style={s.wishText}>Wishlist</Text>
            </TouchableOpacity>
          </View>
          <View style={s.progress}>
            <Text style={s.progressLabel}>YOUR PROGRESS</Text>
            <Text style={s.progressValue}>
              {done.length} / {city.sights.length}
            </Text>
            <Text style={s.progressText}>Sights visited · {pct}%</Text>
            <View style={s.bar}>
              <View style={[s.fill, { width: `${pct}%` }]} />
            </View>
          </View>
        </View>
        <View style={s.passport}>
          <View style={s.miniStamp}>
            <Ionicons
              name="business-outline"
              size={38}
              color={BrandColors.copper}
            />
            <Text style={s.paris}>PARIS</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.passTitle}>YOUR PARIS PASSPORT</Text>
            <View style={s.passStats}>
              <Metric
                value={`${done.length}/${city.sights.length}`}
                label="Sights"
              />
              <Metric value="2/10" label="Neighborhoods" />
              <Metric value="3" label="Visits" />
            </View>
            <Text style={s.unlock}>
              Paris Explorer · Keep exploring to earn more points!
            </Text>
          </View>
          <View style={s.circleProgress}>
            <Text style={s.circleValue}>{pct}%</Text>
            <Text style={s.circleLabel}>COMPLETE</Text>
          </View>
        </View>
        <View style={s.tabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabs}
          >
            {["Overview", "Sights", "Experiences", "Neighborhoods", "Food"].map(
              (tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    s.tabButton,
                    activeTab === tab && s.tabButtonActive,
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[s.tab, activeTab === tab && s.tabActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>
        </View>
        <View style={s.glance}>
          <Text style={s.sectionTitle}>Paris at a Glance</Text>
          <View style={s.glanceRow}>
            <Info icon="people-outline" value="2.1M" label="Population" />
            <Info icon="chatbubble-outline" value="French" label="Language" />
            <Info icon="cash-outline" value="Euro" label="Currency" />
            <Info icon="train-outline" value="Metro" label="Transport" />
            <Info icon="sunny-outline" value="Apr–Jun" label="Best Time" />
          </View>
        </View>
        <Header
          title="Must-See Sights"
          link={`View all ${city.sights.length} ›`}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.cards}
        >
          {city.sights.map((x, i) => {
            const checked = done.includes(x.id);
            return (
              <TouchableOpacity
                key={x.id}
                style={s.sight}
                onPress={() => toggleSight(x.id, checked)}
              >
                <View
                  style={[
                    s.sightArt,
                    {
                      backgroundColor: [
                        "#91705E",
                        "#65818A",
                        "#987B63",
                        "#687B75",
                        "#967863",
                        "#768685",
                      ][i],
                    },
                  ]}
                >
                  <Ionicons
                    name={x.icon as never}
                    size={42}
                    color={BrandColors.surface}
                  />
                  <View style={[s.check, checked && s.checked]}>
                    <Ionicons
                      name={checked ? "checkmark" : "add"}
                      size={13}
                      color={checked ? BrandColors.white : BrandColors.onDark}
                    />
                  </View>
                </View>
                <Text style={s.sightName}>{x.name}</Text>
                <Text style={s.area}>{x.area}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={s.grid}>
          <View style={s.panel}>
            <Header title="Paris Collections" />
            <Progress name="Iconic Paris" value="18 / 25" width="72%" />
            <Progress name="Paris Museums" value="5 / 20" width="25%" />
            <Progress name="Historic Landmarks" value="9 / 18" width="50%" />
            <Progress name="Food & Markets" value="7 / 25" width="28%" />
          </View>
          <View style={s.panel}>
            <Header title="Neighborhoods" />
            <Progress name="Montmartre" value="22%" width="22%" />
            <Progress name="Le Marais" value="33%" width="33%" />
            <Progress name="Latin Quarter" value="19%" width="19%" />
            <Progress name="Saint-Germain" value="29%" width="29%" />
          </View>
        </View>
        <View style={s.challenge}>
          <Ionicons
            name="ribbon-outline"
            size={44}
            color={BrandColors.copper}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.challengeTitle}>Complete Paris Challenge</Text>
            <Text style={s.challengeText}>
              Visit 50 essential sights and experiences.
            </Text>
            <Text style={s.challengeNum}>{done.length} / 50</Text>
            <View style={s.bar}>
              <View
                style={[s.fill, { width: `${(done.length / 50) * 100}%` }]}
              />
            </View>
            <Text style={s.reward}>Reward: +0.8 Kroo Score</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}
function Info({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={s.info}>
      <Ionicons name={icon as never} size={20} color={BrandColors.copper} />
      <Text style={s.infoValue}>{value}</Text>
      <Text style={s.infoLabel}>{label}</Text>
    </View>
  );
}
function Header({ title, link }: { title: string; link?: string }) {
  return (
    <View style={s.header}>
      <Text style={s.sectionTitle}>{title}</Text>
      {link && <Text style={s.link}>{link}</Text>}
    </View>
  );
}
function Progress({
  name,
  value,
  width,
}: {
  name: string;
  value: string;
  width: string;
}) {
  return (
    <View style={s.prog}>
      <Text style={s.progName}>{name}</Text>
      <Text style={s.progValue}>{value}</Text>
      <View style={s.progBar}>
        <View style={[s.fill, { width: width as never }]} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 35 },
  hero: {
    height: 275,
    padding: 18,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#6D786B",
    alignItems: "center",
    justifyContent: "center",
  },
  back: {
    position: "absolute",
    left: 16,
    top: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(7,37,25,.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 24,
    color: BrandColors.onDark,
  },
  subtitle: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 16,
    color: BrandColors.copper,
  },
  location: {
    marginTop: 8,
    fontFamily: "Lora_500Medium",
    fontSize: 14,
    color: BrandColors.onDark,
  },
  heroButtons: { marginTop: 13, width: "61%", flexDirection: "row", gap: 8 },
  add: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.white,
  },
  wish: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  wishText: {
    fontFamily: "Lora_500Medium",
    fontSize: 14,
    color: BrandColors.onDark,
  },
  progress: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 130,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(7,37,25,.92)",
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
  },
  progressLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  progressValue: {
    fontFamily: "Lora_700Bold",
    fontSize: 26,
    color: BrandColors.onDark,
  },
  progressText: {
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  bar: {
    height: 5,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: BrandColors.paleGreen,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: BrandColors.copper,
  },
  passport: {
    margin: 14,
    padding: 13,
    borderRadius: 12,
    backgroundColor: BrandColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  miniStamp: {
    width: 70,
    height: 92,
    borderWidth: 2,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  paris: {
    fontFamily: "Lora_700Bold",
    fontSize: 13,
    color: BrandColors.copper,
  },
  passTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 13,
    color: BrandColors.copper,
  },
  passStats: {
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricValue: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    color: BrandColors.green,
  },
  metricLabel: {
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.muted,
  },
  unlock: {
    marginTop: 11,
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.muted,
  },
  circleProgress: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 4,
    borderColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  circleValue: {
    fontFamily: "Lora_700Bold",
    fontSize: 17,
    color: BrandColors.green,
  },
  circleLabel: {
    fontFamily: "Lora_700Bold",
    fontSize: 8,
    color: BrandColors.muted,
  },
  tabBar: {
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.paleGreen,
  },
  tabs: {
    paddingHorizontal: 14,
    gap: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    height: "100%",
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: { borderBottomColor: BrandColors.copper },
  tab: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    color: BrandColors.onDark,
  },
  tabActive: {
    fontFamily: "Lora_700Bold",
    fontSize: 16,
    color: BrandColors.copper,
  },
  glance: {
    marginHorizontal: 14,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
  },
  sectionTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 17,
    color: BrandColors.onDark,
  },
  glanceRow: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  info: { width: "19%", alignItems: "center" },
  infoValue: {
    marginTop: 5,
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    color: BrandColors.onDark,
  },
  infoLabel: {
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    textAlign: "center",
    color: BrandColors.onDarkMuted,
  },
  header: {
    marginTop: 18,
    marginBottom: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    fontFamily: "Lora_500Medium",
    fontSize: 14,
    color: BrandColors.copper,
  },
  cards: { paddingHorizontal: 14, gap: 8 },
  sight: {
    width: 116,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
  },
  sightArt: { height: 80, alignItems: "center", justifyContent: "center" },
  check: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(7,37,25,.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: "#359D55" },
  sightName: {
    margin: 7,
    marginBottom: 1,
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.onDark,
  },
  area: {
    marginHorizontal: 7,
    marginBottom: 7,
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
  grid: { margin: 14, flexDirection: "row", gap: 8 },
  panel: {
    flex: 1,
    paddingBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
  },
  prog: { paddingHorizontal: 10, marginTop: 8 },
  progName: {
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.onDark,
  },
  progValue: {
    position: "absolute",
    right: 10,
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
  progBar: { height: 4, marginTop: 4, backgroundColor: BrandColors.paleGreen },
  challenge: {
    marginHorizontal: 14,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    flexDirection: "row",
    gap: 12,
  },
  challengeTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 17,
    color: BrandColors.onDark,
  },
  challengeText: {
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  challengeNum: {
    marginTop: 7,
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    color: BrandColors.copper,
  },
  reward: {
    marginTop: 7,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.copper,
  },
});
