import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { api } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  languageChanged,
  nameChanged,
  photoChanged,
} from "@/store/profile-slice";

const colors = {
  background: BrandColors.canvas,
  card: BrandColors.surface,
  ink: BrandColors.ink,
  muted: BrandColors.muted,
  chevron: BrandColors.copper,
  divider: BrandColors.line,
};

type ProfileRow = {
  id: string;
  label: string;
  value?: string;
  description?: string;
};

type ProfileSection = {
  id: string;
  title: string;
  rows: readonly ProfileRow[];
};

const profileSections: readonly ProfileSection[] = [
  {
    id: "membership",
    title: "Membership",
    rows: [
      { id: "kroo-plus", label: "Kroo+" },
      { id: "gift-kroo-plus", label: "Gift a membership" },
    ],
  },
  {
    id: "personal-info",
    title: "Personal Info",
    rows: [{ id: "name", label: "Name", value: "Robb" }],
  },
  {
    id: "settings",
    title: "Settings",
    rows: [{ id: "language", label: "Language", value: "English" }],
  },
  {
    id: "account",
    title: "Account",
    rows: [
      {
        id: "sign-up",
        label: "Sign Up",
        description:
          "Create an account to upload this device data to the cloud.",
      },
      {
        id: "sign-in",
        label: "Sign in to existing account",
        description:
          "Sign in to sync the travel data on this device with your Kroo account.",
      },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    rows: [
      { id: "contact", label: "Contact Us" },
      { id: "privacy", label: "Privacy Policy" },
      { id: "terms", label: "Terms of Service" },
    ],
  },
];

function SettingsRow({
  row,
  isLast,
  onPress,
}: {
  row: ProfileRow;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        row.description && styles.multilineRow,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      onPress={onPress}
      accessibilityLabel={row.value ? `${row.label}, ${row.value}` : row.label}
    >
      <View style={styles.rowContent}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          {row.description && (
            <Text style={styles.rowDescription}>{row.description}</Text>
          )}
        </View>
        {row.value && <Text style={styles.rowValue}>{row.value}</Text>}
        <Ionicons name="chevron-forward" size={25} color={colors.chevron} />
      </View>
      {!isLast && <View style={styles.divider} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.profile);
  const [activeRow, setActiveRow] = useState<ProfileRow | null>(null);
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const sections = useMemo(
    () =>
      profileSections.map((section) => ({
        ...section,
        rows: section.rows.map((row) =>
          row.id === "name"
            ? { ...row, value: profile.name }
            : row.id === "language"
              ? { ...row, value: profile.language }
              : row,
        ),
      })),
    [profile],
  );

  const openRow = (row: ProfileRow) => {
    if (row.id === "kroo-plus") {
      router.push("/kroo-plus" as never);
      return;
    }
    if (row.id === "gift-kroo-plus") {
      router.push("/gift-kroo-plus" as never);
      return;
    }
    setActiveRow(row);
    setDraft(row.value ?? "");
    setEmail("");
    setPassword("");
  };

  const closeModal = () => setActiveRow(null);

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!profile.isSignedIn) {
      dispatch(photoChanged(asset.uri));
      return;
    }
    try {
      const uploaded = await api.uploadProfileImage(asset);
      dispatch(photoChanged(uploaded.photoUri));
    } catch (error) {
      Alert.alert(
        "Photo not uploaded",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const socialSignIn = (provider: "Google" | "Apple") => {
    Alert.alert(
      `${provider} sign-in`,
      `${provider} credentials and the secure backend token-exchange endpoint need to be connected before sign-in can go live.`,
    );
  };

  const saveModal = () => {
    if (!activeRow) return;
    if (activeRow.id === "name") {
      const nextProfile = { ...profile, name: draft.trim() || profile.name };
      dispatch(nameChanged(nextProfile.name));
      void api.updateProfile(nextProfile).catch(() => undefined);
    }
    if (activeRow.id === "sign-up") {
      void api
        .signUp({ name: profile.name, email, password })
        .catch(() => undefined);
    }
    if (activeRow.id === "sign-in") {
      void api.signIn({ email, password }).catch(() => undefined);
    }
    closeModal();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.headerSubtitle}>Your explorer identity</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => void pickProfilePhoto()}
            accessibilityRole="button"
            accessibilityLabel="Choose profile picture"
          >
            {profile.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={34} color={BrandColors.white} />
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={13} color={BrandColors.white} />
            </View>
          </TouchableOpacity>
        </View>

        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, index) => (
                <SettingsRow
                  key={row.id}
                  row={row}
                  isLast={index === section.rows.length - 1}
                  onPress={() => openRow(row)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={activeRow !== null}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={closeModal}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{activeRow?.label}</Text>
              <View style={styles.modalSpacer} />
            </View>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {activeRow?.id === "name" && (
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  style={styles.input}
                  placeholder="Name"
                  autoFocus
                />
              )}
              {activeRow?.id === "language" && (
                <View style={styles.languageList}>
                  {["English", "Spanish", "French", "Japanese", "Chinese"].map(
                    (language) => (
                      <Pressable
                        key={language}
                        style={styles.languageRow}
                        onPress={() => {
                          dispatch(languageChanged(language));
                          void api
                            .updateProfile({ ...profile, language })
                            .catch(() => undefined);
                          closeModal();
                        }}
                      >
                        <Text style={styles.languageText}>{language}</Text>
                        {profile.language === language && (
                          <Ionicons
                            name="checkmark"
                            size={24}
                            color={colors.ink}
                          />
                        )}
                      </Pressable>
                    ),
                  )}
                </View>
              )}
              {(activeRow?.id === "sign-up" || activeRow?.id === "sign-in") && (
                <>
                  <TouchableOpacity
                    style={[styles.socialButton, styles.googleButton]}
                    onPress={() => socialSignIn("Google")}
                  >
                    <Ionicons name="logo-google" size={21} color={colors.ink} />
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </TouchableOpacity>
                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      style={[styles.socialButton, styles.appleButton]}
                      onPress={() => socialSignIn("Apple")}
                    >
                      <Ionicons
                        name="logo-apple"
                        size={22}
                        color={BrandColors.white}
                      />
                      <Text style={styles.appleText}>Continue with Apple</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.orRow}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>or use email</Text>
                    <View style={styles.orLine} />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry
                  />
                </>
              )}
              {activeRow &&
                ["contact", "privacy", "terms"].includes(activeRow.id) && (
                  <Text style={styles.legalText}>
                    {activeRow.id === "contact"
                      ? "Contact support@stampo.app. This endpoint can be replaced by your Laravel support API."
                      : `${activeRow.label} content will be served by the Laravel backend when it is available.`}
                  </Text>
                )}
              {activeRow &&
                ["name", "sign-up", "sign-in"].includes(activeRow.id) && (
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveModal}
                  >
                    <Text style={styles.saveText}>
                      {activeRow.id === "name" ? "SAVE" : "CONTINUE"}
                    </Text>
                  </TouchableOpacity>
                )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 44 },
  header: {
    height: 105,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(40),
    color: BrandColors.onDark,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDarkMuted,
  },
  avatarButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: BrandColors.green,
    borderWidth: 3,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 33 },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BrandColors.copper,
    borderWidth: 2,
    borderColor: BrandColors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginTop: 22 },
  sectionTitle: {
    marginLeft: 4,
    marginBottom: 9,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(18),
    color: BrandColors.onDarkMuted,
  },
  card: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BrandColors.line,
  },
  row: { minHeight: 64, paddingHorizontal: 16 },
  multilineRow: { minHeight: 112 },
  rowPressed: { backgroundColor: BrandColors.surfaceSoft },
  rowContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { flex: 1, paddingVertical: 14 },
  rowLabel: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(25),
    color: colors.ink,
  },
  rowDescription: {
    marginTop: 3,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(16),
    lineHeight: 23,
    color: colors.muted,
  },
  rowValue: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(23),
    color: colors.muted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 0,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30,22,17,0.32)",
  },
  sheet: {
    minHeight: "52%",
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  modalHeader: {
    height: 72,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  cancel: {
    width: 75,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(16),
    color: colors.ink,
  },
  modalTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(21),
    color: colors.ink,
  },
  modalSpacer: { width: 75 },
  modalContent: { padding: 20, gap: 14, paddingBottom: 40 },
  input: {
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 15,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(17),
    color: colors.ink,
  },
  socialButton: {
    height: 56,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleButton: {
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.line,
  },
  appleButton: { backgroundColor: "#111111" },
  googleText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    color: colors.ink,
  },
  appleText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    color: BrandColors.white,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  orText: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    color: colors.muted,
  },
  languageList: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  languageRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  languageText: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(18),
    color: colors.ink,
  },
  legalText: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(17),
    lineHeight: 27,
    color: colors.muted,
  },
  saveButton: {
    height: 56,
    borderRadius: 10,
    backgroundColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(19),
    letterSpacing: 1,
    color: "#fffaf1",
  },
});
