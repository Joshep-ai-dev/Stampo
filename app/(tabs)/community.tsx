import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import { api, KrooIqAnswerResult, KrooIqQuiz } from "@/services/api";
import { useAppSelector } from "@/store/hooks";

const c = {
  green: BrandColors.greenDeep,
  cream: BrandColors.line,
  paper: BrandColors.surface,
  ink: BrandColors.ink,
  copper: BrandColors.copper,
  copperDark: BrandColors.copperDark,
  success: BrandColors.progressGreen,
  rule: BrandColors.line,
};
type Question = {
  id: string;
  prompt: string;
  answers: string[];
  imageUrl?: string;
};
type Stage = "intro" | "question" | "answer" | "result";
export default function KrooIqScreen() {
  const router = useRouter();
  const { status: subscriptionStatus } = useAppSelector(
    (state) => state.subscription,
  );
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [quiz, setQuiz] = useState<KrooIqQuiz | null>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<KrooIqAnswerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const questions = quiz?.questions ?? [];
  const question = questions[index];
  const correct = quiz?.attempt.correctCount ?? 0;
  const score = quiz?.attempt.scoreAfter ?? 0;
  const progress = stage === "intro" ? 0 : index + 1;

  const load = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError("");
    try {
      const loaded = await api.krooIqToday();
      setQuiz(loaded);
      const answered = loaded.attempt.answers.length;
      setIndex(Math.min(answered, Math.max(loaded.questions.length - 1, 0)));
      setStage(
        loaded.attempt.completed ? "result" : answered ? "question" : "intro",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load today's Kroo IQ quiz.",
      );
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirm = async () => {
    if (selected === null || !question || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await api.submitKrooIqAnswer(question.id, selected);
      setFeedback(result);
      setQuiz((current) =>
        current ? { ...current, attempt: result.attempt } : current,
      );
      setStage("answer");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not submit your answer.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const next = () => {
    if (feedback?.attempt.completed || index === questions.length - 1)
      setStage("result");
    else {
      setIndex((v) => v + 1);
      setSelected(null);
      setFeedback(null);
      setStage("question");
    }
  };
  const destination = quiz?.destination;
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Header />
        <ScoreCard score={score} />
        {subscriptionStatus === "loading" || loading ? (
          <ActivityIndicator style={s.loader} color={BrandColors.copper} />
        ) : !isSignedIn ? (
          <Locked onPress={() => router.navigate("/(tabs)/visits" as never)} />
        ) : error && !quiz ? (
          <Message text={error} onRetry={load} />
        ) : stage === "result" ? (
          <Result
            correct={correct}
            total={questions.length}
            before={quiz?.attempt.scoreBefore ?? 0}
            score={score}
            imageUrl={destination?.imageUrl}
            actionLabel={quiz?.isPreview ? "Join Kroo+" : "Next Destination"}
            onPress={
              quiz?.isPreview
                ? () => router.navigate("/(tabs)/visits" as never)
                : load
            }
          />
        ) : (
          <>
            {error ? <Text style={s.inlineError}>{error}</Text> : null}
            <Destination
              progress={progress}
              destination={destination}
              total={questions.length}
            />
            {stage === "intro" ? (
              <Intro destination={destination} />
            ) : stage === "question" && question ? (
              <Quiz
                index={index}
                question={question}
                selected={selected}
                onSelect={setSelected}
              />
            ) : question && feedback ? (
              <Feedback
                question={question}
                result={feedback}
                imageUrl={question.imageUrl || destination?.imageUrl}
              />
            ) : null}
            <View style={{ marginTop: 16 }}></View>
            <Action
              disabled={
                submitting || (stage === "question" && selected === null)
              }
              label={
                submitting
                  ? "Submitting..."
                  : stage === "question"
                    ? "Confirm Answer"
                    : "Swipe to continue"
              }
              arrow={stage !== "question"}
              onPress={
                stage === "intro"
                  ? () => setStage("question")
                  : stage === "question"
                    ? confirm
                    : next
              }
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={s.header}>
      <Image
        source={require("../../assets/images/kroo_logo_text.png")}
        style={s.logo}
        contentFit="contain"
      />
    </View>
  );
}
function ScoreCard({ score }: { score: number }) {
  return (
    <View style={s.scoreCard}>
      <Image
        source={require("../../assets/images/other/kroo_back.webp")}
        style={s.scoreFrame}
        contentFit="fill"
      />
      <View style={s.scoreCenter}>
        <View style={s.iqRow}>
          <Ionicons name="bulb-outline" size={27} color={c.copper} />
          <Text style={s.iqLabel}>KROO IQ</Text>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={c.cream}
          />
        </View>
        <Text style={s.score}>{score.toFixed(2)}</Text>
        <Text style={s.scoreCaption}>Your travel knowledge</Text>
      </View>
    </View>
  );
}
function Destination({
  progress,
  destination,
  total,
}: {
  progress: number;
  destination?: KrooIqQuiz["destination"];
  total: number;
}) {
  return (
    <View style={[s.paper, s.destination]}>
      <View style={s.destinationTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>TODAY&apos;S DESTINATION</Text>
          <Text style={s.destinationTitle}>{destination?.name}</Text>
          <View style={s.location}>
            {/* <Ionicons name="location" size={17} color={c.ink} /> */}
            <Text style={s.locationText}>
              {""}
              {/* {destination?.region ?? "Travel knowledge"} */}
            </Text>
          </View>
        </View>
        {destination?.imageUrl ? (
          <Image
            source={{ uri: destination.imageUrl }}
            style={s.destinationStamp}
            contentFit="cover"
          />
        ) : null}
      </View>
      <View style={s.progressRow}>
        <Text style={s.progressLabel}>Daily Quiz Progress</Text>
        <View style={s.progressDots}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[s.smallDot, i < progress && s.done]} />
          ))}
        </View>
        <Text style={s.progressCount}>
          {progress} / {total}
        </Text>
      </View>
    </View>
  );
}
function Intro({ destination }: { destination?: KrooIqQuiz["destination"] }) {
  return (
    <View style={[s.paper, s.lesson]}>
      <Text style={s.eyebrow}>1. MEET THE COUNTRY</Text>
      {destination?.imageUrl ? (
        <Image
          source={{ uri: destination.imageUrl }}
          style={s.heroImage}
          contentFit="cover"
        />
      ) : null}
      <Text style={s.body}>{destination?.content}</Text>
    </View>
  );
}
function Quiz({
  index,
  question,
  selected,
  onSelect,
}: {
  index: number;
  question: Question;
  selected: number | null;
  onSelect: (n: number) => void;
}) {
  return (
    <View style={[s.paper, s.quiz]}>
      <Text style={s.eyebrow}>{index + 1}. QUESTION</Text>
      <Text style={s.question}>{question.prompt}</Text>
      {question.imageUrl ? (
        <Image
          source={{ uri: question.imageUrl }}
          style={s.questionImage}
          contentFit="cover"
        />
      ) : null}
      <View style={s.answers}>
        {question.answers.map((answer, i) => (
          <TouchableOpacity
            key={answer}
            style={[s.answer, selected === i && s.answerSelected]}
            onPress={() => onSelect(i)}
          >
            <View style={[s.letter, selected === i && s.letterSelected]}>
              <Text style={[s.letterText, selected === i && s.white]}>
                {String.fromCharCode(65 + i)}
              </Text>
            </View>
            <Text style={s.answerText}>{answer}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
function Feedback({
  question,
  result,
  imageUrl,
}: {
  question: Question;
  result: KrooIqAnswerResult;
  imageUrl?: string;
}) {
  const correct = result.correct;
  return (
    <View style={[s.paper, s.feedback]}>
      <View style={s.feedbackHead}>
        <Ionicons
          name={correct ? "checkmark-circle" : "close-circle"}
          size={55}
          color={correct ? c.success : c.copperDark}
        />
        <Text style={[s.feedbackTitle, !correct && { color: c.copperDark }]}>
          {correct ? "Correct!" : "Not quite"}
        </Text>
      </View>
      <Text style={s.feedbackText}>{result.explanation}</Text>
      {!correct && (
        <Text style={s.correctAnswer}>
          Correct answer: {question.answers[result.correctAnswer]}
        </Text>
      )}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={s.feedbackImage}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}
function Result({
  correct,
  total,
  before,
  score,
  imageUrl,
  actionLabel,
  onPress,
}: {
  correct: number;
  total: number;
  before: number;
  score: number;
  imageUrl?: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={[s.paper, s.result]}>
      <Text style={s.resultEyebrow}>TODAY&apos;S KROO IQ</Text>
      <Text style={s.resultNumber}>
        {correct} / {total}
      </Text>
      <Text style={s.resultLabel}>Correct</Text>
      <View style={s.rule} />
      <Text style={s.gain}>+{(score - before).toFixed(2)}</Text>
      <Text style={s.resultLabel}>Kroo IQ</Text>
      <View style={s.scoreChange}>
        <Text style={s.changeLabel}>Your Kroo IQ</Text>
        <Text style={s.changeNumber}>
          {before.toFixed(2)} → {score.toFixed(2)}
        </Text>
      </View>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={s.resultImage}
          contentFit="cover"
        />
      ) : null}
      <Text style={s.great}>Great Explorer!</Text>
      <Text style={s.comeBack}>
        Come back tomorrow{"\n"}to discover somewhere new.
      </Text>
      <Action label={actionLabel} arrow onPress={onPress} />
    </View>
  );
}
function Locked({ onPress }: { onPress: () => void }) {
  return (
    <View style={[s.paper, s.locked]}>
      <View style={s.lockIcon}>
        <Ionicons name="bulb" size={39} color={c.copper} />
      </View>
      <Text style={s.lockTitle}>Unlock Kroo IQ</Text>
      <Text style={s.lockCopy}>
        Build your travel knowledge with a new destination and five questions
        every day. Kroo IQ is exclusively available to Kroo+ members.
      </Text>
      <Action label="Join Kroo+" arrow onPress={onPress} />
    </View>
  );
}
function Message({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={[s.paper, s.messageCard]}>
      <Ionicons name="cloud-offline-outline" size={36} color={c.copperDark} />
      <Text style={s.messageText}>{text}</Text>
      <Action label="Try Again" onPress={onRetry} />
    </View>
  );
}
function Action({
  label,
  onPress,
  disabled = false,
  arrow = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  arrow?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={0.84}
      style={[s.action, disabled && { opacity: 0.45 }]}
      onPress={onPress}
    >
      <Text style={s.actionText}>{label}</Text>
      {arrow && (
        <Ionicons name="chevron-forward" size={20} color={BrandColors.white} />
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  loader: { marginTop: 70 },
  inlineError: {
    marginTop: 10,
    textAlign: "center",
    color: BrandColors.white,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
  },
  messageCard: { marginTop: 20, padding: 24, alignItems: "center", gap: 18 },
  messageText: {
    color: c.ink,
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
  },
  content: { paddingHorizontal: 12, paddingBottom: 22 },
  header: {
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 132, height: 54, flex: 1, alignItems: "center" },
  scoreCard: {
    marginVertical: 8,
    minHeight: 156,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  scoreFrame: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  scoreCenter: { flex: 1, alignItems: "center" },
  iqRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  iqLabel: {
    color: c.cream,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(22),
    letterSpacing: 4,
  },
  score: {
    color: "#FFF9E9",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(54),
    lineHeight: responsiveFontSize(60),
  },
  scoreCaption: {
    color: c.cream,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(16),
  },
  paper: {
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: BrandColors.line,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  destination: { marginTop: 4, paddingHorizontal: 15, paddingTop: 10 },
  destinationTop: { minHeight: 80, flexDirection: "row", alignItems: "center" },
  eyebrow: {
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(12),
    letterSpacing: 2.1,
  },
  destinationTitle: {
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(29),
  },
  location: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    color: c.ink,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
  },
  destinationStamp: { width: 105, height: 72, borderRadius: 8 },
  progressRow: {
    minHeight: 35,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.rule,
  },
  progressLabel: {
    color: c.ink,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
  },
  progressDots: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  smallDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.ink,
  },
  done: { backgroundColor: c.copper, borderColor: c.copper },
  progressCount: {
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(12),
  },
  lesson: { marginTop: 14, padding: 16 },
  heroImage: {
    width: "100%",
    aspectRatio: 1.5,
    marginTop: 13,
    opacity: 0.92,
    borderRadius: 8,
  },
  body: {
    marginTop: 12,
    color: c.ink,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(17),
  },
  action: {
    minHeight: 42,
    marginHorizontal: 28,
    paddingHorizontal: 22,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BrandColors.copperDark,
    backgroundColor: BrandColors.copper,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  actionText: {
    color: BrandColors.white,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
  },
  quiz: { marginTop: 14, minHeight: 410, padding: 18 },
  question: {
    marginTop: 16,
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveFontSize(24),
  },
  questionImage: {
    width: "100%",
    aspectRatio: 1.5,
    marginTop: 16,
    borderRadius: 8,
  },
  answers: { marginTop: 24, gap: 10 },
  answer: {
    minHeight: 53,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#8D775F",
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  answerSelected: {
    backgroundColor: "rgba(65,151,98,.22)",
    borderColor: c.success,
    borderWidth: 2,
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#8D775F",
    alignItems: "center",
    justifyContent: "center",
  },
  letterSelected: { backgroundColor: c.success, borderColor: c.success },
  letterText: {
    color: c.ink,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
  },
  white: { color: "white" },
  answerText: {
    flex: 1,
    color: c.ink,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
  },
  feedback: { marginTop: 14, minHeight: 420, padding: 20 },
  feedbackHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  feedbackTitle: {
    color: c.success,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(28),
  },
  feedbackText: {
    marginTop: 18,
    color: c.ink,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveFontSize(21),
  },
  correctAnswer: {
    marginTop: 9,
    color: c.success,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
  },
  feedbackImage: {
    width: "100%",
    aspectRatio: 1.4,
    marginTop: 17,
    opacity: 0.92,
    borderRadius: 8,
  },
  result: { marginTop: 13, padding: 18, alignItems: "center" },
  resultEyebrow: {
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(16),
    letterSpacing: 2,
  },
  resultNumber: {
    marginTop: 8,
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(48),
    lineHeight: responsiveFontSize(53),
  },
  resultLabel: {
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(19),
  },
  rule: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
    backgroundColor: c.rule,
  },
  gain: {
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(37),
  },
  scoreChange: {
    width: "100%",
    marginTop: 14,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 5,
    backgroundColor: BrandColors.white,
  },
  changeLabel: {
    color: c.ink,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
  },
  changeNumber: {
    marginTop: 2,
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(22),
  },
  resultImage: {
    width: "100%",
    aspectRatio: 1.5,
    marginTop: 14,
    borderRadius: 8,
  },
  great: {
    marginTop: 12,
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(22),
  },
  comeBack: {
    marginVertical: 7,
    textAlign: "center",
    color: c.ink,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveFontSize(20),
  },
  locked: {
    marginTop: 14,
    minHeight: 390,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: c.green,
    alignItems: "center",
    justifyContent: "center",
  },
  lockTitle: {
    marginTop: 20,
    color: c.ink,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(28),
  },
  lockCopy: {
    marginVertical: 14,
    textAlign: "center",
    color: c.ink,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveFontSize(21),
  },
});
