import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { api, CommunityProfile } from "@/services/api";
import { useAppSelector } from "@/store/hooks";

const c = {
  deep: BrandColors.canvas,
  surface: "#123F30",
  surface2: "#164A39",
  mint: "#3ECF8E",
  copper: "#C97C54",
  cream: "#F6F1E4",
  muted: "rgba(246,241,228,0.58)",
  line: "rgba(246,241,228,0.14)",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function Avatar({
  person,
  medal,
  compare,
}: {
  person: CommunityProfile;
  medal?: string;
  compare?: "me" | "friend";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [person.photoUri]);
  const showImage = Boolean(person.photoUri) && !imageFailed;
  return (
    <View
      style={[
        s.avatar,
        compare && s.compareAvatar,
        compare === "me" && s.compareAvatarMe,
        compare === "friend" && s.compareAvatarFriend,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: person.photoUri! }}
          style={s.avatarImage}
          contentFit="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={medal ? s.medal : s.initials}>
          {medal ?? initials(person.name)}
        </Text>
      )}
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { isSignedIn, userId } = useAppSelector((state) => state.profile);
  const [globalPeople, setGlobalPeople] = useState<CommunityProfile[]>([]);
  const [friendPeople, setFriendPeople] = useState<CommunityProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError("");
    try {
      const [global, friends] = await Promise.all([
        api.communityLeaderboard("global"),
        api.communityLeaderboard("friends"),
      ]);
      setGlobalPeople(global);
      setFriendPeople(friends);
      setSelectedId((current) =>
        friends.some((person) => person.id === current && person.id !== userId)
          ? current
          : (friends.find((person) => person.id !== userId)?.id ?? null),
      );
    } catch {
      setError("Could not load the leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userId]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const me =
    friendPeople.find((person) => person.id === userId) ??
    globalPeople.find((person) => person.id === userId);
  const friends = friendPeople.filter((person) => person.id !== userId);
  const selected =
    friends.find((person) => person.id === selectedId) ?? friends[0];
  const meIsRanked = globalPeople.some((person) => person.id === userId);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void load()}
            tintColor={c.copper}
          />
        }
      >
        <Text style={s.title}>LeaderBoard</Text>
        {!isSignedIn ? (
          <Message title="Sign in to join the leaderboard" />
        ) : loading && !globalPeople.length ? (
          <ActivityIndicator style={s.loader} color={c.copper} />
        ) : error ? (
          <Message title={error} />
        ) : (
          <>
            <View style={s.leaderList}>
              {globalPeople.map((person, index) => (
                <LeaderboardRow
                  key={person.id}
                  person={person}
                  index={index}
                  mine={person.id === userId}
                />
              ))}
              {me && !meIsRanked && (
                <LeaderboardRow person={me} index={globalPeople.length} mine />
              )}
            </View>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Compare with a friend</Text>
            </View>
            {me && selected ? (
              <View style={s.compareCard}>
                <View style={s.comparePeople}>
                  <CompareSide person={me} label="You" side="me" />
                  <Text style={s.vs}>VS</Text>
                  <CompareSide
                    person={selected}
                    label={selected.name}
                    side="friend"
                  />
                </View>
                <View style={s.compareStats}>
                  {(
                    [
                      "countries",
                      "continents",
                      "cities",
                      "collections",
                    ] as const
                  ).map((key) => {
                    const leftWins = me.stats[key] > selected.stats[key];
                    const rightWins = selected.stats[key] > me.stats[key];
                    return (
                      <View key={key} style={s.statRow}>
                        <Text style={[s.statLeft, leftWins && s.statWin]}>
                          {me.stats[key]}
                        </Text>
                        <Text style={s.statLabel}>
                          {key === "collections"
                            ? "LISTS DONE"
                            : key.toUpperCase()}
                        </Text>
                        <Text style={[s.statRight, rightWins && s.statWin]}>
                          {selected.stats[key]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Message title="Add a friend by QR code to compare scores." />
            )}
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Friends ({friends.length})</Text>
              <TouchableOpacity
                onPress={() => router.push("/add-friends" as never)}
              >
                <Text style={s.addFriend}>+ Invite friend</Text>
              </TouchableOpacity>
            </View>
            {friends.map((friend) => (
              <View key={friend.id} style={s.friendRow}>
                <Avatar person={friend} />
                <View style={s.friendInfo}>
                  <Text style={s.friendName}>{friend.name}</Text>
                  <Text style={s.friendScore}>
                    {friend.score.toFixed(1)} · {friend.level}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.compareButton}
                  onPress={() => setSelectedId(friend.id)}
                >
                  <Text style={s.compareButtonText}>COMPARE</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LeaderboardRow({
  person,
  index,
  mine,
}: {
  person: CommunityProfile;
  index: number;
  mine: boolean;
}) {
  const medal = index < 3 ? ["🥇", "🥈", "🥉"][index] : undefined;
  return (
    <View style={[s.lbRow, mine && s.meRow]}>
      <Text
        style={[
          s.rank,
          index === 0 && s.rank1,
          index === 1 && s.rank2,
          index === 2 && s.rank3,
        ]}
      >
        {index + 1}
      </Text>
      <Avatar person={person} medal={medal} />
      <View style={s.lbName}>
        <Text style={s.personName}>{mine ? "You" : person.name}</Text>
        <Text style={s.personLevel}>
          {(person.level || "Wanderer").toUpperCase()}
        </Text>
      </View>
      <Text style={s.lbScore}>{person.score.toFixed(1)}</Text>
    </View>
  );
}
function CompareSide({
  person,
  label,
  side,
}: {
  person: CommunityProfile;
  label: string;
  side: "me" | "friend";
}) {
  return (
    <View style={s.compareSide}>
      <Avatar person={person} compare={side} />
      <Text style={s.compareName} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[s.compareScore, side === "me" ? s.scoreMint : s.scoreCopper]}
      >
        {person.score.toFixed(1)}
      </Text>
    </View>
  );
}
function Message({ title }: { title: string }) {
  return <Text style={s.message}>{title}</Text>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.deep },
  content: { paddingBottom: 24 },
  title: {
    paddingHorizontal: 22,
    paddingTop: 8,
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    color: c.cream,
  },
  leaderList: { marginHorizontal: 22, marginTop: 14 },
  lbRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  meRow: {
    marginHorizontal: -14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderBottomWidth: 0,
    backgroundColor: "rgba(201,124,84,0.1)",
  },
  rank: {
    width: 24,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: 16,
    color: c.muted,
  },
  rank1: { color: "#E7C15A" },
  rank2: { color: "#C9CFCB" },
  rank3: { color: c.copper },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: c.surface2,
    borderWidth: 1.5,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  initials: { fontFamily: "Lora_700Bold", fontSize: 13, color: c.cream },
  medal: { fontSize: 16 },
  lbName: { flex: 1 },
  personName: { fontFamily: "Lora_600SemiBold", fontSize: 15, color: c.cream },
  personLevel: { fontFamily: "Lora_400Regular", fontSize: 11, color: c.muted },
  lbScore: { fontFamily: "Lora_700Bold", fontSize: 17, color: c.mint },
  sectionHead: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 18,
    color: c.cream,
  },
  addFriend: { fontFamily: "Lora_400Regular", fontSize: 13, color: c.mint },
  compareCard: {
    marginHorizontal: 22,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
  },
  comparePeople: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compareSide: { flex: 1, alignItems: "center" },
  compareAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
  compareAvatarMe: { borderColor: c.mint },
  compareAvatarFriend: { borderColor: c.copper },
  compareName: {
    width: 110,
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: 15,
    color: c.cream,
  },
  compareScore: { marginTop: 4, fontFamily: "Lora_700Bold", fontSize: 25 },
  scoreMint: { color: c.mint },
  scoreCopper: { color: c.copper },
  vs: {
    paddingHorizontal: 10,
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: c.muted,
  },
  compareStats: { marginTop: 16, gap: 10 },
  statRow: { flexDirection: "row", alignItems: "center" },
  statLeft: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    color: c.cream,
  },
  statRight: {
    flex: 1,
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    color: c.cream,
  },
  statLabel: {
    width: 100,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: 11,
    color: c.muted,
  },
  statWin: { fontFamily: "Lora_700Bold", color: c.mint },
  friendRow: {
    minHeight: 72,
    marginHorizontal: 22,
    marginBottom: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
  },
  friendInfo: { flex: 1 },
  friendName: { fontFamily: "Lora_600SemiBold", fontSize: 15, color: c.cream },
  friendScore: { fontFamily: "Lora_400Regular", fontSize: 12, color: c.muted },
  compareButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  compareButtonText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 11,
    color: c.copper,
  },
  message: {
    marginHorizontal: 30,
    marginTop: 32,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: c.muted,
  },
  loader: { marginTop: 48 },
});
