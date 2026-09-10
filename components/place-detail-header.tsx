import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";

type PlaceDetailHeaderProps = {
  title: string;
  onBack: () => void;
  flagEmoji?: string;
  flagUri?: string;
  flagLabel?: string;
};

export function PlaceDetailHeader({
  title,
  onBack,
  flagEmoji,
  flagUri,
  flagLabel,
}: PlaceDetailHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={25} color={BrandColors.copper} />
      </TouchableOpacity>
      <View style={styles.titleRow}>
        {flagUri ? (
          <Image
            source={{ uri: flagUri }}
            style={styles.flagImage}
            contentFit="cover"
            accessibilityLabel={flagLabel}
          />
        ) : flagEmoji ? (
          <Text style={styles.flagEmoji}>{flagEmoji}</Text>
        ) : null}
        <Text
          style={styles.title}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(49,87,73,.56)",
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flagImage: {
    width: 30,
    height: 22,
    borderRadius: 2,
    backgroundColor: BrandColors.greenPanel,
  },
  flagEmoji: { fontSize: responsiveFontSize(23) },
  title: {
    flexShrink: 1,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(25),
    lineHeight: responsiveFontSize(31),
    color: BrandColors.white,
  },
  spacer: { width: 42, height: 42 },
});
