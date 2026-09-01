import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import type { SightDetail } from "@/services/api";
import { ProgressivePlaceImage } from "./progressive-place-image";

export function PlaceSectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function FadingScrollList({ itemCount, children }: { itemCount: number; children: ReactNode }) {
  const scrollable = itemCount > 3;
  const [atBottom, setAtBottom] = useState(false);
  return (
    <View style={[s.scrollFrame, scrollable && s.scrollFrameOverflow]}>
      <ScrollView
        style={s.scroller}
        nestedScrollEnabled
        scrollEnabled={scrollable}
        showsVerticalScrollIndicator={scrollable}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
          setAtBottom(contentOffset.y + layoutMeasurement.height >= contentSize.height - 4);
        }}
      >
        {children}
      </ScrollView>
      {scrollable && !atBottom ? (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(3,29,20,0)", BrandColors.green]}
          locations={[0, 0.92]}
          style={s.bottomFade}
        />
      ) : null}
    </View>
  );
}

export function TopSightsSection({ sights, lockedSights = [], completedSightIds, onOpen, onToggle, upgrade }: {
  sights: SightDetail[];
  lockedSights?: SightDetail[];
  completedSightIds: string[];
  onOpen: (sight: SightDetail) => void;
  onToggle: (id: string, completed: boolean) => void;
  upgrade?: ReactNode;
}) {
  if (!sights.length && !lockedSights.length) return <><PlaceSectionTitle>Top Sights</PlaceSectionTitle><Text style={[s.empty, { marginHorizontal: 16 }]}>Top sights will appear here.</Text></>;
  return (
    <>
      <PlaceSectionTitle>Top Sights</PlaceSectionTitle>
      <View style={s.list}>
        <FadingScrollList itemCount={sights.length + lockedSights.length}>
          {sights.map((sight) => {
            const checked = sight.completed === true || completedSightIds.includes(sight.id);
            return (
              <TouchableOpacity key={sight.id} style={s.row} onPress={() => onOpen(sight)} accessibilityRole="button">
                <ProgressivePlaceImage uri={sight.image} style={s.image} contentFit="cover" />
                <Text style={s.name} numberOfLines={1}>{sight.name}</Text>
                <TouchableOpacity hitSlop={10} onPress={() => onToggle(sight.id, checked)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
                  <Ionicons name={checked ? "checkmark-circle" : "ellipse-outline"} size={28} color="#57D5A0" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
          {upgrade}
          {lockedSights.map((sight) => (
            <View key={sight.id} style={[s.row, s.locked]}>
              <ProgressivePlaceImage uri={sight.image} style={s.image} contentFit="cover" blurRadius={32} />
              <Text style={s.name} numberOfLines={1}>{sight.name}</Text>
              <Ionicons name="lock-closed" size={21} color={BrandColors.onDarkMuted} />
            </View>
          ))}
        </FadingScrollList>
      </View>
    </>
  );
}

export type PlaceListItem = { id: string; name: string; image?: string; detail: string };

function NavigablePlaceSection({ title, items, emptyText, onOpen }: { title: string; items: PlaceListItem[]; emptyText: string; onOpen: (item: PlaceListItem) => void }) {
  return (
    <>
      <PlaceSectionTitle>{title}</PlaceSectionTitle>
      <View style={s.list}>
        <FadingScrollList itemCount={items.length}>
          {items.length ? items.map((item) => (
            <TouchableOpacity key={item.id} style={s.row} onPress={() => onOpen(item)} accessibilityRole="button">
              {item.image ? <ProgressivePlaceImage uri={item.image} style={s.roundImage} contentFit="cover" /> : <View style={s.icon}><Ionicons name="map-outline" size={24} color={BrandColors.copper} /></View>}
              <View style={s.copy}><Text style={s.itemTitle} numberOfLines={1}>{item.name}</Text><Text style={s.detail} numberOfLines={1}>{item.detail}</Text></View>
              <Ionicons name="chevron-forward" size={20} color={BrandColors.onDarkMuted} />
            </TouchableOpacity>
          )) : <Text style={s.empty}>{emptyText}</Text>}
        </FadingScrollList>
      </View>
    </>
  );
}

export function StatesSection(props: Omit<Parameters<typeof NavigablePlaceSection>[0], "title">) {
  return <NavigablePlaceSection title="States" {...props} />;
}

export function CitiesVisitedSection(props: Omit<Parameters<typeof NavigablePlaceSection>[0], "title">) {
  return <NavigablePlaceSection title="Cities Visited" {...props} />;
}

const s = StyleSheet.create({
  sectionTitle: { marginTop: 23, marginBottom: 10, marginHorizontal: 17, fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(18), color: BrandColors.onDark },
  list: { marginHorizontal: 16, overflow: "hidden" },
  scrollFrame: { position: "relative" },
  scrollFrameOverflow: { height: 236 },
  scroller: { flexGrow: 0 },
  bottomFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 42 },
  row: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BrandColors.paleGreen },
  image: { width: 46, height: 46, borderRadius: 10, backgroundColor: BrandColors.greenPanel },
  roundImage: { width: 46, height: 46, borderRadius: 23, backgroundColor: BrandColors.greenPanel },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.greenPanel },
  name: { flex: 1, fontFamily: "Lora_500Medium", fontSize: responsiveFontSize(16), color: BrandColors.onDark },
  copy: { flex: 1 },
  itemTitle: { fontFamily: "Lora_600SemiBold", fontSize: responsiveFontSize(16), color: BrandColors.onDark },
  detail: { marginTop: 2, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(12), color: BrandColors.onDarkMuted },
  empty: { fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
  locked: { opacity: 0.5 },
});
