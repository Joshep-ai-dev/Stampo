import { Tabs } from "expo-router";
import { Image, StyleSheet } from "react-native";
import { SvgUri } from "react-native-svg";

import { HapticTab } from "@/components/haptic-tab";
import { BrandColors } from "@/constants/theme";

const tabs = [
  {
    id: "globe",
    route: "index",
    label: "Globe",
    icon: require("@/assets/images/svg/globe.svg"),
  },
  {
    id: "passport",
    route: "passport",
    label: "Passport",
    icon: require("@/assets/images/svg/passport.svg"),
  },
  {
    id: "visits",
    route: "visits",
    label: "Visits",
    icon: require("@/assets/images/svg/profile-medal.svg"),
  },
] as const;

function TabIcon({ source, color }: { source: number; color: string }) {
  return (
    <SvgUri
      uri={Image.resolveAssetSource(source).uri}
      width={styles.tabIcon.width}
      height={styles.tabIcon.height}
      color={color}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: BrandColors.green,
        tabBarInactiveTintColor: BrandColors.muted,
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: "600",
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: BrandColors.surface,
          borderTopColor: BrandColors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 72,
          paddingTop: 7,
          paddingBottom: 7,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.id}
          name={tab.route}
          options={{
            title: tab.label,
            tabBarIcon: ({ color }) => (
              <TabIcon source={tab.icon} color={color} />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 29,
    height: 29,
  },
});
