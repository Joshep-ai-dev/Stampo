import { Text } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import {
  isLegalDocumentId,
  legalDocuments,
  type LegalDocument,
} from "@/data/legal-documents";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LegalDocumentScreen() {
  const router = useRouter();
  const { document } = useLocalSearchParams<{ document?: string }>();
  const documentId = typeof document === "string" ? document : "";
  const legalDocument: LegalDocument | undefined = isLegalDocumentId(documentId)
    ? legalDocuments[documentId]
    : undefined;

  if (!legalDocument) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Document not found</Text>
          <PrimaryButton
            style={styles.returnButton}
            onPress={() => router.back()}
            label="Go Back"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={27} color={BrandColors.onDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {legalDocument.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{legalDocument.eyebrow}</Text>
          <Text style={styles.title}>{legalDocument.title}</Text>
          <View style={styles.titleRule} />
        </View> */}

        {legalDocument.notice && (
          <View style={styles.notice}>
            <Ionicons
              name="information-circle-outline"
              size={23}
              color={BrandColors.copperDark}
            />
            <Text style={styles.noticeText}>{legalDocument.notice}</Text>
          </View>
        )}

        {legalDocument.blocks.map((block, index) => (
          <View
            key={`${block.heading ?? "body"}-${index}`}
            style={styles.section}
          >
            {block.heading && (
              <Text style={styles.sectionTitle}>{block.heading}</Text>
            )}
            {block.body && <Text style={styles.body}>{block.body}</Text>}
            {block.bullets?.map((bullet, bulletIndex) => (
              <View key={bulletIndex} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.canvas },
  header: {
    height: 60,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(28),
    color: BrandColors.onDark,
  },
  headerSpacer: { width: 44 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 56 },
  titleBlock: { paddingTop: 24, paddingBottom: 24 },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: responsiveFontSize(12),
    letterSpacing: 1.7,
    textTransform: "uppercase",
    color: BrandColors.onDarkMuted,
  },
  title: {
    marginTop: 7,
    fontFamily: "Fraunces_700Bold",
    fontSize: responsiveFontSize(38),
    lineHeight: 44,
    color: BrandColors.onDark,
  },
  titleRule: {
    width: 52,
    height: 3,
    marginTop: 18,
    borderRadius: 2,
    backgroundColor: BrandColors.copper,
  },
  notice: {
    flexDirection: "row",
    gap: 12,
    padding: 17,
    marginBottom: 24,
    borderRadius: 15,
    backgroundColor: BrandColors.surfaceSoft,
  },
  noticeText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: responsiveFontSize(12),
    lineHeight: 19,
    color: BrandColors.ink,
  },
  section: {
    paddingVertical: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.paleGreen,
  },
  sectionTitle: {
    marginBottom: 10,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(20),
    lineHeight: 27,
    color: BrandColors.onDark,
  },
  body: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: 24,
    color: BrandColors.onDarkMuted,
  },
  bulletRow: { flexDirection: "row", gap: 10, marginTop: 9, paddingRight: 4 },
  bullet: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(18),
    lineHeight: 24,
    color: BrandColors.copper,
  },
  bulletText: {
    flex: 1,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: 24,
    color: BrandColors.onDarkMuted,
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(24),
    color: BrandColors.onDark,
  },
  returnButton: {
    width: undefined,
    marginTop: 20,
    paddingHorizontal: 24,
  },
});
