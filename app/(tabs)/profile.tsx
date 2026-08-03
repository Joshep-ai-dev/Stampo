import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function SettingsRow({ row, isLast }: { row: ProfileRow; isLast: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        row.description && styles.multilineRow,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backPressed,
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={39} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
        </View>

        {profileSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, index) => (
                <SettingsRow
                  key={row.id}
                  row={row}
                  isLast={index === section.rows.length - 1}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
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
  backButton: {
    width: 42,
    height: 52,
    alignItems: "flex-start",
    justifyContent: "center",
    marginRight: 5,
  },
  backPressed: { opacity: 0.5 },
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
});
