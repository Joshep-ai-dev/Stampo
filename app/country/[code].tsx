import { Ionicons } from "@expo/vector-icons";
import { countries, type TCountryCode } from "countries-list";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { franceGuide } from "@/data/explore";
import { stampAssets } from "@/data/stamps";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { wishlistToggled } from "@/store/travel-slice";

export default function CountryScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { code = "FR" } = useLocalSearchParams<{ code: string }>();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const visits = useAppSelector((x) => x.travel.visits);
  const wished = useAppSelector((x) => x.travel.wishlistIds ?? []).includes(
    `country-${code}`,
  );
  const name = countries[code as TCountryCode]?.name ?? "France";
  const isFrance = code === "FR";
  const countryVisits = visits.filter((v) => v.countryCode === code);
  const done = countryVisits.reduce(
    (n, v) => n + v.places.filter((p) => p.type === "sight").length,
    0,
  );
  const progress = isFrance
    ? Math.max(18, Math.round((done / 1024) * 100))
    : Math.min(100, countryVisits.length * 12);
  const countryStamp = stampAssets[code];
  const flag =
    code.length === 2
      ? String.fromCodePoint(
          ...code
            .toUpperCase()
            .split("")
            .map((char) => 127397 + char.charCodeAt(0)),
        )
      : "🌍";
  const guide = isFrance
    ? franceGuide
    : {
        ...franceGuide,
        name,
        code,
        flag,
        description: `Build your ${name} travel story. Add visits, save places, and collect the country stamp.`,
        cities: [],
      };
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.top}>
          <TouchableOpacity style={s.circle} onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
          <View style={s.topActions}>
            <TouchableOpacity
              style={s.circle}
              onPress={() => dispatch(wishlistToggled(`country-${code}`))}
            >
              <Ionicons
                name={wished ? "heart" : "heart-outline"}
                size={22}
                color={wished ? BrandColors.copper : BrandColors.onDark}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.circle}
              onPress={() =>
                void Share.share({ message: `Explore ${name} with Kroo` })
              }
            >
              <Ionicons
                name="share-outline"
                size={22}
                color={BrandColors.onDark}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.hero}>
          <View style={s.heroStampCard}>
            {countryStamp ? (
              <Image
                source={countryStamp}
                style={s.stamp}
                contentFit="contain"
              />
            ) : (
              <Ionicons name="earth-outline" size={48} color="#AAB5AF" />
            )}
          </View>
          <View style={s.heroCopy}>
            <Text style={s.country}>
              {guide.flag} {name}
            </Text>
            <Text style={s.motto}>
              {isFrance
                ? "“Liberté, Égalité, Fraternité”"
                : "Your next great story"}
            </Text>
            <Text style={s.fact}>◉ {guide.region}</Text>
            <Text style={s.fact}>⌖ Capital · {guide.capital}</Text>
          </View>
          <View style={s.progressCard}>
            <Text style={s.progressLabel}>YOUR PROGRESS</Text>
            <Text style={s.progressValue}>{progress}%</Text>
            <Text style={s.progressSmall}>{done} sights visited</Text>
            <View style={s.bar}>
              <View style={[s.fill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>
        <View style={s.actions}>
          <Action
            icon="location-outline"
            label="Add Visit"
            active={activeAction === "visit"}
            onPress={() => {
              setActiveAction("visit");
              router.push({
                pathname: "/visits",
                params: { countryCode: code, countryName: name },
              });
            }}
          />
          <Action
            icon="checkmark-circle-outline"
            label="Been Here"
            active={activeAction === "been-here"}
            onPress={() => setActiveAction("been-here")}
          />
          <Action
            icon={wished ? "heart" : "heart-outline"}
            label="Wishlist"
            active={activeAction === "wishlist"}
            onPress={() => {
              setActiveAction("wishlist");
              dispatch(wishlistToggled(`country-${code}`));
            }}
          />
          <Action
            icon="share-outline"
            label="Share"
            active={activeAction === "share"}
            onPress={() => {
              setActiveAction("share");
              void Share.share({ message: `Explore ${name} with Kroo` });
            }}
          />
        </View>
        <View style={s.tabs}>
          {["OVERVIEW", "CITIES", "SIGHTS", "EXPERIENCES"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tabButton, activeTab === tab && s.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tab, activeTab === tab && s.tabActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.panel}>
          <Text style={s.panelTitle}>About {name}</Text>
          <Text style={s.body}>{guide.description}</Text>
          <View style={s.facts}>
            <Mini
              icon="business-outline"
              label="Capital"
              value={guide.capital}
            />
            <Mini
              icon="chatbubble-outline"
              label="Language"
              value={guide.language}
            />
            <Mini icon="cash-outline" label="Currency" value={guide.currency} />
            <Mini icon="map-outline" label="Region" value={guide.region} />
          </View>
        </View>
        {isFrance && (
          <>
            <Section title="Top Cities" link="View all 42 ›" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.row}
            >
              {guide.cities.map((city, i) => (
                <TouchableOpacity
                  key={city.id}
                  style={s.cityCard}
                  onPress={() => router.push(`/city/${city.id}` as never)}
                >
                  <View
                    style={[
                      s.cityArt,
                      {
                        backgroundColor: [
                          "#BB8D68",
                          "#5E8279",
                          "#A9785A",
                          "#617B86",
                          "#927860",
                        ][i],
                      },
                    ]}
                  >
                    <Ionicons
                      name={i === 0 ? "business-outline" : "location-outline"}
                      size={35}
                      color={BrandColors.surface}
                    />
                    <Text style={s.cityPercent}>{[18, 12, 15, 10, 8][i]}%</Text>
                  </View>
                  <Text style={s.cityName}>{city.name}</Text>
                  <Text style={s.cityMeta}>
                    {city.sights.length || [0, 56, 48, 37, 34][i]} sights
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Section title="Stamps to Earn" link="See collection ›" />
            <View style={s.stamps}>
              <Stamp
                icon="flag-outline"
                title="France Explorer"
                detail="Visit France"
                done={countryVisits.length > 0}
              />
              <Stamp
                icon="business-outline"
                title="Paris Passport"
                detail="Visit 10 Paris sights"
                done={done >= 10}
              />
              <Stamp
                icon="wine-outline"
                title="Wine Routes"
                detail="Visit 3 wine regions"
              />
              <Stamp
                icon="library-outline"
                title="Culture Keeper"
                detail="Visit 12 museums"
              />
            </View>
            <Section title="France Collections" />
            <View style={s.panel}>
              {[
                "UNESCO Sites",
                "Castles & Châteaux",
                "Museums",
                "Beaches",
                "Wine Regions",
              ].map((x, i) => (
                <View key={x} style={s.collection}>
                  <Text style={s.collectionName}>{x}</Text>
                  <Text style={s.collectionCount}>
                    {[18, 24, 15, 9, 6][i]} / {[52, 80, 40, 33, 16][i]}
                  </Text>
                  <View style={s.collectionBar}>
                    <View
                      style={[s.fill, { width: `${[35, 30, 38, 27, 38][i]}%` }]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Action({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.action} onPress={onPress}>
      <Ionicons
        name={icon as never}
        size={24}
        color={active ? BrandColors.copper : BrandColors.onDark}
      />
      <Text style={[s.actionText, active && s.actionTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Mini({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={s.mini}>
      <Ionicons name={icon as never} size={19} color={BrandColors.copper} />
      <View>
        <Text style={s.miniLabel}>{label}</Text>
        <Text style={s.miniValue}>{value}</Text>
      </View>
    </View>
  );
}
function Section({ title, link }: { title: string; link?: string }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {link && <Text style={s.link}>{link}</Text>}
    </View>
  );
}
function Stamp({
  icon,
  title,
  detail,
  done = false,
}: {
  icon: string;
  title: string;
  detail: string;
  done?: boolean;
}) {
  return (
    <View style={[s.stampEarn, done && s.stampDone]}>
      <View style={s.stampIcon}>
        <Ionicons
          name={icon as never}
          size={28}
          color={done ? BrandColors.surface : BrandColors.copper}
        />
      </View>
      <Text style={[s.stampTitle, done && { color: BrandColors.surface }]}>
        {title}
      </Text>
      <Text style={[s.stampDetail, done && { color: BrandColors.onDarkMuted }]}>
        {done ? "Earned" : detail}
      </Text>
      {done && <Ionicons name="checkmark-circle" size={18} color="#65C879" />}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 38 },
  top: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topActions: { flexDirection: "row", gap: 8 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(7,37,25,.82)",
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    minHeight: 185,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroStampCard: {
    width: 100,
    height: 150,
    padding: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#C5A36C",
    backgroundColor: BrandColors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stamp: { width: "100%", height: "100%", transform: [{ scale: 1.36 }] },
  heroCopy: { flex: 1, minWidth: 0 },
  country: {
    fontFamily: "Lora_700Bold",
    fontSize: 27,
    color: BrandColors.onDark,
  },
  motto: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 11,
    color: BrandColors.copper,
    marginVertical: 8,
  },
  fact: {
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDarkMuted,
    marginTop: 3,
  },
  progressCard: {
    width: 94,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(4,29,20,.85)",
  },
  progressLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 9,
    color: BrandColors.onDarkMuted,
  },
  progressValue: {
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    color: BrandColors.copper,
  },
  progressSmall: {
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDark,
  },
  bar: {
    height: 5,
    marginTop: 9,
    borderRadius: 3,
    backgroundColor: BrandColors.paleGreen,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: BrandColors.copper,
    borderRadius: 4,
  },
  actions: {
    margin: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    borderRadius: 13,
    flexDirection: "row",
  },
  action: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: BrandColors.paleGreen,
  },
  actionText: {
    fontFamily: "Lora_500Medium",
    fontSize: 11,
    color: BrandColors.onDark,
  },
  actionTextActive: { color: BrandColors.copper },
  tabs: {
    height: 50,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.paleGreen,
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
    fontSize: 10,
    color: BrandColors.onDark,
  },
  tabActive: {
    fontFamily: "Lora_700Bold",
    fontSize: 10,
    color: BrandColors.copper,
  },
  panel: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: BrandColors.greenDeep,
  },
  panelTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 18,
    color: BrandColors.onDark,
  },
  body: {
    marginTop: 6,
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: BrandColors.onDarkMuted,
  },
  facts: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  mini: { width: "46%", flexDirection: "row", alignItems: "center", gap: 8 },
  miniLabel: {
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDarkMuted,
  },
  miniValue: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 12,
    color: BrandColors.onDark,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 20,
    color: BrandColors.onDark,
  },
  link: {
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.copper,
  },
  row: { paddingHorizontal: 14, gap: 9 },
  cityCard: {
    width: 112,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: BrandColors.greenDeep,
  },
  cityArt: { height: 77, alignItems: "center", justifyContent: "center" },
  cityPercent: {
    position: "absolute",
    right: 5,
    top: 5,
    fontFamily: "Lora_600SemiBold",
    fontSize: 10,
    color: BrandColors.surface,
  },
  cityName: {
    margin: 7,
    marginBottom: 1,
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.onDark,
  },
  cityMeta: {
    marginHorizontal: 7,
    marginBottom: 7,
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDarkMuted,
  },
  stamps: {
    paddingHorizontal: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  stampEarn: {
    width: "48%",
    minHeight: 125,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: BrandColors.greenDeep,
  },
  stampDone: {
    backgroundColor: BrandColors.paleGreen,
    borderColor: BrandColors.copper,
  },
  stampIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  stampTitle: {
    marginTop: 8,
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.onDark,
  },
  stampDetail: {
    marginTop: 3,
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDarkMuted,
  },
  collection: { height: 33, flexDirection: "row", alignItems: "center" },
  collectionName: {
    width: 130,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.onDark,
  },
  collectionCount: {
    width: 50,
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDarkMuted,
  },
  collectionBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: BrandColors.paleGreen,
    overflow: "hidden",
  },
});
