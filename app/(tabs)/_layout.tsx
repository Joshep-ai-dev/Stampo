import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { BrandColors } from "@/constants/theme";

function Icon({
  focused,
  color,
  on,
  off,
}: {
  focused: boolean;
  color: string;
  on: string;
  off: string;
}) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={(focused ? on : off) as never} size={28} color={color} />
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: BrandColors.white,
        tabBarInactiveTintColor: BrandColors.onDarkMuted,
        tabBarLabelStyle: {
          fontSize: responsiveFontSize(11),
          fontFamily: "Lora_500Medium",
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: "#00271C",
          borderTopColor: BrandColors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 68 + Math.max(insets.bottom, 8),
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Icon
              focused={focused}
              color={color}
              on="home"
              off="home-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <Icon
              focused={focused}
              color={color}
              on="globe"
              off="globe-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: "Kroo+",
          tabBarLabel: "",
          tabBarIcon: () => (
            <View style={styles.add}>
              <Ionicons name="add" size={36} color={BrandColors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Social",
          tabBarActiveTintColor: BrandColors.white,
          tabBarInactiveTintColor: BrandColors.copper,
          tabBarIcon: ({ color, focused }) => (
            <Icon
              focused={focused}
              color={color}
              on="people"
              off="people-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: "Passport",
          tabBarIcon: ({ color, focused }) => (
            <Icon
              focused={focused}
              color={color}
              on="book"
              off="book-outline"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    position: "absolute",
    bottom: -24,
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: BrandColors.copper,
  },
  iconWrap: {
    width: 40,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    width: 68,
    height: 68,
    marginTop: -20,
    borderRadius: 34,
    backgroundColor: BrandColors.mapGreen,
    borderWidth: 4,
    borderColor: BrandColors.greenDeep,
    alignItems: "center",
    justifyContent: "center",
  },
});
