import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { stampAssets } from "@/data/stamps";
import { BrandColors } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { photoChanged, profileDetailsChanged } from "@/store/profile-slice";
import { api } from "@/services/api";
import type { ProfileState } from "@/store/profile-slice";
import { VisitedCityCard } from "@/components/visited-city-card";
import type { Visit } from "@/store/travel-slice";

const colors = {
  background: BrandColors.canvas,
  paper: BrandColors.white,
  paperBorder: BrandColors.copper,
  ink: BrandColors.onDark,
  muted: BrandColors.onDarkMuted,
  dot: BrandColors.line,
};

type Stamp = { id: string; code: string; name: string; image?: number };
type PassportPage =
  | { id: string; type: "cover"; image: number; accessibilityLabel: string }
  | { id: string; type: "identity" }
  | { id: string; type: "visits" }
  | { id: string; type: "stamps"; slots: (Stamp | null)[] };

function PassportVisitsPage({ visits, width, height, onOpenCountry }: { visits: Visit[]; width: number; height: number; onOpenCountry: (code: string) => void }) {
  return (
    <View style={[styles.paper, styles.visitsPaper, { width, height }]}>
      <Text style={styles.visitsTitle}>VISITED CITIES</Text>
      <Text style={styles.visitsSubtitle}>{visits.length} recorded in this passport</Text>
      <ScrollView
        style={styles.visitsScroll}
        contentContainerStyle={styles.visitsContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {visits.length === 0 ? (
          <Text style={styles.visitsEmpty}>Add a city from the Globe tab.</Text>
        ) : visits.map((visit) => (
          <VisitedCityCard
            key={visit.id}
            visit={visit}
            showCountry={false}
            actionLabel="OPEN"
            onAction={() => onOpenCountry(visit.countryCode)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function IdentityPage({ profile, width, height }: { profile: ProfileState; width: number; height: number }) {
  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState({ name: profile.name, email: profile.email, nationality: profile.nationality, dateOfBirth: profile.dateOfBirth });
  const [password, setPassword] = useState("");
  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (!result.canceled) dispatch(photoChanged(result.assets[0].uri));
  };
  const save = () => {
    dispatch(profileDetailsChanged(draft));
    void api.updateProfile({ ...profile, ...draft }).catch(() => undefined);
  };
  return <View style={[styles.paper, styles.identityPaper, { width, height }]}>
    <View style={styles.identityHeading}><Text style={styles.identityCountry}>STAMPО TRAVEL PASSPORT</Text><Text style={styles.identityType}>PASSPORT · P</Text></View>
    <View style={styles.identityBody}>
      <TouchableOpacity style={styles.photoBox} onPress={() => void pickPhoto()}>
        {profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={styles.identityPhoto} contentFit="cover" /> : <><Ionicons name="person" size={48} color={BrandColors.muted} /><Text style={styles.addPhoto}>ADD PHOTO</Text></>}
      </TouchableOpacity>
      <View style={styles.identityFields}>
        {([
          ["name", "GIVEN NAME", "First name"],
          ["email", "EMAIL", "you@example.com"],
          ["nationality", "NATIONALITY", "Country"],
          ["dateOfBirth", "DATE OF BIRTH", "YYYY-MM-DD"],
        ] as const).map(([key, label, placeholder]) => <View key={key} style={styles.identityField}><Text style={styles.fieldCaption}>{label}</Text><TextInput value={draft[key]} onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor="#a89378" style={styles.identityInput} onBlur={save} /></View>)}
        <View style={styles.identityField}><Text style={styles.fieldCaption}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} placeholder="Create password" placeholderTextColor="#a89378" secureTextEntry style={styles.identityInput} /></View>
        <TouchableOpacity style={styles.accountButton} disabled={!draft.name.trim() || !draft.email.trim() || password.length < 6} onPress={() => { save(); void api.signUp({ name: draft.name.trim(), email: draft.email.trim(), password }).catch(() => undefined); }}><Text style={styles.accountButtonText}>CREATE ACCOUNT</Text></TouchableOpacity>
      </View>
    </View>
    <View style={styles.numberRow}><Text style={styles.numberLabel}>KROO NUMBER</Text><Text style={styles.passportNumber}>{profile.krooNumber}</Text></View>
    <Text style={styles.machineCode}>{`P<STAMPO<${(draft.name || "TRAVELLER").toUpperCase().replace(/\s/g, "<")}<<<<<<<<`}</Text>
    <Text style={styles.machineCode}>{`${profile.krooNumber.replace(/-/g, "")}<<<<<<<<<<<<<<<<<<`}</Text>
  </View>;
}

function chunkStamps(stamps: Stamp[]): PassportPage[] {
  if (stamps.length === 0) return [];
  const pages: PassportPage[] = [];
  for (let index = 0; index < stamps.length; index += 4) {
    const slots: (Stamp | null)[] = stamps.slice(index, index + 4);
    while (slots.length < 4) slots.push(null);
    pages.push({ id: `stamps-${index / 4 + 1}`, type: "stamps", slots });
  }
  return pages;
}

function StampPage({ slots, width, height, onStampPress }: { slots: (Stamp | null)[]; width: number; height: number; onStampPress: (stamp: Stamp) => void }) {
  return (
    <View style={[styles.paper, { width, height }]}>
      <View style={styles.paperInner}>
        {slots.map((stamp, index) => (
          <Pressable key={stamp?.id ?? `empty-${index}`} disabled={!stamp} onPress={() => stamp && onStampPress(stamp)} style={[styles.stampSlot, !stamp && styles.emptySlot]}>
            {stamp?.image ? (
              <Image source={stamp.image} style={styles.stampImage} contentFit="contain" />
            ) : stamp ? (
              <View style={styles.genericStamp}>
                <Text style={styles.genericCode}>{stamp.code}</Text>
                <Text style={styles.genericName}>{stamp.name}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function PassportScreen() {
  const router = useRouter();
  const profile = useAppSelector((state) => state.profile);
  const visits = useAppSelector((state) => state.travel.visits);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [activePage, setActivePage] = useState(0);
  const listRef = useRef<FlatList<PassportPage>>(null);
  const pageWidth = Math.min(screenWidth - 36, 620);
  const pageHeight = Math.min(screenHeight - 190, pageWidth * 1.48);

  const passportPages = useMemo(() => {
    const countryMap = new Map<string, Stamp>();
    visits.forEach((visit) => {
      if (visit.countryCode && !countryMap.has(visit.countryCode)) {
        countryMap.set(visit.countryCode, {
          id: visit.countryCode,
          code: visit.countryCode,
          name: visit.country,
          image: stampAssets[visit.countryCode],
        });
      }
    });
    const stamps = [...countryMap.values()].sort((left, right) => left.name.localeCompare(right.name));
    return [
      {
        id: "front-cover",
        type: "cover" as const,
        image: require("@/assets/images/other/passport-front.png"),
        accessibilityLabel: "Electronic passport front cover",
      },
      { id: "identity", type: "identity" as const },
      { id: "visited-cities", type: "visits" as const },
      ...chunkStamps(stamps),
      {
        id: "back-cover",
        type: "cover" as const,
        image: require("@/assets/images/other/passport-back.png"),
        accessibilityLabel: "Passport back cover",
      },
    ];
  }, [visits]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActivePage(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.carouselArea}>
        <FlatList
          ref={listRef}
          data={passportPages}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(page) => page.id}
          onMomentumScrollEnd={handleScrollEnd}
          getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
          renderItem={({ item }) => (
            <View style={[styles.pageFrame, { width: screenWidth }]}>
              {item.type === "cover" ? (
                <Image source={item.image} style={{ width: pageHeight, height: pageHeight }} contentFit="contain" />
              ) : item.type === "identity" ? (
                <IdentityPage profile={profile} width={pageWidth} height={pageHeight} />
              ) : item.type === "visits" ? (
                <PassportVisitsPage visits={visits} width={pageWidth} height={pageHeight} onOpenCountry={(code) => router.push(`/country/${code}` as never)} />
              ) : (
                <StampPage slots={item.slots} width={pageWidth} height={pageHeight} onStampPress={(stamp) => router.push(`/country/${stamp.code}` as never)} />
              )}
            </View>
          )}
        />
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => void Share.share({ message: `My Stampo passport — ${Math.max(0, passportPages.length - 2)} stamp pages.` })}
        >
          <Ionicons name="arrow-redo-sharp" size={36} color={colors.ink} />
        </TouchableOpacity>
      </View>
      <View style={styles.pagination}>
        <View style={styles.dots}>
          {passportPages.map((page, index) => (
            <TouchableOpacity
              key={page.id}
              style={[styles.dot, index === activePage && styles.dotActive]}
              onPress={() => {
                listRef.current?.scrollToIndex({ index, animated: true });
                setActivePage(index);
              }}
            />
          ))}
        </View>
        <Text style={styles.pageCount}>{activePage + 1} / {passportPages.length}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  carouselArea: { flex: 1, position: "relative" },
  pageFrame: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  paper: { backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.paperBorder, borderRadius: 18, padding: 9, elevation: 2 },
  identityPaper: { padding: 20, justifyContent: "space-between" },
  visitsPaper: { padding: 16 },
  visitsTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 23, letterSpacing: 1.2, color: BrandColors.green },
  visitsSubtitle: { marginTop: 2, fontFamily: "Lora_400Regular", fontSize: 11, color: BrandColors.muted },
  visitsScroll: { flex: 1, marginTop: 12 },
  visitsContent: { gap: 9, paddingBottom: 12 },
  visitsEmpty: { marginTop: 30, textAlign: "center", fontFamily: "Lora_400Regular", color: BrandColors.muted },
  identityHeading: { borderBottomWidth: 1, borderBottomColor: BrandColors.line, paddingBottom: 10 },
  identityCountry: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 19, color: BrandColors.green, letterSpacing: 1.2 },
  identityType: { marginTop: 3, fontFamily: "Lora_500Medium", fontSize: 10, color: BrandColors.muted },
  identityBody: { flex: 1, flexDirection: "row", gap: 14, paddingTop: 18 },
  photoBox: { width: "36%", height: "58%", minHeight: 155, borderRadius: 8, backgroundColor: BrandColors.surfaceSoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  identityPhoto: { width: "100%", height: "100%" },
  addPhoto: { marginTop: 7, fontFamily: "Lora_700Bold", fontSize: 9, color: BrandColors.muted },
  identityFields: { flex: 1, gap: 7 },
  identityField: { borderBottomWidth: 1, borderBottomColor: BrandColors.line },
  fieldCaption: { fontFamily: "Lora_700Bold", fontSize: 8, letterSpacing: 0.7, color: BrandColors.muted },
  identityInput: { height: 33, padding: 0, fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 14, color: BrandColors.ink },
  accountButton: { height: 30, borderRadius: 7, backgroundColor: BrandColors.green, alignItems: "center", justifyContent: "center" },
  accountButtonText: { fontFamily: "Lora_700Bold", fontSize: 9, letterSpacing: 0.8, color: BrandColors.white },
  numberRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: BrandColors.line, paddingTop: 10 },
  numberLabel: { fontFamily: "Lora_700Bold", fontSize: 9, color: BrandColors.muted, letterSpacing: 1 },
  passportNumber: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, color: BrandColors.green },
  machineCode: { fontFamily: "monospace", fontSize: 11, letterSpacing: 0.5, color: BrandColors.ink },
  paperInner: { flex: 1, borderWidth: 1, borderColor: BrandColors.line, borderRadius: 14, padding: 14, flexDirection: "row", flexWrap: "wrap", alignContent: "center", justifyContent: "space-between", rowGap: 8 },
  stampSlot: { width: "49%", height: "47%", alignItems: "center", justifyContent: "center", borderRadius: 14 },
  emptySlot: { borderWidth: 1.2, borderStyle: "dashed", borderColor: BrandColors.line },
  stampImage: { width: "100%", height: "100%" },
  genericStamp: { width: "90%", height: "76%", borderWidth: 4, borderColor: BrandColors.copperDark, borderRadius: 24, alignItems: "center", justifyContent: "center", padding: 8 },
  genericCode: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 30, color: BrandColors.copperDark },
  genericName: { fontFamily: "Lora_600SemiBold", fontSize: 12, textAlign: "center", color: BrandColors.copperDark },
  shareButton: { position: "absolute", top: 24, right: 14, width: 54, height: 54, borderRadius: 27, backgroundColor: BrandColors.greenDeep, borderWidth: 1, borderColor: BrandColors.copper, alignItems: "center", justifyContent: "center" },
  pagination: { height: 80, alignItems: "center", paddingTop: 5 },
  dots: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "92%", flexWrap: "wrap", justifyContent: "center" },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dot },
  dotActive: { backgroundColor: BrandColors.copper },
  pageCount: { marginTop: 8, color: colors.muted, fontFamily: "Lora_700Bold", fontSize: 20 },
});
