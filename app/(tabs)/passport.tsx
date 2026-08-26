import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import {
  calculateKrooScoreFromVisits,
  formatKrooNumber,
} from "@/data/kroo-score";
import { stampAssets } from "@/data/stamps";
import { api } from "@/services/api";
import { dashboardCleared, fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { ProfileState } from "@/store/profile-slice";
import {
  authSessionChanged,
  photoChanged,
  profileDetailsChanged,
  signedOut,
} from "@/store/profile-slice";
import { travelStateHydrated, visitsHydrated } from "@/store/travel-slice";

const colors = {
  background: BrandColors.canvas,
  paper: BrandColors.white,
  paperBorder: BrandColors.copper,
  ink: BrandColors.onDark,
  muted: BrandColors.onDarkMuted,
  dot: BrandColors.line,
};

type Stamp = { id: string; code: string; name: string; image?: number };
type PassportPage =
  | { id: string; type: "cover"; image: number; accessibilityLabel: string }
  | { id: string; type: "identity" }
  | { id: string; type: "stamps"; slots: (Stamp | null)[] };

function BookSheet({
  index,
  pageCount,
  position,
  width,
  height,
  interactive,
  children,
}: {
  index: number;
  pageCount: number;
  position: SharedValue<number>;
  width: number;
  height: number;
  interactive: boolean;
  children: ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1100 },
      {
        rotateY: `${interpolate(
          position.value,
          [index, index + 1],
          [0, -179],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  return (
    <Reanimated.View
      pointerEvents={interactive ? "auto" : "none"}
      style={[
        styles.turningPage,
        {
          width,
          height,
          zIndex: pageCount - index,
          transformOrigin: "left center",
        },
        animatedStyle,
      ]}
    >
      {children}
    </Reanimated.View>
  );
}

function IdentityPage({
  profile,
  krooNumber,
  width,
  height,
  compact,
}: {
  profile: ProfileState;
  krooNumber: string;
  width: number;
  height: number;
  compact: boolean;
}) {
  const dispatch = useAppDispatch();
  const visits = useAppSelector((state) => state.travel.visits);
  const [draft, setDraft] = useState({
    name: profile.name,
    email: profile.email,
    nationality: profile.nationality,
    dateOfBirth: profile.dateOfBirth,
  });
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [passwordEditorVisible, setPasswordEditorVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const pickPhoto = async () => {
    if (!profile.isSignedIn) {
      Alert.alert(
        "Sign in required",
        "Create your account before adding a passport photo.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      try {
        const uploaded = await api.uploadProfileImage(result.assets[0]);
        dispatch(photoChanged(uploaded.photoUri));
      } catch (error) {
        Alert.alert(
          "Photo not uploaded",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    }
  };
  const save = () => {
    if (!profile.isSignedIn) return;
    dispatch(profileDetailsChanged(draft));
    void api.updateProfile({ ...profile, ...draft }).catch(() => undefined);
  };
  const finishAuthentication = async (user: {
    id: string;
    name: string;
    email: string;
    language: string;
  }) => {
    setDraft((current) => ({
      ...current,
      name: user.name,
      email: user.email,
    }));
    dispatch(
      profileDetailsChanged({ ...draft, name: user.name, email: user.email }),
    );
    dispatch(authSessionChanged({ isSignedIn: true, userId: user.id }));
    const localVisits = visits;
    setAuthBusy(true);
    const [visitsResult, travelStateResult] = await Promise.allSettled([
      api.syncVisits(localVisits),
      api.travelState(),
    ]);
    if (visitsResult.status === "fulfilled") {
      dispatch(visitsHydrated(visitsResult.value));
    } else {
      Alert.alert(
        "Visits not loaded",
        "You are signed in, but your saved visited-country list could not be loaded. Pull down on Home to try again.",
      );
    }
    if (travelStateResult.status === "fulfilled") {
      dispatch(travelStateHydrated(travelStateResult.value));
    }
    await dispatch(fetchHomeDashboard());
  };
  const signUp = async () => {
    if (!draft.email.trim() || password.length < 6) {
      Alert.alert(
        "Check your details",
        "Enter your email and a password of at least 6 characters.",
      );
      return;
    }
    const generatedName =
      draft.email
        .trim()
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Traveler";
    try {
      const user = await api.signUp({
        name: generatedName,
        email: draft.email.trim(),
        password,
      });
      await finishAuthentication(user);
      setPassword("");
    } catch (error) {
      Alert.alert(
        "Sign up failed",
        error instanceof Error
          ? error.message
          : "Please check your connection and try again.",
      );
    } finally {
      setAuthBusy(false);
    }
  };
  const signIn = async () => {
    if (!draft.email.trim() || !password) {
      Alert.alert("Sign in", "Enter your email and password.");
      return;
    }
    try {
      setAuthBusy(true);
      const { user } = await api.signIn({
        email: draft.email.trim(),
        password,
      });
      await finishAuthentication(user);
      setPassword("");
    } catch (error) {
      Alert.alert(
        "Sign in failed",
        error instanceof Error
          ? error.message
          : "Please check your connection and try again.",
      );
    } finally {
      setAuthBusy(false);
    }
  };
  const signOut = async () => {
    try {
      await api.signOut();
    } finally {
      dispatch(signedOut());
      dispatch(dashboardCleared());
    }
  };
  const closePasswordEditor = () => {
    setPasswordEditorVisible(false);
    setCurrentPassword("");
    setNewPassword("");
    setPasswordConfirmation("");
  };
  const updatePassword = async () => {
    if (!currentPassword || newPassword.length < 8) {
      Alert.alert(
        "Update password",
        "Enter your current password and a new password of at least 8 characters.",
      );
      return;
    }
    if (newPassword !== passwordConfirmation) {
      Alert.alert("Update password", "The new passwords do not match.");
      return;
    }
    try {
      setAuthBusy(true);
      await api.updatePassword({ currentPassword, newPassword });
      closePasswordEditor();
      Alert.alert("Password updated", "Your new password is ready to use.");
    } catch {
      Alert.alert(
        "Password not updated",
        "Check your current password and try again.",
      );
    } finally {
      setAuthBusy(false);
    }
  };
  return (
    <>
      <View style={[styles.paper, styles.identityPaper, { width, height }]}>
        <View
          style={[
            styles.identityHeading,
            compact && styles.identityHeadingCompact,
          ]}
        >
          <Text style={styles.identityCountry}>TRAVEL PASSPORT</Text>
          <Text style={styles.identityType}>PASSPORT · P</Text>
        </View>
        {profile.isSignedIn ? (
          <>
            <View style={styles.identityBody}>
              <TouchableOpacity
                style={styles.photoBox}
                onPress={() => void pickPhoto()}
              >
                {profile.photoUri ? (
                  <Image
                    source={{ uri: profile.photoUri }}
                    style={styles.identityPhoto}
                    contentFit="cover"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="person"
                      size={48}
                      color={BrandColors.muted}
                    />
                    <Text style={styles.addPhoto}>ADD PHOTO</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={styles.identityFields}>
                {(
                  [
                    ["name", "GIVEN NAME", "First name"],
                    ["email", "EMAIL", "you@example.com"],
                    ["nationality", "NATIONALITY", "Country"],
                    ["dateOfBirth", "DATE OF BIRTH", "YYYY-MM-DD"],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <View key={key} style={styles.identityField}>
                    <Text style={styles.fieldCaption}>{label}</Text>
                    <TextInput
                      value={draft[key]}
                      onChangeText={(value) =>
                        setDraft((current) => ({ ...current, [key]: value }))
                      }
                      placeholder={placeholder}
                      placeholderTextColor="#a89378"
                      style={styles.identityInput}
                      onBlur={save}
                    />
                  </View>
                ))}
                <View style={styles.accountActions}>
                  <TouchableOpacity
                    style={styles.passwordButton}
                    onPress={() => setPasswordEditorVisible(true)}
                  >
                    <Text style={styles.passwordButtonText}>
                      UPDATE PASSWORD
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={() => void signOut()}
                  >
                    <Text style={styles.signOutText}>SIGN OUT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.numberRow}>
              <Text style={styles.numberLabel}>KROO NUMBER</Text>
              <Text style={styles.passportNumber}>{krooNumber}</Text>
            </View>
            <Text
              style={styles.machineCode}
            >{`P<${(draft.name || "TRAVELLER").toUpperCase().replace(/\s/g, "<")}<<<<<<<<`}</Text>
            <Text
              style={styles.machineCode}
            >{`${krooNumber.replace(/-/g, "")}<<<<<<<<<<<`}</Text>
          </>
        ) : (
          <ScrollView
            style={styles.authPage}
            contentContainerStyle={[
              styles.authPageContent,
              compact && styles.authPageContentCompact,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.authSeal, compact && styles.authSealCompact]}>
              <Image
                source={require("@/assets/images/favicon.png")}
                style={[
                  styles.authKrooMark,
                  compact && styles.authKrooMarkCompact,
                ]}
                contentFit="fill"
              />
            </View>
            <Text style={styles.authTitle}>Your travel passport</Text>
            <Text style={styles.authIntro}>
              Sign in to collect stamps and continue your journey.
            </Text>
            <View style={styles.authField}>
              <Text style={styles.authCaption}>EMAIL</Text>
              <TextInput
                value={draft.email}
                onChangeText={(email) =>
                  setDraft((current) => ({ ...current, email }))
                }
                placeholder="you@example.com"
                placeholderTextColor="#a89378"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.authInput}
              />
            </View>
            <View style={styles.authField}>
              <Text style={styles.authCaption}>PASSWORD</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#a89378"
                secureTextEntry
                style={styles.authInput}
              />
            </View>
            <View style={styles.authButtons}>
              <TouchableOpacity
                disabled={authBusy}
                style={[
                  styles.signInPrimary,
                  styles.authButton,
                  authBusy && styles.authButtonDisabled,
                ]}
                onPress={() => void signIn()}
              >
                <Text style={styles.signInPrimaryText}>
                  {authBusy ? "PLEASE WAIT" : "SIGN IN"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={authBusy}
                style={[
                  styles.createSecondary,
                  styles.authButton,
                  authBusy && styles.authButtonDisabled,
                ]}
                onPress={() => void signUp()}
              >
                <Text style={styles.createSecondaryText}>CREATE ACCOUNT</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={passwordEditorVisible}
        onRequestClose={closePasswordEditor}
      >
        <View style={styles.passwordModalRoot}>
          <Pressable
            style={styles.passwordBackdrop}
            onPress={closePasswordEditor}
          />
          <View style={styles.passwordSheet}>
            <Text style={styles.passwordTitle}>Update password</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={BrandColors.muted}
              secureTextEntry
              style={styles.passwordInput}
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor={BrandColors.muted}
              secureTextEntry
              style={styles.passwordInput}
            />
            <TextInput
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              placeholder="Confirm new password"
              placeholderTextColor={BrandColors.muted}
              secureTextEntry
              style={styles.passwordInput}
            />
            <View style={styles.passwordActions}>
              <TouchableOpacity
                style={styles.passwordCancel}
                onPress={closePasswordEditor}
              >
                <Text style={styles.passwordCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={authBusy}
                style={[
                  styles.passwordSave,
                  authBusy && styles.authButtonDisabled,
                ]}
                onPress={() => void updatePassword()}
              >
                <Text style={styles.passwordSaveText}>
                  {authBusy ? "SAVING" : "SAVE"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function chunkStamps(stamps: Stamp[]): PassportPage[] {
  if (stamps.length === 0) return [];
  const pages: PassportPage[] = [];
  for (let index = 0; index < stamps.length; index += 4) {
    const slots: (Stamp | null)[] = stamps.slice(index, index + 4);
    while (slots.length < 4) slots.push(null);
    pages.push({ id: `stamps-${index / 4 + 1}`, type: "stamps", slots });
  }
  return pages;
}

function StampPage({
  slots,
  width,
  height,
  onStampPress,
}: {
  slots: (Stamp | null)[];
  width: number;
  height: number;
  onStampPress: (stamp: Stamp) => void;
}) {
  return (
    <View style={[styles.paper, { width, height }]}>
      <View style={styles.paperInner}>
        {slots.map((stamp, index) => (
          <Pressable
            key={stamp?.id ?? `empty-${index}`}
            disabled={!stamp}
            onPress={() => stamp && onStampPress(stamp)}
            style={[styles.stampSlot, !stamp && styles.emptySlot]}
          >
            {stamp?.image ? (
              <Image
                source={stamp.image}
                style={styles.stampImage}
                contentFit="contain"
              />
            ) : stamp ? (
              <View style={styles.genericStamp}>
                <Text style={styles.genericCode}>{stamp.code}</Text>
                <Text style={styles.genericName}>{stamp.name}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function PassportScreen() {
  const router = useRouter();
  const profile = useAppSelector((state) => state.profile);
  const visits = useAppSelector((state) => state.travel.visits);
  const completedSightIds = useAppSelector(
    (state) => state.travel.completedSightIds,
  );
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const compactPassport = screenWidth < 380 || screenHeight < 720;
  const [activePage, setActivePage] = useState(0);
  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);
  const activePageRef = useRef(0);
  const activePageValue = useSharedValue(0);
  const gestureStart = useSharedValue(0);
  const bookPosition = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      activePageRef.current = 0;
      setActivePage(0);
      activePageValue.value = 0;
      bookPosition.value = 0;
    }, [activePageValue, bookPosition]),
  );
  const horizontalInset = compactPassport ? 20 : 36;
  const pageWidth = Math.min(screenWidth - horizontalInset, 620);
  const availablePageHeight = carouselHeight
    ? carouselHeight - (compactPassport ? 20 : 28)
    : screenHeight - (compactPassport ? 178 : 218);
  const pageHeight = Math.min(availablePageHeight, pageWidth * 1.48);
  const krooNumber = useMemo(
    () =>
      formatKrooNumber(calculateKrooScoreFromVisits(visits, completedSightIds)),
    [completedSightIds, visits],
  );

  const passportPages = useMemo(() => {
    const countryMap = new Map<string, Stamp>();
    visits.forEach((visit) => {
      if (visit.countryCode && !countryMap.has(visit.countryCode)) {
        countryMap.set(visit.countryCode, {
          id: visit.countryCode,
          code: visit.countryCode,
          name: visit.country,
          image: stampAssets[visit.countryCode],
        });
      }
    });
    const stamps = [...countryMap.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    return [
      {
        id: "front-cover",
        type: "cover" as const,
        image: require("@/assets/images/other/passport-front.png"),
        accessibilityLabel: "Electronic passport front cover",
      },
      { id: "identity", type: "identity" as const },
      ...chunkStamps(stamps),
      {
        id: "back-cover",
        type: "cover" as const,
        image: require("@/assets/images/other/passport-back.png"),
        accessibilityLabel: "Passport back cover",
      },
    ];
  }, [visits]);

  const updateActivePage = useCallback((index: number) => {
    activePageRef.current = index;
    setActivePage(index);
  }, []);
  const pageGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .failOffsetY([-14, 14])
        .onBegin(() => {
          gestureStart.value = activePageValue.value;
        })
        .onUpdate((event) => {
          bookPosition.value = Math.max(
            0,
            Math.min(
              passportPages.length - 1,
              gestureStart.value - event.translationX / pageWidth,
            ),
          );
        })
        .onEnd((event) => {
          const movement = bookPosition.value - activePageValue.value;
          const shouldAdvance = movement > 0.3 || event.velocityX < -650;
          const shouldGoBack = movement < -0.3 || event.velocityX > 650;
          const target = Math.max(
            0,
            Math.min(
              passportPages.length - 1,
              activePageValue.value +
                (shouldAdvance ? 1 : shouldGoBack ? -1 : 0),
            ),
          );
          bookPosition.value = withTiming(
            target,
            { duration: 240 },
            (finished) => {
              if (!finished) return;
              activePageValue.value = target;
              runOnJS(updateActivePage)(target);
            },
          );
        }),
    [
      activePageValue,
      bookPosition,
      gestureStart,
      pageWidth,
      passportPages.length,
      updateActivePage,
    ],
  );

  const renderPage = (page: PassportPage) =>
    page.type === "cover" ? (
      <View
        style={[styles.coverPage, { width: pageWidth, height: pageHeight }]}
      >
        <Image
          source={page.image}
          style={styles.coverArtwork}
          contentFit="fill"
          accessibilityLabel={page.accessibilityLabel}
        />
      </View>
    ) : page.type === "identity" ? (
      <IdentityPage
        profile={profile}
        krooNumber={krooNumber}
        width={pageWidth}
        height={pageHeight}
        compact={compactPassport}
      />
    ) : (
      <StampPage
        slots={page.slots}
        width={pageWidth}
        height={pageHeight}
        onStampPress={(stamp) =>
          router.push({
            pathname: "/country/[code]",
            params: { code: stamp.code },
          })
        }
      />
    );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <GestureDetector gesture={pageGesture}>
          <View
            style={styles.carouselArea}
            onLayout={(event: LayoutChangeEvent) => {
              const measuredHeight = event.nativeEvent.layout.height;
              setCarouselHeight((current) =>
                Math.max(current ?? 0, measuredHeight),
              );
            }}
          >
            <View style={styles.pageFrame}>
              {passportPages.map((page, index) => (
                <BookSheet
                  key={page.id}
                  index={index}
                  pageCount={passportPages.length}
                  position={bookPosition}
                  width={pageWidth}
                  height={pageHeight}
                  interactive={index === activePage}
                >
                  {renderPage(page)}
                </BookSheet>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.shareButton,
                compactPassport && styles.shareButtonCompact,
              ]}
              onPress={() =>
                void Share.share({
                  message: `My Kroo passport — ${Math.max(0, passportPages.length - 2)} stamp pages.`,
                })
              }
            >
              <Ionicons
                name="arrow-redo-sharp"
                size={compactPassport ? 24 : 30}
                color={colors.ink}
              />
            </TouchableOpacity>
          </View>
        </GestureDetector>
        <View style={styles.pagination}>
          <View style={styles.dots}>
            {passportPages.map((page, index) => (
              <TouchableOpacity
                key={page.id}
                style={[styles.dot, index === activePage && styles.dotActive]}
                onPress={() => {
                  if (index === activePageRef.current) return;
                  bookPosition.value = withTiming(
                    index,
                    {
                      duration: Math.min(
                        700,
                        220 * Math.abs(index - activePageRef.current),
                      ),
                    },
                    (finished) => {
                      if (!finished) return;
                      activePageValue.value = index;
                      runOnJS(updateActivePage)(index);
                    },
                  );
                }}
              />
            ))}
          </View>
          <Text style={styles.pageCount}>
            {activePage + 1} / {passportPages.length}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardArea: { flex: 1 },
  carouselArea: { flex: 1, position: "relative" },
  pageFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  turningPage: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    // The page itself supplies its shape: covers stay square while paper
    // identity/stamp pages expose their rounded corners.
    backgroundColor: "transparent",
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  coverPage: {
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  coverArtwork: {
    position: "absolute",
    width: "100%",
    height: "100%",
    left: "0%",
    top: "0%",
  },
  paper: {
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.paperBorder,
    borderRadius: 18,
    padding: 9,
    elevation: 0,
  },
  identityPaper: { padding: 16, justifyContent: "space-between" },
  identityHeading: {
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.line,
    paddingBottom: 10,
    borderRadius: 18,
  },
  identityHeadingCompact: { paddingBottom: 6 },
  identityCountry: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(19),
    color: BrandColors.green,
    letterSpacing: 1.2,
  },
  identityType: {
    marginTop: 3,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(10),
    color: BrandColors.muted,
  },
  identityBody: { flex: 1, flexDirection: "row", gap: 14, paddingTop: 18 },
  authPage: {
    flex: 1,
    width: "100%",
  },
  authPageContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  authPageContentCompact: {
    justifyContent: "flex-start",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  authSeal: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  authSealCompact: { width: 92, height: 92, marginBottom: 6 },
  authKrooMark: {
    width: 137,
    height: 137,
  },
  authKrooMarkCompact: {
    width: 90,
    height: 90,
  },
  authTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(24),
    color: BrandColors.green,
    textAlign: "center",
  },
  authIntro: {
    maxWidth: 300,
    marginTop: 4,
    marginBottom: 16,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    lineHeight: 14,
    textAlign: "center",
    color: BrandColors.muted,
  },
  authField: {
    width: "100%",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.line,
  },
  authCaption: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    letterSpacing: 1,
    color: BrandColors.muted,
  },
  authInput: {
    height: 36,
    padding: 0,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    color: BrandColors.ink,
  },
  photoBox: {
    width: "36%",
    height: "58%",
    minHeight: 155,
    borderRadius: 8,
    backgroundColor: BrandColors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  identityPhoto: { width: "100%", height: "100%" },
  addPhoto: {
    marginTop: 7,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    color: BrandColors.muted,
  },
  identityFields: { flex: 1, gap: 7 },
  identityField: { borderBottomWidth: 1, borderBottomColor: BrandColors.line },
  fieldCaption: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(8),
    letterSpacing: 0.7,
    color: BrandColors.muted,
  },
  identityInput: {
    height: 33,
    padding: 0,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
    color: BrandColors.ink,
  },
  accountButton: {
    height: 30,
    borderRadius: 7,
    backgroundColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  accountButtonText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    letterSpacing: 0.8,
    color: BrandColors.white,
  },
  authButtons: { width: "100%", flexDirection: "row", gap: 6 },
  authButton: { flex: 1 },
  authButtonDisabled: { opacity: 0.55 },
  signInPrimary: {
    height: 36,
    borderRadius: 8,
    backgroundColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  signInPrimaryText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(10),
    letterSpacing: 0.9,
    color: BrandColors.white,
  },
  createSecondary: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  createSecondaryText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    letterSpacing: 0.6,
    color: BrandColors.green,
  },
  accountActions: { flexDirection: "row", gap: 6 },
  passwordButton: {
    flex: 1.5,
    height: 30,
    borderRadius: 7,
    backgroundColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordButtonText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(7),
    letterSpacing: 0.4,
    color: BrandColors.white,
  },
  signInButton: {
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    letterSpacing: 0.8,
    color: BrandColors.green,
  },
  signOutButton: {
    flex: 1,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BrandColors.copperDark,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    letterSpacing: 0.8,
    color: BrandColors.copperDark,
  },
  passwordModalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  passwordBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,29,20,.72)",
  },
  passwordSheet: {
    width: "100%",
    maxWidth: 420,
    padding: 22,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BrandColors.copper,
    backgroundColor: BrandColors.surface,
  },
  passwordTitle: {
    marginBottom: 14,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(23),
    color: BrandColors.green,
  },
  passwordInput: {
    height: 50,
    marginTop: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BrandColors.line,
    borderRadius: 9,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(14),
    color: BrandColors.ink,
  },
  passwordActions: { marginTop: 16, flexDirection: "row", gap: 9 },
  passwordCancel: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: BrandColors.green,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordCancelText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(10),
    color: BrandColors.green,
  },
  passwordSave: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.green,
  },
  passwordSaveText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(10),
    color: BrandColors.white,
  },
  numberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BrandColors.line,
    paddingTop: 10,
  },
  numberLabel: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    color: BrandColors.muted,
    letterSpacing: 1,
  },
  passportNumber: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(17),
    color: BrandColors.green,
  },
  machineCode: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(11),
    letterSpacing: 0.5,
    color: BrandColors.ink,
  },
  paperInner: {
    flex: 1,
    borderColor: BrandColors.line,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    justifyContent: "space-between",
    rowGap: 8,
  },
  stampSlot: {
    width: "47%",
    height: "45%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  emptySlot: {
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: BrandColors.line,
  },
  stampImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.3 }],
  },
  genericStamp: {
    width: "90%",
    height: "76%",
    borderWidth: 4,
    borderColor: BrandColors.copperDark,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  genericCode: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(30),
    color: BrandColors.copperDark,
  },
  genericName: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    textAlign: "center",
    color: BrandColors.copperDark,
  },
  shareButton: {
    position: "absolute",
    top: 24,
    right: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: BrandColors.greenDeep,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonCompact: {
    top: 17,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  pagination: { height: 80, alignItems: "center", paddingTop: 5 },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "92%",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dot },
  dotActive: { backgroundColor: BrandColors.copper },
  pageCount: {
    marginTop: 8,
    color: colors.muted,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
  },
});
