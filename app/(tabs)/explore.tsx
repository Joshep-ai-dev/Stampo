import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRef, useState } from "react";
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

const colors = {
  background: "#f4ecdc",
  paper: "#fff7e6",
  paperBorder: "#dfc9a1",
  ink: "#30261f",
  muted: "#756a5c",
  dot: "#cec7ba",
};

const stamps = {
  unitedStates: {
    id: "us",
    name: "United States",
    image: require("@/assets/images/stampo/united-states.png"),
  },
  canada: {
    id: "ca",
    name: "Canada",
    image: require("@/assets/images/stampo/canada.png"),
  },
  thailand: {
    id: "th",
    name: "Thailand",
    image: require("@/assets/images/stampo/thailand.png"),
  },
  japan: {
    id: "jp",
    name: "Japan",
    image: require("@/assets/images/stampo/japan.png"),
  },
  southKorea: {
    id: "kr",
    name: "South Korea",
    image: require("@/assets/images/stampo/south-korea.png"),
  },
  netherlands: {
    id: "nl",
    name: "Netherlands",
    image: require("@/assets/images/stampo/netherlands.png"),
  },
  france: {
    id: "fr",
    name: "France",
    image: require("@/assets/images/stampo/france.png"),
  },
  turkey: {
    id: "tr",
    name: "Turkey",
    image: require("@/assets/images/stampo/turkey.png"),
  },
  mexico: {
    id: "mx",
    name: "Mexico",
    image: require("@/assets/images/stampo/mexico.png"),
  },
  singapore: {
    id: "sg",
    name: "Singapore",
    image: require("@/assets/images/stampo/singapore.png"),
  },
  malaysia: {
    id: "my",
    name: "Malaysia",
    image: require("@/assets/images/stampo/malaysia.png"),
  },
  unitedArabEmirates: {
    id: "ae",
    name: "United Arab Emirates",
    image: require("@/assets/images/stampo/united-arab-emirates.png"),
  },
  cambodia: {
    id: "kh",
    name: "Cambodia",
    image: require("@/assets/images/stampo/cambodia.png"),
  },
} as const;

type Stamp = (typeof stamps)[keyof typeof stamps];
type PassportPage =
  | { id: string; type: "cover"; image: number; accessibilityLabel: string }
  | { id: string; type: "stamps"; slots: readonly (Stamp | null)[] };

const passportPages: readonly PassportPage[] = [
  {
    id: "front-cover",
    type: "cover",
    image: require("@/assets/images/other/passport-front.png"),
    accessibilityLabel: "Electronic passport front cover",
  },
  {
    id: "page-one",
    type: "stamps",
    slots: [stamps.unitedStates, stamps.canada, stamps.thailand, stamps.japan],
  },
  {
    id: "page-two",
    type: "stamps",
    slots: [stamps.southKorea, stamps.netherlands, stamps.france, stamps.turkey],
  },
  {
    id: "page-three",
    type: "stamps",
    slots: [stamps.mexico, stamps.singapore, stamps.malaysia, stamps.unitedArabEmirates],
  },
  {
    id: "page-four",
    type: "stamps",
    slots: [stamps.cambodia, null, null, null],
  },
  {
    id: "back-cover",
    type: "cover",
    image: require("@/assets/images/other/passport-back.png"),
    accessibilityLabel: "Passport back cover",
  },
] as const;

function StampPage({
  slots,
  width,
  height,
}: {
  slots: readonly (Stamp | null)[];
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.paper, { width, height }]}>
      <View style={styles.paperInner}>
        {slots.map((stamp, index) => (
          <View
            key={stamp?.id ?? `empty-${index}`}
            style={[styles.stampSlot, !stamp && styles.emptySlot]}
          >
            {stamp && (
              <Image
                source={stamp.image}
                style={styles.stampImage}
                contentFit="contain"
                accessibilityLabel={`${stamp.name} travel stamp`}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PassportScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [activePage, setActivePage] = useState(0);
  const listRef = useRef<FlatList<PassportPage>>(null);
  const pageWidth = Math.min(screenWidth - 36, 620);
  const pageHeight = Math.min(screenHeight - 190, pageWidth * 1.48);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setActivePage(Math.max(0, Math.min(nextPage, passportPages.length - 1)));
  };

  const sharePassport = async () => {
    await Share.share({ message: "My Stampo travel passport — 13 countries collected." });
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
                <Image
                  source={item.image}
                  style={{ width: pageHeight, height: pageHeight }}
                  contentFit="contain"
                  accessibilityLabel={item.accessibilityLabel}
                />
              ) : (
                <StampPage slots={item.slots} width={pageWidth} height={pageHeight} />
              )}
            </View>
          )}
        />

        <TouchableOpacity
          style={styles.shareButton}
          activeOpacity={0.72}
          onPress={sharePassport}
          accessibilityRole="button"
          accessibilityLabel="Share passport"
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
              accessibilityRole="button"
              accessibilityLabel={`Go to passport page ${index + 1}`}
            />
          ))}
        </View>
        <Text style={styles.pageCount}>
          {activePage + 1} / {passportPages.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  carouselArea: { flex: 1, position: "relative" },
  pageFrame: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  paper: {
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.paperBorder,
    borderRadius: 18,
    padding: 9,
    shadowColor: "#a8885a",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  paperInner: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2c99f",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    justifyContent: "space-between",
    rowGap: 8,
  },
  stampSlot: {
    width: "49%",
    height: "47%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  emptySlot: { borderWidth: 1.2, borderStyle: "dashed", borderColor: "#e5dbc8" },
  stampImage: { width: "100%", height: "100%" },
  shareButton: {
    position: "absolute",
    top: 24,
    right: 14,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(244,236,220,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  pagination: { height: 80, alignItems: "center", justifyContent: "flex-start", paddingTop: 5 },
  dots: { flexDirection: "row", alignItems: "center", gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dot },
  dotActive: { backgroundColor: colors.ink },
  pageCount: {
    marginTop: 9,
    color: colors.muted,
    fontFamily: "Lora_700Bold",
    fontSize: 20,
  },
});
