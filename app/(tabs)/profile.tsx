import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
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

import { api } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { languageChanged, nameChanged } from "@/store/profile-slice";

const colors = {
  background: "#f4ecdc",
  card: "#fffcf6",
  ink: "#2e251f",
  muted: "#a59b8f",
  chevron: "#bdb6ad",
  divider: "#e5ddd1",
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
          "Use cloud data from your account. Local data on this device will be discarded. Please contact us if you would like to merge local and cloud data.",
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

function SettingsRow({ row, isLast, onPress }: { row: ProfileRow; isLast: boolean; onPress: () => void }) {
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
    setActiveRow(row);
    setDraft(row.value ?? "");
    setEmail("");
    setPassword("");
  };

  const closeModal = () => setActiveRow(null);

  const saveModal = () => {
    if (!activeRow) return;
    if (activeRow.id === "name") {
      const nextProfile = { ...profile, name: draft.trim() || profile.name };
      dispatch(nameChanged(nextProfile.name));
      void api.updateProfile(nextProfile).catch(() => undefined);
    }
    if (activeRow.id === "sign-up") {
      void api.signUp({ name: profile.name, email, password }).catch(() => undefined);
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
          <Text style={styles.title}>Profile</Text>
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

      <Modal visible={activeRow !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={closeModal}><Text style={styles.cancel}>Cancel</Text></Pressable>
              <Text style={styles.modalTitle}>{activeRow?.label}</Text>
              <View style={styles.modalSpacer} />
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {activeRow?.id === "name" && (
                <TextInput value={draft} onChangeText={setDraft} style={styles.input} placeholder="Name" autoFocus />
              )}
              {activeRow?.id === "language" && (
                <View style={styles.languageList}>
                  {["English", "Spanish", "French", "Japanese", "Chinese"].map((language) => (
                    <Pressable
                      key={language}
                      style={styles.languageRow}
                      onPress={() => {
                        dispatch(languageChanged(language));
                        void api.updateProfile({ ...profile, language }).catch(() => undefined);
                        closeModal();
                      }}
                    >
                      <Text style={styles.languageText}>{language}</Text>
                      {profile.language === language && <Ionicons name="checkmark" size={24} color={colors.ink} />}
                    </Pressable>
                  ))}
                </View>
              )}
              {(activeRow?.id === "sign-up" || activeRow?.id === "sign-in") && (
                <>
                  <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
                  <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="Password" secureTextEntry />
                </>
              )}
              {activeRow && ["contact", "privacy", "terms"].includes(activeRow.id) && (
                <Text style={styles.legalText}>
                  {activeRow.id === "contact"
                    ? "Contact support@stampo.app. This endpoint can be replaced by your Laravel support API."
                    : `${activeRow.label} content will be served by the Laravel backend when it is available.`}
                </Text>
              )}
              {activeRow && ["name", "sign-up", "sign-in"].includes(activeRow.id) && (
                <TouchableOpacity style={styles.saveButton} onPress={saveModal}>
                  <Text style={styles.saveText}>{activeRow.id === "name" ? "SAVE" : "CONTINUE"}</Text>
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
  },
  title: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 40,
    color: colors.ink,
  },
  section: { marginTop: 22 },
  sectionTitle: {
    marginLeft: 4,
    marginBottom: 9,
    fontFamily: "Lora_400Regular",
    fontSize: 18,
    color: colors.muted,
  },
  card: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee7dc",
  },
  row: { minHeight: 64, paddingHorizontal: 16 },
  multilineRow: { minHeight: 112 },
  rowPressed: { backgroundColor: "#f7f1e8" },
  rowContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { flex: 1, paddingVertical: 14 },
  rowLabel: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 25,
    color: colors.ink,
  },
  rowDescription: {
    marginTop: 3,
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
  },
  rowValue: {
    fontFamily: "Lora_400Regular",
    fontSize: 23,
    color: colors.muted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 0,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(30,22,17,0.32)" },
  sheet: { minHeight: "52%", maxHeight: "88%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.card, overflow: "hidden" },
  modalHeader: { height: 72, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  cancel: { width: 75, fontFamily: "Lora_400Regular", fontSize: 16, color: colors.ink },
  modalTitle: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 21, color: colors.ink },
  modalSpacer: { width: 75 },
  modalContent: { padding: 20, gap: 14, paddingBottom: 40 },
  input: { height: 56, borderRadius: 13, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 15, fontFamily: "Lora_500Medium", fontSize: 17, color: colors.ink },
  languageList: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.divider },
  languageRow: { minHeight: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  languageText: { fontFamily: "Lora_500Medium", fontSize: 18, color: colors.ink },
  legalText: { fontFamily: "Lora_400Regular", fontSize: 17, lineHeight: 27, color: colors.muted },
  saveButton: { height: 56, borderRadius: 13, backgroundColor: "#c7a56e", alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveText: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 19, letterSpacing: 1, color: "#fffaf1" },
});
