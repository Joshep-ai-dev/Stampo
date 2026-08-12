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
import { api, type SightDetail } from "@/services/api";
export default function SightScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [sight, setSight] = useState<SightDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const load = () =>
      api
        .sightDetail(id)
        .then((value) => {
          if (!active) return;
          setSight(value);
          if (!value.image && attempts++ < 24)
            refresh = setTimeout(load, 2_500);
        })
        .catch((e) => active && setError(e.message));
    void load();
    return () => {
      active = false;
      if (refresh) clearTimeout(refresh);
    };
  }, [id]);
  if (!sight)
    return (
      <SafeAreaView style={s.safe}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={25} color={BrandColors.onDark} />
        </TouchableOpacity>
        <View style={s.center}>
          {error ? (
            <Text style={s.muted}>{error}</Text>
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
            uri={sight.image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={25}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
        </View>
        <View style={s.panel}>
          <Text style={s.title}>{sight.name}</Text>
          <TouchableOpacity
            onPress={() => router.push(`/city/${sight.cityId}` as never)}
          >
            <Text style={s.city}>⌖ {sight.city}</Text>
          </TouchableOpacity>
          <Text style={s.description}>
            {sight.description || "A famous attraction ready to explore."}
          </Text>
          <Text style={s.meta}>
            {sight.category} · {sight.latitude.toFixed(4)},{" "}
            {sight.longitude.toFixed(4)}
          </Text>
          {sight.imageCredit ? (
            <View style={s.credit}>
              <Text style={s.creditTitle}>Image credit</Text>
              <Text style={s.muted}>
                {sight.imageCredit.attribution ||
                  [sight.imageCredit.creator, sight.imageCredit.license]
                    .filter(Boolean)
                    .join(" · ")}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 40 },
  hero: { height: 330, backgroundColor: BrandColors.greenPanel },
  back: {
    position: "absolute",
    left: 16,
    top: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(49,87,73,.8)",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  panel: {
    margin: 14,
    padding: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,.2)",
  },
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    color: BrandColors.onDark,
  },
  city: {
    marginTop: 6,
    fontFamily: "Lora_600SemiBold",
    fontSize: 15,
    color: BrandColors.copper,
  },
  description: {
    marginTop: 14,
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: BrandColors.onDark,
  },
  meta: {
    marginTop: 14,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
  credit: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: BrandColors.paleGreen,
  },
  creditTitle: { fontFamily: "Lora_600SemiBold", color: BrandColors.onDark },
  muted: {
    marginTop: 4,
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
});
