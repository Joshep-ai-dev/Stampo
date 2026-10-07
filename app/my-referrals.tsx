import { Text } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { BrandColors } from "@/constants/theme";
import { api } from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReferralPage = Awaited<ReturnType<typeof api.referrals>>;

export default function MyReferralsScreen() {
  const router = useRouter();
  const signedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [data, setData] = useState<ReferralPage>({
    members: [],
    total: 0,
    nextPage: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const pending = useRef(false);
  const requestedPage = useRef(1);

  const load = useCallback(
    async (page = 1) => {
      if (!signedIn || pending.current) return;
      const requestGeneration = generation.current;
      pending.current = true;
      requestedPage.current = page;
      setLoading(true);
      setError("");
      try {
        const result = await api.referrals(page);
        if (requestGeneration !== generation.current) return;
        setData((previous) => ({
          ...result,
          members:
            page === 1
              ? result.members
              : [...previous.members, ...result.members],
        }));
      } catch (cause) {
        if (requestGeneration === generation.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load your referrals.",
          );
      } finally {
        if (requestGeneration === generation.current) {
          pending.current = false;
          setLoading(false);
        }
      }
    },
    [signedIn],
  );

  useFocusEffect(
    useCallback(() => {
      setData({ members: [], total: 0, nextPage: null });
      setLoading(false);
      setError("");
      void load();
      return () => {
        generation.current += 1;
        pending.current = false;
      };
    }, [load]),
  );

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Back"
          accessibilityRole="button"
          style={s.back}
        >
          <Ionicons name="chevron-back" size={24} color={BrandColors.onDark} />
        </TouchableOpacity>
        <Text style={s.title}>My referrals</Text>
      </View>
      <FlatList
        data={signedIn ? data.members : []}
        keyExtractor={(member) => member.id}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={loading && data.members.length > 0}
            onRefresh={() => void load()}
            tintColor={BrandColors.copper}
          />
        }
        ListHeaderComponent={
          <View style={s.intro}>
            <Text style={s.total}>
              {data.total}{" "}
              {data.total === 1 ? "person joined" : "people joined"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.member}>
            <Ionicons
              name={item.source === "gift" ? "gift-outline" : "person-outline"}
              size={26}
              color={BrandColors.copper}
            />
            <View style={s.memberCopy}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.copy}>Kroo ID: {item.krooId}</Text>
              <Text style={s.copy}>
                {item.source === "gift" ? "Gift recipient" : "Referral"} ·
                Joined {new Date(item.joinedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !signedIn ? (
            <Text style={s.copy}>Sign into Kroo to see your referrals.</Text>
          ) : loading ? (
            <ActivityIndicator color={BrandColors.copper} />
          ) : !error ? (
            <Text style={s.copy}>
              Nobody has joined using your codes yet. New members will appear
              here after joining.
            </Text>
          ) : null
        }
        ListFooterComponent={
          <View style={s.footer}>
            {!!error && (
              <>
                <Text style={s.copy}>{error}</Text>
                <PrimaryButton
                  label="Try again"
                  disabled={loading}
                  onPress={() => void load(requestedPage.current)}
                />
              </>
            )}
            {signedIn && data.nextPage && !error ? (
              <PrimaryButton
                label={loading ? "Loading…" : "Load more"}
                disabled={loading}
                onPress={() => void load(data.nextPage!)}
              />
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  back: { padding: 8 },
  title: {
    color: BrandColors.onDark,
    fontFamily: "Lora_700Bold",
    fontSize: 26,
  },
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  intro: { gap: 16, marginBottom: 12 },
  total: {
    color: BrandColors.copper,
    fontFamily: "Lora_700Bold",
    fontSize: 23,
  },
  copy: { color: BrandColors.onDarkMuted, fontSize: 14, lineHeight: 21 },
  member: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 12,
    backgroundColor: BrandColors.greenPanel,
  },
  memberCopy: { flex: 1, gap: 4 },
  name: {
    color: BrandColors.onDark,
    fontFamily: "Lora_600SemiBold",
    fontSize: 18,
  },
  footer: { gap: 12, paddingTop: 12 },
});
