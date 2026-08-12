import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { api, type CityDetail } from "@/services/api";

export default function CityScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [city, setCity] = useState<CityDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    setError("");
    let attempts = 0;
    const load = () =>
      api
        .cityDetail(id)
        .then((value) => {
          if (!active) return;
          setCity(value);
          const imagesPending =
            !value.image || (value.sights ?? []).some((sight) => !sight.image);
          if (imagesPending && attempts++ < 24)
            refresh = setTimeout(load, 2_500);
        })
        .catch((e) => active && setError(e.message));
    void load();
    return () => {
      active = false;
      if (refresh) clearTimeout(refresh);
    };
  }, [id]);
  if (!city)
    return (
      <SafeAreaView style={s.safe}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={25} color={BrandColors.onDark} />
        </TouchableOpacity>
        <View style={s.center}>
          {error ? (
            <Text style={s.error}>{error}</Text>
          ) : (
            <ActivityIndicator color={BrandColors.copper} />
          )}
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <ProgressivePlaceImage
            uri={city.image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={s.shade} />
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={25}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
          <View style={s.heroCopy}>
            <Text style={s.title}>{city.name}</Text>
            <Text style={s.coords}>
              {city.latitude.toFixed(3)}, {city.longitude.toFixed(3)}
            </Text>
          </View>
        </View>
        <View style={s.panel}>
          <Text style={s.description}>
            {city.description || "A featured destination ready to explore."}
          </Text>
          <Text style={s.population}>
            Population · {city.population.toLocaleString()}
          </Text>
        </View>
        <Text style={s.heading}>Famous Sights</Text>
        {(city.sights ?? []).map((sight) => (
          <TouchableOpacity
            key={sight.id}
            style={s.row}
            onPress={() => router.push(`/sight/${sight.id}` as never)}
          >
            <ProgressivePlaceImage
              uri={sight.image}
              style={s.thumb}
              contentFit="cover"
            />
            <View style={s.rowCopy}>
              <Text style={s.rowTitle}>{sight.name}</Text>
              <Text style={s.meta}>{sight.category}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={BrandColors.copper}
            />
          </TouchableOpacity>
        ))}
        {!city.sights?.length ? (
          <Text style={s.empty}>No imported sights yet.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 40 },
  hero: { height: 280, overflow: "hidden" },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,29,20,.35)",
  },
  back: {
    position: "absolute",
    zIndex: 2,
    left: 16,
    top: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(49,87,73,.75)",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: "Lora_500Medium", color: BrandColors.onDarkMuted },
  heroCopy: { position: "absolute", left: 18, bottom: 20 },
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 36,
    color: BrandColors.onDark,
  },
  coords: {
    marginTop: 4,
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  panel: {
    margin: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    borderRadius: 13,
    backgroundColor: "rgba(10,43,32,.2)",
  },
  description: {
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: BrandColors.onDark,
  },
  population: {
    marginTop: 10,
    fontFamily: "Lora_600SemiBold",
    color: BrandColors.copper,
  },
  heading: {
    margin: 16,
    fontFamily: "Lora_600SemiBold",
    fontSize: 21,
    color: BrandColors.onDark,
  },
  row: {
    minHeight: 72,
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: BrandColors.paleGreen,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: BrandColors.greenPanel,
  },
  rowCopy: { flex: 1 },
  rowTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    color: BrandColors.onDark,
  },
  meta: {
    marginTop: 3,
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
  empty: {
    marginHorizontal: 16,
    fontFamily: "Lora_400Regular_Italic",
    color: BrandColors.onDarkMuted,
  },
});
