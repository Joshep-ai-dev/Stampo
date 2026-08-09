import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { challenges, featuredCountries } from "@/data/explore";
import { stampAssets } from "@/data/stamps";

const filters = ["All", "Europe", "Asia", "Africa", "Americas"];

export default function ExploreScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brandRow}>
          <Text style={s.brand}>⌁ Kroo</Text>
          <TouchableOpacity style={s.bell}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={BrandColors.copper}
            />
          </TouchableOpacity>
        </View>
        <Text style={s.title}>Explore</Text>
        <Text style={s.subtitle}>
          Discover the world. Complete stamps. Earn glory.
        </Text>

        <View style={s.headingRow}>
          <Text style={s.heading}>Countries</Text>
          <Text style={s.link}>View all ›</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {filters.map((filter, index) => (
            <View key={filter} style={[s.pill, index === 0 && s.pillActive]}>
              <Text style={[s.pillText, index === 0 && s.pillTextActive]}>
                {filter}
              </Text>
            </View>
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.cardRow}
        >
          {featuredCountries.map((country) => (
            <TouchableOpacity
              key={country.code}
              activeOpacity={0.82}
              style={s.countryCard}
              onPress={() => router.push(`/country/${country.code}` as never)}
            >
              <Text style={s.countryName}>{country.name.toUpperCase()}</Text>
              {stampAssets[country.code] ? (
                <Image
                  source={stampAssets[country.code]}
                  style={s.stamp}
                  contentFit="contain"
                />
              ) : (
                <View style={s.placeholder}>
                  <Text style={s.flag}>{country.flag}</Text>
                  <Ionicons
                    name="earth-outline"
                    size={46}
                    color={BrandColors.green}
                  />
                </View>
              )}
              <Text style={s.cities}>
                {country.cities} {country.cities === 1 ? "City" : "Cities"}
              </Text>
              <View style={s.progress}>
                <View
                  style={[s.progressFill, { width: `${country.progress}%` }]}
                />
              </View>
              <Text style={s.percent}>{country.progress}%</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.activity}>
          <View style={s.avatar}>
            <Text>🌍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.activityText}>
              <Text style={s.activityName}>Francis</Text> reached 50 World
              Capitals.
            </Text>
            <Text style={s.activitySub}>Well done!</Text>
          </View>
          <View style={s.score}>
            <Ionicons
              name="ribbon-outline"
              size={22}
              color={BrandColors.copper}
            />
            <Text style={s.scoreText}>50</Text>
          </View>
        </View>

        <View style={s.headingRow}>
          <Text style={s.heading}>Challenges</Text>
          <Text style={s.link}>View all ›</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.cardRow}
        >
          {challenges.map((challenge) => (
            <TouchableOpacity
              key={challenge.id}
              style={s.challenge}
              activeOpacity={0.82}
            >
              <View style={s.challengeSeal}>
                <Ionicons
                  name={challenge.icon as never}
                  size={40}
                  color={BrandColors.green}
                />
              </View>
              <Text style={s.challengeTitle}>{challenge.title}</Text>
              <Text style={s.challengeDetail}>{challenge.detail}</Text>
              <View style={s.challengeProgress}>
                <View
                  style={[s.progressFill, { width: `${challenge.progress}%` }]}
                />
              </View>
              <Text style={s.challengePercent}>{challenge.progress}%</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.cta}>
          <Ionicons
            name="compass-outline"
            size={34}
            color={BrandColors.copper}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.ctaTitle}>Keep Exploring</Text>
            <Text style={s.ctaText}>Every stamp tells a story.</Text>
          </View>
          <TouchableOpacity
            style={s.ctaButton}
            onPress={() => router.push("/visits")}
          >
            <Text style={s.ctaButtonText}>Add a Visit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 30 },
  brandRow: {
    height: 58,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: BrandColors.copper,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: BrandColors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: BrandColors.onDark,
  },
  subtitle: {
    textAlign: "center",
    marginTop: 4,
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  headingRow: {
    marginTop: 26,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 25,
    color: BrandColors.onDark,
  },
  link: {
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.copper,
  },
  pills: { paddingHorizontal: 20, gap: 8 },
  pill: {
    height: 36,
    paddingHorizontal: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    justifyContent: "center",
  },
  pillActive: { borderColor: BrandColors.copper },
  pillText: {
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
  pillTextActive: { color: BrandColors.copper },
  cardRow: { paddingHorizontal: 20, gap: 9 },
  countryCard: {
    width: 132,
    minHeight: 220,
    padding: 9,
    borderRadius: 12,
    backgroundColor: BrandColors.surface,
    alignItems: "center",
  },
  countryName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 16,
    color: BrandColors.green,
  },
  stamp: { width: 112, height: 145 },
  placeholder: {
    width: 112,
    height: 145,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BrandColors.line,
  },
  flag: { fontSize: 24 },
  cities: {
    fontFamily: "Lora_500Medium",
    fontSize: 10,
    color: BrandColors.ink,
  },
  progress: {
    position: "absolute",
    left: 10,
    right: 28,
    bottom: 9,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0C7B6",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: BrandColors.copper,
  },
  percent: {
    position: "absolute",
    right: 7,
    bottom: 4,
    fontFamily: "Lora_500Medium",
    fontSize: 8,
    color: BrandColors.muted,
  },
  activity: {
    margin: 18,
    marginBottom: 0,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BrandColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  activityText: {
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.onDark,
  },
  activityName: { fontFamily: "Lora_700Bold", color: BrandColors.copper },
  activitySub: {
    marginTop: 2,
    fontFamily: "Lora_400Regular",
    fontSize: 11,
    color: BrandColors.onDarkMuted,
  },
  score: { alignItems: "center" },
  scoreText: {
    fontFamily: "Lora_700Bold",
    fontSize: 10,
    color: BrandColors.copper,
  },
  challenge: {
    width: 150,
    minHeight: 225,
    padding: 12,
    borderRadius: 12,
    backgroundColor: BrandColors.surface,
    alignItems: "center",
  },
  challengeSeal: {
    width: 88,
    height: 88,
    borderWidth: 2,
    borderColor: BrandColors.green,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeTitle: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    color: BrandColors.green,
  },
  challengeDetail: {
    marginTop: 5,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.muted,
  },
  challengeProgress: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 37,
    height: 4,
    backgroundColor: "#D0C7B6",
  },
  challengePercent: {
    position: "absolute",
    right: 9,
    bottom: 9,
    fontFamily: "Lora_500Medium",
    fontSize: 8,
    color: BrandColors.muted,
  },
  cta: {
    margin: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  ctaTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 18,
    color: BrandColors.onDark,
  },
  ctaText: {
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDarkMuted,
  },
  ctaButton: {
    borderWidth: 1,
    borderColor: BrandColors.copper,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  ctaButtonText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 10,
    color: BrandColors.copper,
  },
});
