import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
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
import {
  travelStateHydrated,
  visitsCleared,
  visitsHydrated,
} from "@/store/travel-slice";

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

function IdentityPage({
  profile,
  krooNumber,
  width,
  height,
}: {
  profile: ProfileState;
  krooNumber: string;
  width: number;
  height: number;
}) {
  const dispatch = useAppDispatch();
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
      const photoUri = result.assets[0].uri;
      dispatch(photoChanged(photoUri));
      if (profile.isSignedIn) {
        void api.updateProfile({ ...profile, photoUri }).catch(() => undefined);
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
    dispatch(visitsCleared());
    setAuthBusy(true);
    const [visitsResult, travelStateResult] = await Promise.allSettled([
      api.listVisits(),
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
      dispatch(visitsCleared());
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
        <View style={styles.identityHeading}>
          <Text style={styles.identityCountry}>STAMPО TRAVEL PASSPORT</Text>
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
            >{`P<STAMPO<${(draft.name || "TRAVELLER").toUpperCase().replace(/\s/g, "<")}<<<<<<<<`}</Text>
            <Text
              style={styles.machineCode}
            >{`${krooNumber.replace(/-/g, "")}<<<<<<<<<<<<<<<<<<`}</Text>
          </>
        ) : (
          <ScrollView
            style={styles.authPage}
            contentContainerStyle={styles.authPageContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.authSeal}>
              <Image
                source={require("@/assets/images/favicon.png")}
                style={styles.authKrooMark}
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
  const [activePage, setActivePage] = useState(0);
  const listRef = useRef<FlatList<PassportPage>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      setActivePage(0);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }, []),
  );
  const pageWidth = Math.min(screenWidth - 36, 620);
  const pageHeight = Math.min(screenHeight - 190, pageWidth * 1.48);
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

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActivePage(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.carouselArea}>
          <Animated.FlatList
          ref={listRef}
          data={passportPages}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(page) => page.id}
          onMomentumScrollEnd={handleScrollEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          renderItem={({ item, index }) => {
            const inputRange = [
              (index - 1) * screenWidth,
              index * screenWidth,
              (index + 1) * screenWidth,
            ];
            const rotateY = scrollX.interpolate({
              inputRange,
              outputRange: ["-55deg", "0deg", "55deg"],
              extrapolate: "clamp",
            });
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1, 0.9],
              extrapolate: "clamp",
            });
            return (
              <View style={[styles.pageFrame, { width: screenWidth }]}>
                <Animated.View
                  style={[
                    styles.turningPage,
                    {
                      transform: [
                        { perspective: 1100 },
                        { rotateY },
                        { scale },
                      ],
                    },
                  ]}
                >
                  {item.type === "cover" ? (
                    <Image
                      source={item.image}
                      style={{ width: pageHeight, height: pageHeight }}
                      contentFit="contain"
                    />
                  ) : item.type === "identity" ? (
                    <IdentityPage
                      profile={profile}
                      krooNumber={krooNumber}
                      width={pageWidth}
                      height={pageHeight}
                    />
                  ) : (
                    <StampPage
                      slots={item.slots}
                      width={pageWidth}
                      height={pageHeight}
                      onStampPress={(stamp) =>
                        router.push(`/country/${stamp.code}` as never)
                      }
                    />
                  )}
                </Animated.View>
              </View>
            );
          }}
          />
          <TouchableOpacity
          style={styles.shareButton}
          onPress={() =>
            void Share.share({
              message: `My Stampo passport — ${Math.max(0, passportPages.length - 2)} stamp pages.`,
            })
          }
        >
          <Ionicons name="arrow-redo-sharp" size={36} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.pagination}>
        <View style={styles.dots}>
          {passportPages.map((page, index) => (
            <TouchableOpacity
              key={page.id}
              style={[styles.dot, index === activePage && styles.dotActive]}
              onPress={() => {
                listRef.current?.scrollToIndex({ index, animated: true });
                setActivePage(index);
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
    overflow: "hidden",
  },
  turningPage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
  },
  paper: {
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.paperBorder,
    borderRadius: 18,
    padding: 9,
    elevation: 2,
  },
  identityPaper: { padding: 20, justifyContent: "space-between" },
  identityHeading: {
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.line,
    paddingBottom: 10,
  },
  identityCountry: {
    fontFamily: "Lora_700Bold",
    fontSize: 19,
    color: BrandColors.green,
    letterSpacing: 1.2,
  },
  identityType: {
    marginTop: 3,
    fontFamily: "Lora_500Medium",
    fontSize: 10,
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
  authSeal: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  authKrooMark: {
    width: 137,
    height: 137,
    transform: [{ translateX: 9 }],
  },
  authTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 24,
    color: BrandColors.green,
    textAlign: "center",
  },
  authIntro: {
    maxWidth: 300,
    marginTop: 6,
    marginBottom: 20,
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    lineHeight: 17,
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
    fontSize: 9,
    letterSpacing: 1,
    color: BrandColors.muted,
  },
  authInput: {
    height: 42,
    padding: 0,
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
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
    fontSize: 9,
    color: BrandColors.muted,
  },
  identityFields: { flex: 1, gap: 7 },
  identityField: { borderBottomWidth: 1, borderBottomColor: BrandColors.line },
  fieldCaption: {
    fontFamily: "Lora_700Bold",
    fontSize: 8,
    letterSpacing: 0.7,
    color: BrandColors.muted,
  },
  identityInput: {
    height: 33,
    padding: 0,
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
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
    fontSize: 9,
    letterSpacing: 0.8,
    color: BrandColors.white,
  },
  authButtons: { width: "100%", flexDirection: "row", gap: 6 },
  authButton: { flex: 1 },
  authButtonDisabled: { opacity: 0.55 },
  signInPrimary: {
    height: 42,
    borderRadius: 8,
    backgroundColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  signInPrimaryText: {
    fontFamily: "Lora_700Bold",
    fontSize: 10,
    letterSpacing: 0.9,
    color: BrandColors.white,
  },
  createSecondary: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  createSecondaryText: {
    fontFamily: "Lora_700Bold",
    fontSize: 9,
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
    fontSize: 7,
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
    fontSize: 9,
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
    fontSize: 9,
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
    fontSize: 23,
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
    fontSize: 14,
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
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 9,
    color: BrandColors.muted,
    letterSpacing: 1,
  },
  passportNumber: {
    fontFamily: "Lora_700Bold",
    fontSize: 17,
    color: BrandColors.green,
  },
  machineCode: {
    fontFamily: "Lora_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    color: BrandColors.ink,
  },
  paperInner: {
    flex: 1,
    borderWidth: 1,
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
    width: "49%",
    height: "47%",
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
    transform: [{ scale: 1.35 }],
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
    fontSize: 30,
    color: BrandColors.copperDark,
  },
  genericName: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 12,
    textAlign: "center",
    color: BrandColors.copperDark,
  },
  shareButton: {
    position: "absolute",
    top: 24,
    right: 14,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: BrandColors.greenDeep,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 20,
  },
});
