import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BrandColors } from "@/constants/theme";
import type { CountryRecord } from "@/data/cities";
import { stampAssets } from "@/data/stamps";

const UNVISITED_STAMP = "#AAB5AF";

export const CountryStampCard = memo(function CountryStampCard({
  country,
  cityCount,
  onPress,
  width = 156,
}: {
  country: CountryRecord;
  cityCount: number;
  onPress: () => void;
  width?: number;
}) {
  const isVisited = cityCount > 0;
  const stamp = stampAssets[country.code];

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[styles.card, { width }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${country.name}, ${
        isVisited
          ? `${cityCount} visited ${cityCount === 1 ? "city" : "cities"}`
          : "not visited"
      }`}
    >
      <View style={styles.header}>
        <Text style={styles.flag}>{country.flag}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {country.name}
        </Text>
      </View>
      <View style={styles.stampFrame}>
        {stamp ? (
          <Image
            source={stamp}
            style={[styles.stamp, !isVisited && styles.unvisitedStamp]}
            contentFit="contain"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons
              name="earth-outline"
              size={43}
              color={isVisited ? BrandColors.green : UNVISITED_STAMP}
            />
          </View>
        )}
      </View>
      <Text style={[styles.status, !isVisited && styles.notVisited]}>
        {isVisited
          ? `${cityCount} ${cityCount === 1 ? "City" : "Cities"}`
          : "Not visited"}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    height: 240,
    width: 184,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 9,
    borderRadius: 12,
    backgroundColor: BrandColors.surface,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#C5A36C",
  },
  header: {
    width: "100%",
    height: 24,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
  },
  flag: { fontSize: 16 },
  name: {
    fontFamily: "Lora_500Medium",
    fontSize: 14,
    color: BrandColors.green,
    flexShrink: 1,
  },
  stampFrame: {
    width: 144,
    height: 164,
    marginTop: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stamp: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.2 }],
  },
  unvisitedStamp: {
    opacity: 0.48,
    filter: [{ grayscale: 1 }],
  },
  placeholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  status: {
    marginTop: 7,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.muted,
  },
  notVisited: { color: BrandColors.muted },
});
