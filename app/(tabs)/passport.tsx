import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { stampAssets } from "@/data/stamps";
import { BrandColors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";

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
  | { id: string; type: "stamps"; slots: (Stamp | null)[] };

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

function StampPage({ slots, width, height }: { slots: (Stamp | null)[]; width: number; height: number }) {
  return (
    <View style={[styles.paper, { width, height }]}>
      <View style={styles.paperInner}>
        {slots.map((stamp, index) => (
          <View key={stamp?.id ?? `empty-${index}`} style={[styles.stampSlot, !stamp && styles.emptySlot]}>
            {stamp?.image ? (
              <Image source={stamp.image} style={styles.stampImage} contentFit="contain" />
            ) : stamp ? (
              <View style={styles.genericStamp}>
                <Text style={styles.genericCode}>{stamp.code}</Text>
                <Text style={styles.genericName}>{stamp.name}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PassportScreen() {
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
              ) : (
                <StampPage slots={item.slots} width={pageWidth} height={pageHeight} />
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
