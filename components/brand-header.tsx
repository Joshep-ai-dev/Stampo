import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { BrandColors } from "@/constants/theme";

export function BrandHeader({
  onNotifications,
}: {
  onNotifications?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Image
        source={require("@/assets/images/kroo-logo.png")}
        style={styles.logo}
        contentFit="contain"
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={10}
        style={styles.bell}
        onPress={
          onNotifications ??
          (() =>
            Alert.alert(
              "Notifications",
              "You’re all caught up. New stamps, rewards, and travel activity will appear here.",
            ))
        }
      >
        <Ionicons
          name="notifications-outline"
          size={27}
          color={BrandColors.copper}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 4,
  },
  logo: { width: 132, height: 52 },
  bell: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
