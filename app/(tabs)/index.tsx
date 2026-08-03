import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const colors = {
  background: "#f4ecdc",
  panel: "#ead7b8",
  ink: "#2b211a",
  brown: "#78431f",
  muted: "#69523e",
  line: "#c7a56e",
};

const countries = [
  {
    id: "us",
    name: "United States",
    flag: "🇺🇸",
    cities: "10 Cities",
    cityCount: 10,
    continent: "north-america",
    image: require("@/assets/images/stampo/united-states.png"),
  },
  {
    id: "ca",
    name: "Canada",
    flag: "🇨🇦",
    cities: "1 City",
    cityCount: 1,
    continent: "north-america",
    image: require("@/assets/images/stampo/canada.png"),
  },
  {
    id: "mx",
    name: "Mexico",
    flag: "🇲🇽",
    cities: "2 Cities",
    cityCount: 2,
    continent: "north-america",
    image: require("@/assets/images/stampo/mexico.png"),
  },
  {
    id: "kh",
    name: "Cambodia",
    flag: "🇰🇭",
    cities: "1 City",
    cityCount: 1,
    continent: "asia",
    image: require("@/assets/images/stampo/cambodia.png"),
  },
  {
    id: "fr",
    name: "France",
    flag: "🇫🇷",
    cities: "3 Cities",
    cityCount: 3,
    continent: "europe",
    image: require("@/assets/images/stampo/france.png"),
  },
  {
    id: "jp",
    name: "Japan",
    flag: "🇯🇵",
    cities: "3 Cities",
    cityCount: 3,
    continent: "asia",
    image: require("@/assets/images/stampo/japan.png"),
  },
  {
    id: "my",
    name: "Malaysia",
    flag: "🇲🇾",
    cities: "1 City",
    cityCount: 1,
    continent: "asia",
    image: require("@/assets/images/stampo/malaysia.png"),
  },
  {
    id: "nl",
    name: "Netherlands",
    flag: "🇳🇱",
    cities: "1 City",
    cityCount: 1,
    continent: "europe",
    image: require("@/assets/images/stampo/netherlands.png"),
  },
  {
    id: "sg",
    name: "Singapore",
    flag: "🇸🇬",
    cities: "1 City",
    cityCount: 1,
    continent: "asia",
    image: require("@/assets/images/stampo/singapore.png"),
  },
  {
    id: "kr",
    name: "South Korea",
    flag: "🇰🇷",
    cities: "2 Cities",
    cityCount: 2,
    continent: "asia",
    image: require("@/assets/images/stampo/south-korea.png"),
  },
  {
    id: "th",
    name: "Thailand",
    flag: "🇹🇭",
    cities: "1 City",
    cityCount: 1,
    continent: "asia",
    image: require("@/assets/images/stampo/thailand.png"),
  },
  {
    id: "tr",
    name: "Turkey",
    flag: "🇹🇷",
    cities: "2 Cities",
    cityCount: 2,
    continent: "europe",
    image: require("@/assets/images/stampo/turkey.png"),
  },
  {
    id: "ae",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    cities: "1 City",
    cityCount: 1,
    continent: "asia",
    image: require("@/assets/images/stampo/united-arab-emirates.png"),
  },
];

const achievements = [
  {
    id: "dream-departure",
    title: "Dream Departure",
    subtitle: "Visit 1 country",
    image: require("@/assets/images/other/dream-departure.png"),
  },
  {
    id: "blooming-journey",
    title: "Blooming Journey",
    subtitle: "Visit 5 countries",
    image: require("@/assets/images/other/blooming-journey.png"),
  },
];

const stats = [
  { id: "countries", label: "COUNTRIES", value: 13, icon: "globe-outline" },
  { id: "continents", label: "CONTINENTS", value: 3, icon: "flag-outline" },
  { id: "cities", label: "CITIES", value: 29, icon: "location-outline" },
] as const;

const continentFilters = [
  { id: "asia", label: "Asia" },
  { id: "north-america", label: "N. America", selected: true },
  { id: "europe", label: "Europe" },
  { id: "south-america", label: "S. America" },
];

const achievementFilters = [
  { id: "countries", label: "Countries", selected: true },
  { id: "cities", label: "Cities" },
  { id: "continents", label: "Continents" },
  { id: "personal", label: "Personal" },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity activeOpacity={0.65}>
        <Text style={styles.viewAll}>View all ›</Text>
      </TouchableOpacity>
    </View>
  );
}

