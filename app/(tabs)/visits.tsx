import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityVisitSearch } from "@/components/city-visit-search";
import { KrooPlusOffer } from "@/components/kroo-plus-offer";
import { BrandColors } from "@/constants/theme";
import { calculateKrooScoreFromVisits } from "@/data/kroo-score";
import { api, type DailyDestination } from "@/services/api";
import { useAppSelector } from "@/store/hooks";

const c = {
  deep: BrandColors.canvas,
  card: "#123F30",
  card2: "#164A39",
  mint: "#3ECF8E",
  copper: "#C97C54",
  cream: "#F6F1E4",
  muted: "rgba(246,241,228,.58)",
  line: "rgba(246,241,228,.14)",
  error: "#D9694F",
};
type QuizRound = {
  id?: string;
  name?: string;
  country: string;
  icon: string;
  city: string;
  info: string;
  q: string;
  options: readonly string[];
  correct: number;
};
const rounds: QuizRound[] = [
  {
    icon: "🖼️",
    country: "France",
    city: "Paris",
    info: "The Louvre in Paris is the most visited art museum on Earth, drawing millions of visitors every year.",
    q: "Which museum in Paris is the most visited art museum in the world?",
    options: ["The Louvre", "The Uffizi", "The British Museum", "The Prado"],
    correct: 0,
  },
  {
    icon: "🗼",
    country: "France",
    city: "Paris",
    info: "The Eiffel Tower was built as a temporary entrance arch for the 1889 World's Fair.",
    q: "In what year was the Eiffel Tower completed?",
    options: ["1875", "1889", "1901", "1920"],
    correct: 1,
  },
  {
    icon: "🌍",
    country: "France",
    city: "Nationwide",
    info: "France is the world's most visited country by international tourist arrivals.",
    q: "France is the world's ___ most visited country.",
    options: ["1st", "3rd", "5th", "10th"],
    correct: 0,
  },
  {
    icon: "🍷",
    country: "France",
    city: "Nationwide",
    info: "The gastronomic meal of the French is recognized as Intangible Cultural Heritage.",
    q: "Which organization granted that recognition?",
    options: ["UNESCO", "WHO", "UNICEF", "WTO"],
    correct: 0,
  },
  {
    icon: "🗺️",
    country: "France",
    city: "Nationwide",
    info: "Mainland France shares borders with more neighbors than most Western European countries.",
    q: "Roughly how many countries border mainland France?",
    options: ["2", "4", "8", "12"],
    correct: 2,
  },
];
const destinations = [
  {
    name: "Bali Bliss Escape",
    place: "Bali, Indonesia",
    nights: 6,
    cost: "$3,800",
    icon: "🌋",
    color: "#2D5A3D",
    desc: "A private rice-terrace villa and a sunrise trek up an active volcano.",
  },
  {
    name: "Caldera Dreams",
    place: "Santorini, Greece",
    nights: 5,
    cost: "$5,200",
    icon: "🏛️",
    color: "#315E75",
    desc: "Wake up to caldera views, then sail the Aegean at sunset.",
  },
  {
    name: "Escape to Paradise",
    place: "Maldives",
    nights: 4,
    cost: "$7,000",
    icon: "🏝️",
    color: "#21687A",
    desc: "An overwater bungalow reached by private seaplane.",
  },
  {
    name: "Pura Vida Adventure",
    place: "Costa Rica",
    nights: 6,
    cost: "$2,900",
    icon: "🌿",
    color: "#35633A",
    desc: "A rainforest lodge, treetop zip-lines, and volcanic hot springs.",
  },
] as const;
type Destination = (typeof destinations)[number];

