import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
        tabBarActiveTintColor: BrandColors.green,
        tabBarInactiveTintColor: BrandColors.muted,
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
      <Tabs.Screen name="index" options={{title:"Home",tabBarIcon:({color})=><Ionicons name="home-outline" size={26} color={color}/>}} />
      <Tabs.Screen name="explore" options={{title:"Explore",tabBarIcon:({color})=><Ionicons name="globe-outline" size={27} color={color}/>}} />
      <Tabs.Screen name="visits" options={{title:"Add",tabBarLabel:"",tabBarIcon:()=> <View style={styles.add}><Ionicons name="add" size={34} color={BrandColors.white}/></View>}} />
      <Tabs.Screen name="passport" options={{title:"Passport",tabBarIcon:({color})=><Ionicons name="book-outline" size={26} color={color}/>}} />
      <Tabs.Screen name="profile" options={{title:"Profile",tabBarIcon:({color})=><Ionicons name="person-outline" size={26} color={color}/>}} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  add:{width:56,height:56,marginTop:-20,borderRadius:28,backgroundColor:"#32A852",borderWidth:4,borderColor:"#081B14",alignItems:"center",justifyContent:"center"}
});
