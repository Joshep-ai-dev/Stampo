import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BrandColors } from "@/constants/theme";

export function DetailModal({
  visible,
  title,
  location,
  description,
  image,
  children,
  locked = false,
  unlockContent,
  onClose,
}: {
  visible: boolean;
  title: string;
  location?: string;
  description: string;
  image: ReactNode;
  children?: ReactNode;
  locked?: boolean;
  unlockContent?: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={`Close ${title} details`}
        />
        <View style={s.card} accessibilityViewIsModal>
          <TouchableOpacity
            style={s.close}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={21} color={BrandColors.copper} />
          </TouchableOpacity>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={s.content}>
              {image}
              <Text style={s.title}>{title}</Text>
              {location ? <Text style={s.location}>{location}</Text> : null}
              <Text style={s.description}>{description}</Text>
              {children}
              {locked ? (
                <BlurView
                  intensity={70}
                  tint="dark"
                  experimentalBlurMethod="dimezisBlurView"
                  pointerEvents="none"
                  style={s.blur}
                />
              ) : null}
            </View>
          </ScrollView>
          {locked && unlockContent ? (
            <View style={s.unlock}>{unlockContent}</View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3,29,20,.78)",
  },
  card: {
    width: "100%",
    maxWidth: 390,
    maxHeight: "88%",
    padding: 18,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: BrandColors.copper,
    alignItems: "center",
    backgroundColor: BrandColors.greenPanel,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  content: {
    width: "100%",
    alignItems: "center",
    borderRadius: 16,
  },
  scroll: {
    width: "100%",
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  blur: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  title: {
    marginTop: 16,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(25),
    textAlign: "center",
    color: BrandColors.copper,
  },
  location: {
    marginTop: 5,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDarkMuted,
  },
  description: {
    marginTop: 13,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: 22,
    textAlign: "center",
    color: BrandColors.onDark,
  },
  unlock: { width: "100%", marginTop: 2 },
  close: {
    position: "absolute",
    top: 9,
    right: 9,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BrandColors.copper,
    backgroundColor: BrandColors.greenDeep,
  },
});
