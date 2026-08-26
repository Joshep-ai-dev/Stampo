import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
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
      <Ionicons name={(focused ? on : off) as never} size={25} color={color} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: "#49B964",
        tabBarInactiveTintColor: BrandColors.onDarkMuted,
        tabBarLabelStyle: {
          fontSize: responsiveFontSize(11),
          fontWeight: "600",
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: BrandColors.greenDeep,
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
          title: "Add",
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
          tabBarActiveTintColor: "#49B964",
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
  iconWrap: {
    width: 40,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    width: 58,
    height: 58,
    marginTop: -20,
    borderRadius: 29,
    backgroundColor: BrandColors.mapGreen,
    borderWidth: 4,
    borderColor: BrandColors.greenDeep,
    alignItems: "center",
    justifyContent: "center",
  },
});
