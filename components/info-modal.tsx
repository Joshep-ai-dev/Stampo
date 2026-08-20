import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { BrandColors } from "@/constants/theme";

type InfoModalProps = {
  visible: boolean;
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onClose: () => void;
};

export function InfoModal({ visible, title, body, icon = "information-circle-outline", onClose }: InfoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close information" />
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={28} color={BrandColors.copper} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} accessibilityRole="button">
            <Text style={styles.buttonText}>GOT IT</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(0,10,7,.72)" },
  panel: { width: "100%", maxWidth: 360, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 22, alignItems: "center", borderWidth: 1, borderColor: BrandColors.copper, borderRadius: 8, backgroundColor: BrandColors.greenPanel },
  iconCircle: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 27, borderWidth: 1, borderColor: BrandColors.copper },
  title: { marginTop: 17, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: 24, color: BrandColors.onDark },
  body: { marginTop: 10, textAlign: "center", fontFamily: "Lora_400Regular", fontSize: 15, lineHeight: 23, color: BrandColors.onDarkMuted },
  button: { width: "100%", height: 50, marginTop: 22, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: BrandColors.copper },
  buttonPressed: { opacity: 0.8 },
  buttonText: { fontFamily: "Roboto_900Black", fontSize: 14, letterSpacing: 1.2, color: BrandColors.green },
});