function FilterPill({
  label,
  selected = false,
}: {
  label: string;
  selected?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.welcomeBlock}>
            <Text style={styles.eyebrow}>WELCOME</Text>
            <Text style={styles.name}>Robb</Text>
          </View>

          <Image
            source={require("@/assets/images/other/globe-airplane.png")}
            style={styles.globeArtwork}
            contentFit="contain"
            pointerEvents="none"
          />

          <TouchableOpacity style={styles.settingsButton} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={28} color={colors.muted} />
          </TouchableOpacity>
          <View style={styles.levelRow}>
            <View style={styles.badgeWrap}>
              <Image
                source={require("@/assets/images/other/level-badge.png")}
                style={styles.badgeImage}
                contentFit="contain"
              />
              <Text style={styles.badgeLabel}>Lv.</Text>
              <Text style={styles.badgeNumber}>10</Text>
            </View>
            <View style={styles.levelDetails}>
              <Text style={styles.levelTitle}>ATLAS WHISPERER</Text>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.xp}>130 / 140 XP</Text>
            </View>
          </View>
        </View>
        <View style={styles.statsCard}>
          {stats.map((stat, index) => (
            <View key={stat.id} style={styles.statItem}>
              {index > 0 && <View style={styles.statDivider} />}
              <View style={styles.stat}>
                <View style={styles.statTop}>
                  <Ionicons name={stat.icon} size={25} color={colors.muted} />
                  <Text style={styles.statNumber}>{stat.value}</Text>
                </View>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <SectionHeader title="Country Atlas" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {continentFilters.map((filter) => (
            <FilterPill
              key={filter.id}
              label={filter.label}
              selected={filter.selected}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}
        >
          {countries.map((country) => (
            <TouchableOpacity
              key={country.id}
              style={styles.countryCard}
              activeOpacity={0.8}
            >
              <Text style={styles.countryName}>
                <Text style={styles.flag}>{country.flag} </Text>
                {country.name}
              </Text>
              <Image
                source={country.image}
                style={styles.countryStamp}
                contentFit="contain"
              />
              <Text style={styles.countryCities}>{country.cities}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader title="Achievements" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {achievementFilters.map((filter) => (
            <FilterPill
              key={filter.id}
              label={filter.label}
              selected={filter.selected}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}
        >
          {achievements.map((achievement) => (
            <TouchableOpacity
              key={achievement.id}
              style={styles.achievementCard}
              activeOpacity={0.8}
            >
              <Image
                source={achievement.image}
                style={styles.achievementImage}
                contentFit="contain"
              />
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementSubtitle}>
                {achievement.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const displaySemiBold = "PlayfairDisplay_600SemiBold";
const displayBold = "PlayfairDisplay_700Bold";
const displayItalic = "PlayfairDisplay_400Regular_Italic";
const body = "Lora_500Medium";
const bodySemiBold = "Lora_600SemiBold";
const bodyBold = "Lora_700Bold";

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 34 },
  hero: {
    height: 320,
    paddingHorizontal: 24,
    paddingTop: 16,
    overflow: "hidden",
  },
  welcomeBlock: { zIndex: 2 },
  eyebrow: {
    color: colors.muted,
    fontFamily: displaySemiBold,
    fontSize: 19,
    letterSpacing: 3.5,
  },
  name: {
    color: colors.ink,
    fontFamily: displayBold,
    fontSize: 60,
    lineHeight: 72,
  },
  globeArtwork: {
    position: "absolute",
    width: 320,
    height: 320,
    top: -3,
    right: 10,
  },
  settingsButton: {
    position: "absolute",
    right: 18,
    top: 11,
    zIndex: 3,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  levelRow: {
    position: "absolute",
    left: 28,
    right: 24,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeWrap: {
    width: 76,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeImage: { position: "absolute", width: 56, height: 80 },
  badgeLabel: {
    fontFamily: displaySemiBold,
    color: colors.muted,
    fontSize: 15,
    marginTop: 5,
  },
  badgeNumber: {
    fontFamily: displayBold,
    color: colors.ink,
    fontSize: 24,
  },
  levelDetails: { flex: 1, marginLeft: 17, paddingTop: 9 },
  levelTitle: {
    fontFamily: displaySemiBold,
    color: colors.ink,
    fontSize: 20,
    letterSpacing: 2.1,
  },
  progressTrack: {
    height: 5,
    borderRadius: 4,
    backgroundColor: "#dbc69f",
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    width: "93%",
    height: "100%",
    backgroundColor: colors.brown,
    borderRadius: 4,
  },
  xp: {
    fontFamily: displayItalic,
    color: colors.muted,
    fontSize: 18,
    marginTop: 8,
    letterSpacing: 1,
  },
  statsCard: {
    height: 94,
    marginHorizontal: 20,
    borderRadius: 13,
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  stat: { flex: 1, alignItems: "center", justifyContent: "center" },
  statItem: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  statTop: { flexDirection: "row", gap: 7, alignItems: "center" },
  statNumber: {
    fontFamily: displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  statLabel: {
    marginTop: 6,
    fontFamily: displaySemiBold,
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 1.1,
  },
  statDivider: { height: 57, width: 1, backgroundColor: colors.line },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: displayBold,
    color: colors.ink,
    fontSize: 24,
    letterSpacing: 1.7,
  },
  viewAll: { fontFamily: displayItalic, color: colors.muted, fontSize: 19 },
  filters: { paddingHorizontal: 16, gap: 7, paddingBottom: 13 },
  pill: {
    height: 39,
    borderRadius: 22,
    borderWidth: 1.3,
    borderColor: colors.line,
    justifyContent: "center",
    paddingHorizontal: 17,
  },
  pillSelected: { backgroundColor: "#512b13", borderColor: "#512b13" },
  pillText: {
    fontFamily: body,
    fontSize: 17,
    color: "#a98767",
    letterSpacing: 1.1,
  },
  pillTextSelected: { color: "#fff8eb" },
  cardRow: { paddingHorizontal: 16, gap: 10 },
  countryCard: {
    width: 200,
    height: 300,
    backgroundColor: colors.panel,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    paddingTop: 14,
  },
  countryName: {
    fontFamily: bodySemiBold,
    color: colors.ink,
    fontSize: 18,
    letterSpacing: 0.35,
    alignSelf: "flex-start",
    marginLeft: 15,
  },
  flag: { fontSize: 22 },
  countryStamp: { width: 190, height: 200, marginTop: 6 },
  countryCities: {
    fontFamily: body,
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  achievementCard: {
    width: 200,
    height: 300,
    backgroundColor: colors.panel,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    paddingTop: 14,
  },
  achievementImage: { width: 184, height: 184 },
  achievementTitle: {
    fontFamily: bodySemiBold,
    color: colors.ink,
    fontSize: 17,
    textAlign: "center",
    marginTop: 8,
  },
  achievementSubtitle: {
    fontFamily: body,
    color: colors.muted,
    fontSize: 15,
    marginTop: 8,
  },
});
