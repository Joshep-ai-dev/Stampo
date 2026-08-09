import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { BrandColors } from "@/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: BrandColors.copper,
        tabBarInactiveTintColor: "#9A806B",
        tabBarActiveBackgroundColor: "rgba(215,146,95,0.10)",
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: "600",
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: "#081B14",
          borderTopColor: BrandColors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 72,
          paddingTop: 7,
          paddingBottom: 7,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={StyleSheet.compose(styles.iconWrap, focused)}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={25}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <View style={StyleSheet.compose(styles.iconWrap, focused)}>
              <Ionicons
                name={focused ? "globe" : "globe-outline"}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: "Add",
          tabBarLabel: "",
          tabBarIcon: () => (
            <View style={styles.add}>
              <Ionicons name="add" size={34} color={BrandColors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: "Passport",
          tabBarIcon: ({ color, focused }) => (
            <View style={StyleSheet.compose(styles.iconWrap, focused)}>
              <Ionicons
                name={focused ? "book" : "book-outline"}
                size={25}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={StyleSheet.compose(styles.iconWrap, focused)}>
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={25}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    width: 56,
    height: 56,
    marginTop: -20,
    borderRadius: 28,
    backgroundColor: "#32A852",
    borderWidth: 4,
    borderColor: "#081B14",
    alignItems: "center",
    justifyContent: "center",
  },
});