export default function PlusTabScreen() {
  const router = useRouter();
  const { countryCode, countryName } = useLocalSearchParams<{
    countryCode?: string;
    countryName?: string;
  }>();
  const travel = useAppSelector((x) => x.travel);
  const isPlus = useAppSelector((x) => x.subscription.isKrooPlus);
  const [index, setIndex] = useState(0),
    [phase, setPhase] = useState<"info" | "question" | "result">("info"),
    [score, setScore] = useState(0),
    [answer, setAnswer] = useState<number | null>(null),
    [selected, setSelected] = useState<Destination | null>(null);
  const [managedRounds, setManagedRounds] = useState<DailyDestination[]>([]);
  useEffect(() => {
    void api
      .dailyDestinations()
      .then(setManagedRounds)
      .catch(() => undefined);
  }, []);
  const quizRounds: QuizRound[] = managedRounds.length
    ? managedRounds.map((item) => ({
        id: item.id,
        name: item.name,
        country: item.country,
        city: item.city || "Nationwide",
        icon: item.icon || "🌍",
        info: item.content,
        q: item.question,
        options: item.options,
        correct: item.correctAnswer,
      }))
    : rounds;
  const krooScore = useMemo(
    () =>
      calculateKrooScoreFromVisits(
        travel.visits,
        travel.completedSightIds,
        travel.challengePoints,
      ),
    [travel],
  );
  const iq = 47.3 + (phase === "result" ? score * 0.05 : 0);
  if (countryCode)
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.countryHead}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={c.cream} />
          </TouchableOpacity>
          <View>
            <Text style={s.countryTitle}>Add a Visit</Text>
            <Text style={s.muted}>
              Choose a city in {countryName ?? countryCode}
            </Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <CityVisitSearch
            countryCode={countryCode}
            countryName={countryName ?? countryCode}
          />
        </ScrollView>
      </SafeAreaView>
    );
  const round = quizRounds[Math.min(index, quizRounds.length - 1)];
  const next = () =>
    index === quizRounds.length - 1
      ? setPhase("result")
      : (setIndex(index + 1), setPhase("info"), setAnswer(null));
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("@/assets/images/kroo_logo_text.png")}
          style={s.wordmark}
          contentFit="contain"
          accessibilityLabel="Kroo, Collect the world"
        />
        <View style={s.dailyHead}>
          <View>
            <Text style={s.sectionTitle}>Daily Destination</Text>
            <Text style={s.kicker}>TODAY&apos;S LESSON</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.iq}>{iq.toFixed(1)}</Text>
            <Text style={s.kicker}>KROO IQ</Text>
          </View>
        </View>
        <View style={s.dailyCard}>
          <View style={s.dots}>
            {quizRounds.map((item, i) => (
              <View
                key={item.id ?? i}
                style={[
                  s.dot,
                  i < index && s.done,
                  i === index && phase !== "result" && s.current,
                ]}
              />
            ))}
          </View>
          {phase === "result" ? (
            <View style={s.result}>
              <Text style={s.resultScore}>
                {score}/{quizRounds.length}
              </Text>
              <Text style={s.kicker}>TODAY&apos;S SCORE</Text>
              <Text style={s.correct}>
                +{(score * 0.05).toFixed(2)} added to your Kroo IQ
              </Text>
              <Button
                label=" DONE FOR TODAY "
                onPress={() => {
                  setIndex(0);
                  setScore(0);
                  setAnswer(null);
                  setPhase("info");
                }}
              />
            </View>
          ) : phase === "info" ? (
            <View>
              <Text style={s.lessonTitle}>{round.country}</Text>
              <Text style={s.kicker}>{round.city.toUpperCase()}</Text>
              <View style={s.lessonImage}>
                <Text style={{ fontSize: responsiveFontSize(34) }}>{round.icon}</Text>
              </View>
              <Text style={s.body}>{round.info}</Text>
              <Button label="CONTINUE" onPress={() => setPhase("question")} />
            </View>
          ) : (
            <View>
              <Text style={s.kicker}>QUESTION {index + 1} OF 5</Text>
              <Text style={s.question}>{round.q}</Text>
              {round.options.map((option, i) => (
                <TouchableOpacity
                  key={option}
                  disabled={answer !== null}
                  style={[
                    s.option,
                    answer !== null && i === round.correct && s.optionCorrect,
                    answer === i && i !== round.correct && s.optionWrong,
                  ]}
                  onPress={() => {
                    setAnswer(i);
                    if (i === round.correct) setScore(score + 1);
                  }}
                >
                  <Text style={s.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
              {answer !== null && (
                <>
                  <Text style={answer === round.correct ? s.correct : s.wrong}>
                    {answer === round.correct
                      ? "Correct! Nice work."
                      : `Not quite — the answer was ${round.options[round.correct]}.`}
                  </Text>
                  <Button
                    label={
                      index < quizRounds.length - 1 ? "NEXT" : "SEE YOUR SCORE"
                    }
                    onPress={next}
                  />
                </>
              )}
            </View>
          )}
        </View>
        <Text style={s.heading}>Dream Vacation Challenge</Text>
        <Text style={s.intro}>
          Complete 3 requirements as a{" "}
          <Text style={{ color: c.cream }}>Kroo+ member</Text> and we&apos;ll
          send you on the dream vacation you choose below.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.destRow}
        >
          {destinations.map((d) => (
            <TouchableOpacity
              key={d.name}
              style={s.destCard}
              onPress={() => setSelected(d)}
            >
              <View style={[s.destImage, { backgroundColor: d.color }]}>
                <Text style={{ fontSize: responsiveFontSize(28) }}>{d.icon}</Text>
              </View>
              <View style={{ padding: 10 }}>
                <Text style={s.destName}>{d.name}</Text>
                <Text style={s.destCost}>{d.cost}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isPlus ? (
          <Progress score={krooScore} iq={iq} />
        ) : (
          <View style={s.offerSection}>
            <Text style={s.offerHeading}>Go further with Kroo+</Text>
            <KrooPlusOffer
              onPurchase={() => router.push("/gift-kroo-plus" as never)}
              onRestore={() => router.push("/kroo-plus" as never)}
            />
          </View>
        )}
      </ScrollView>
      <Modal
        transparent
        animationType="slide"
        visible={!!selected}
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalRoot}>
          <Pressable style={s.backdrop} onPress={() => setSelected(null)} />
          <View style={s.sheet}>
            {selected && (
              <>
                <TouchableOpacity
                  style={s.close}
                  onPress={() => setSelected(null)}
                >
                  <Ionicons name="close" size={20} color={c.cream} />
                </TouchableOpacity>
                <View
                  style={[s.modalImage, { backgroundColor: selected.color }]}
                >
                  <Text style={{ fontSize: responsiveFontSize(48) }}>{selected.icon}</Text>
                </View>
                <Text style={s.modalTitle}>{selected.name}</Text>
                <Text style={s.kicker}>{selected.place.toUpperCase()}</Text>
                <Text style={s.body}>{selected.desc}</Text>
                <View style={s.stats}>
                  <Stat value={`${selected.nights}`} label="NIGHTS" />
                  <Stat value={selected.cost} label="EST. VALUE" />
                </View>
                <Button
                  label="SELECT THIS DESTINATION"
                  onPress={() => setSelected(null)}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.button} onPress={onPress}>
      <Text style={s.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}
function Progress({ score, iq }: { score: number; iq: number }) {
  const items = [
    {
      title: "Refer 10 friends",
      value: "0 / 10",
      p: 0,
      detail: "Counted once they join Kroo and verify their first country.",
    },
    {
      title: "Kroo Score 5.5+",
      value: `${score.toFixed(1)} / 5.5`,
      p: score / 5.5,
      detail: "Verified countries, continents, cities & sights only.",
    },
    {
      title: "Kroo IQ 85+",
      value: `${iq.toFixed(1)} / 85`,
      p: iq / 85,
      detail: "Keep your Daily Destination streak going to close the gap.",
    },
  ];
  return (
    <View>
      <View style={s.progressHead}>
        <Text style={s.heading}>Your Challenge Progress</Text>
        <Text style={s.complete}>
          {items.filter((x) => x.p >= 1).length}/3 complete
        </Text>
      </View>
      {items.map((x) => (
        <View style={s.progressCard} key={x.title}>
          <View style={s.progressTop}>
            <Text style={s.progressTitle}>{x.title}</Text>
            <Text style={s.progressValue}>{x.value}</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.min(x.p, 1) * 100}%` }]} />
          </View>
          <Text style={s.muted}>{x.detail}</Text>
        </View>
      ))}
      <Text style={s.note}>
        12 months from your Kroo+ start date · Active subscription required
      </Text>
    </View>
  );
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.kicker}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.deep },
  content: { paddingTop: 6, paddingBottom: 36 },
  wordmark: { width: 210, height: 78, alignSelf: "center" },
  dailyHead: {
    marginTop: 20,
    paddingHorizontal: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(21),
    color: c.cream,
  },
  kicker: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    letterSpacing: 0.8,
    color: c.mint,
  },
  iq: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(32), color: c.cream },
  dailyCard: {
    minHeight: 300,
    margin: 22,
    marginBottom: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 20,
    backgroundColor: c.card,
  },
  dots: {
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 5,
    marginBottom: 8,
  },
  dot: { width: 16, height: 4, borderRadius: 2, backgroundColor: c.line },
  done: { backgroundColor: c.mint },
  current: { backgroundColor: c.copper },
  lessonTitle: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(21), color: c.cream },
  lessonImage: {
    height: 90,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.card2,
  },
  body: {
    marginTop: 12,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: 22,
    color: c.cream,
  },
  button: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.copper,
  },
  buttonText: {
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
    color: c.deep,
  },
  question: {
    marginVertical: 12,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(17),
    lineHeight: 24,
    color: c.cream,
  },
  option: {
    minHeight: 43,
    marginBottom: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    backgroundColor: c.card2,
  },
  optionCorrect: { borderColor: c.mint },
  optionWrong: { borderColor: c.error },
  optionText: { fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(14), color: c.cream },
  correct: {
    marginTop: 8,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(13),
    color: c.mint,
  },
  wrong: {
    marginTop: 8,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(13),
    color: c.error,
  },
  result: { paddingTop: 30, alignItems: "center" },
  resultScore: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(46),
    color: c.copper,
  },
  heading: {
    marginTop: 27,
    marginHorizontal: 22,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
    color: c.cream,
  },
  offerSection: { paddingHorizontal: 22, paddingBottom: 8 },
  offerHeading: {
    marginTop: 27,
    marginBottom: 12,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
    color: c.cream,
  },
  intro: {
    margin: 22,
    marginTop: 8,
    marginBottom: 0,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    lineHeight: 21,
    color: c.muted,
  },
  destRow: { padding: 22, paddingBottom: 4, gap: 12 },
  destCard: {
    width: 128,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 14,
    backgroundColor: c.card,
  },
  destImage: { height: 72, alignItems: "center", justifyContent: "center" },
  destName: {
    minHeight: 30,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    color: c.cream,
  },
  destCost: { fontFamily: "Lora_600SemiBold", fontSize: responsiveFontSize(13), color: c.mint },
  table: {
    margin: 22,
    marginTop: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 16,
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  feature: {
    flex: 1,
    paddingVertical: 7,
    paddingRight: 5,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    color: c.cream,
  },
  colHead: {
    width: 55,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(12),
    color: c.muted,
  },
  value: {
    width: 55,
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
    color: c.muted,
  },
  check: { color: c.mint },
  plans: { marginHorizontal: 22, flexDirection: "row", gap: 10 },
  plan: {
    flex: 1,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 9,
    backgroundColor: c.card,
  },
  planLabel: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(12), color: c.copper },
  price: {
    marginTop: 12,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(23),
    color: c.cream,
  },
  save: {
    position: "absolute",
    top: -13,
    padding: 6,
    borderRadius: 12,
    backgroundColor: c.copper,
  },
  saveText: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(11), color: c.deep },
  terms: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    color: c.muted,
  },
  progressHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  complete: {
    marginRight: 22,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
    color: c.mint,
  },
  progressCard: {
    marginHorizontal: 22,
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 18,
    backgroundColor: c.card,
  },
  progressTop: { flexDirection: "row", justifyContent: "space-between" },
  progressTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(18),
    color: c.cream,
  },
  progressValue: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    color: c.copper,
  },
  track: {
    height: 8,
    marginVertical: 12,
    borderRadius: 4,
    backgroundColor: c.card2,
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.mint },
  muted: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    lineHeight: 19,
    color: c.muted,
  },
  note: {
    margin: 25,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: c.muted,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.6)",
  },
  sheet: {
    padding: 22,
    paddingBottom: 34,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: c.card,
  },
  close: { position: "absolute", right: 20, top: 14, zIndex: 2 },
  modalImage: {
    height: 130,
    marginTop: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    marginTop: 16,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(24),
    color: c.cream,
  },
  stats: { marginTop: 16, flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    padding: 11,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: c.card2,
  },
  statValue: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(17), color: c.cream },
  countryHead: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
  },
  countryTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(26),
    color: c.cream,
  },
});
