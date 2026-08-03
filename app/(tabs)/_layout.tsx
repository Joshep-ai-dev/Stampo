import { Tabs } from "expo-router";
import { Image, StyleSheet } from "react-native";
import { SvgUri } from "react-native-svg";

// eslint-disable-next-line import/no-unresolved
import { HapticTab } from "@/components/haptic-tab";

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
    id: "profile",
    route: "profile",
    label: "Profile",
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
        tabBarActiveTintColor: "#2b211a",
        tabBarInactiveTintColor: "#9b9b9b",
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: "600",
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: "#f4ecdc",
          borderTopColor: "#ded4c2",
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 29,
    height: 29,
  },
});
