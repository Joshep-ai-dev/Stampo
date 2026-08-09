import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BrandColors } from "@/constants/theme";
import type { PlaceSuggestion } from "@/data/place-suggestions";
import type { Visit } from "@/store/travel-slice";

type Props = {
  visit: Visit;
  showCountry?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  suggestions?: PlaceSuggestion[];
  onSuggestionPress?: (suggestion: PlaceSuggestion) => void;
};

export function VisitedCityCard({
  visit,
  showCountry = true,
  actionLabel = "OPEN",
  onAction,
  suggestions = [],
  onSuggestionPress,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const sights = visit.places.filter((place) => place.type === "sight");
  const airports = visit.places.filter((place) => place.type === "airport");
  const logged = new Set(
    visit.places.map((place) => `${place.type}:${place.name.toLocaleLowerCase()}`),
  );

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.summary}
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.pin}>
          <Ionicons name="location" size={20} color={BrandColors.white} />
        </View>
        <View style={styles.heading}>
          <Text style={styles.city} numberOfLines={1}>{visit.cityName}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {showCountry ? `${visit.country} · ` : ""}{visit.visitedAt}
          </Text>
        </View>
        {onAction && (
          <TouchableOpacity style={styles.action} onPress={onAction}>
            <Ionicons name="add" size={15} color={BrandColors.white} />
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={21}
          color={BrandColors.copperDark}
        />
      </Pressable>

      <View style={styles.counts}>
        <View style={styles.countItem}>
          <Ionicons name="camera-outline" size={16} color={BrandColors.copperDark} />
          <Text style={styles.countText}>{sights.length} {sights.length === 1 ? "sight" : "sights"}</Text>
        </View>
        <View style={styles.countItem}>
          <Ionicons name="airplane-outline" size={16} color={BrandColors.copperDark} />
          <Text style={styles.countText}>{airports.length} {airports.length === 1 ? "airport" : "airports"}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.details}>
          {!!visit.note && (
            <View style={styles.note}>
              <Ionicons name="document-text-outline" size={17} color={BrandColors.copperDark} />
              <Text style={styles.noteText}>{visit.note}</Text>
            </View>
          )}
          {visit.places.map((place) => (
            <View key={place.id} style={styles.place}>
              <Ionicons name={place.type === "airport" ? "airplane" : "camera"} size={16} color={BrandColors.copperDark} />
              <Text style={styles.placeText}>{place.name}</Text>
            </View>
          ))}
          {suggestions.length > 0 && (
            <>
              <Text style={styles.suggestionTitle}>Tap to mark visited</Text>
              <View style={styles.chips}>
                {suggestions.map((suggestion) => {
                  const selected = logged.has(`${suggestion.type}:${suggestion.name.toLocaleLowerCase()}`);
                  return (
                    <Pressable
                      key={`${suggestion.type}-${suggestion.name}`}
                      disabled={selected}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => onSuggestionPress?.(suggestion)}
                    >
                      <Ionicons name={selected ? "checkmark" : "add"} size={14} color={selected ? BrandColors.white : BrandColors.ink} />
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{suggestion.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 13, backgroundColor: BrandColors.surface, borderWidth: 1, borderColor: BrandColors.line },
  summary: { flexDirection: "row", alignItems: "center", gap: 9 },
  pin: { width: 38, height: 38, borderRadius: 19, backgroundColor: BrandColors.copper, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, minWidth: 0 },
  city: { fontFamily: "Lora_600SemiBold", fontSize: 20, color: BrandColors.ink },
  meta: { marginTop: 1, fontFamily: "Lora_400Regular", fontSize: 11, color: BrandColors.muted },
  action: { height: 30, borderRadius: 15, paddingHorizontal: 9, backgroundColor: BrandColors.copper, flexDirection: "row", alignItems: "center", gap: 2 },
  actionText: { fontFamily: "Lora_700Bold", fontSize: 9, color: BrandColors.white },
  counts: { marginTop: 10, marginLeft: 47, flexDirection: "row", gap: 14 },
  countItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  countText: { fontFamily: "Lora_600SemiBold", fontSize: 11, color: BrandColors.copperDark },
  details: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BrandColors.line, gap: 8 },
  note: { padding: 10, borderRadius: 10, backgroundColor: BrandColors.surfaceSoft, flexDirection: "row", alignItems: "flex-start", gap: 7 },
  noteText: { flex: 1, fontFamily: "Lora_400Regular_Italic", fontSize: 12, lineHeight: 17, color: BrandColors.ink },
  place: { flexDirection: "row", alignItems: "center", gap: 7 },
  placeText: { flex: 1, fontFamily: "Lora_500Medium", fontSize: 12, color: BrandColors.ink },
  suggestionTitle: { marginTop: 4, fontFamily: "Lora_700Bold", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", color: BrandColors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { minHeight: 30, borderRadius: 15, borderWidth: 1, borderColor: BrandColors.line, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 3 },
  chipSelected: { backgroundColor: BrandColors.green, borderColor: BrandColors.green },
  chipText: { fontFamily: "Lora_500Medium", fontSize: 10, color: BrandColors.ink },
  chipTextSelected: { color: BrandColors.white },
});
