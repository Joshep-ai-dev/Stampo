import { responsiveFontSize } from "@/constants/responsive-typography";

import { Text, TextInput } from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getCountryDataList } from "countries-list";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { calculateKrooScoreFromVisits, getKrooLevel } from "@/data/kroo-score";
import { stampAssets } from "@/data/stamps";
import { api } from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { ProfileState } from "@/store/profile-slice";
import {
  emailPreferenceChanged,
  languageChanged,
  membershipStarted,
  photoChanged,
  profileDetailsChanged,
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

function formatKrooId(id: number) {
  const encoded = ((id - 1) * 7_919 + 314_159_265) % 1_000_000_000;
  let letterValue = Math.floor(encoded / 10_000);
  const numbers = String(encoded % 10_000).padStart(4, "0");
  let letters = "";
  for (let position = 0; position < 4; position += 1) {
    letters = String.fromCharCode(65 + (letterValue % 26)) + letters;
    letterValue = Math.floor(letterValue / 26);
  }
  const checksumLetter = String.fromCharCode(65 + (encoded % 26));
  const checksumDigit = Math.floor(encoded / 26) % 10;
  return `${letters[0]}${numbers[0]}${letters[1]}${numbers[1]}${letters[2]}${numbers[2]}${letters[3]}${numbers[3]}${checksumLetter}${checksumDigit}`;
}

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
  width,
  height,
}: {
  profile: ProfileState;

  width: number;
  height: number;
}) {
  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState({
    name: profile.name,
    familyName: profile.familyName,
    email: profile.email,
    phoneNumber: profile.phoneNumber,
    nationality: profile.nationality,
    dateOfBirth: profile.dateOfBirth,
    address: profile.address,
    city: profile.city,
    stateProvince: profile.stateProvince,
    postalCode: profile.postalCode,
    country: profile.country,
  });
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [idCopied, setIdCopied] = useState(false);
  const displayedKrooId =
    profile.krooNumber > 0
      ? formatKrooId(profile.krooNumber)
      : profile.formattedKrooId;
  const countries = useMemo(
    () =>
      getCountryDataList().sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [],
  );
  const filteredCountries = countries.filter((country) =>
    `${country.name} ${country.iso2} ${country.iso3}`
      .toLocaleLowerCase()
      .includes(countryQuery.trim().toLocaleLowerCase()),
  );
  const pickPhoto = async () => {
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
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (
        draft.email.trim() &&
        draft.email.trim().toLowerCase() !== profile.email.trim().toLowerCase()
      ) {
        const previousUserId = profile.userId;
        const member = await api.connectMemberEmail(
          draft.email.trim(),
          displayedKrooId,
        );
        if (member.id !== previousUserId) {
          const [remote, visits, travelState] = await Promise.all([
            api.getProfile(),
            api.listVisits(),
            api.travelState(),
          ]);
          const existingDraft = {
            name: remote.name,
            familyName: remote.familyName ?? "",
            email: remote.email,
            phoneNumber: remote.phoneNumber ?? "",
            nationality: remote.nationality ?? "",
            dateOfBirth: remote.dateOfBirth ?? "",
            address: remote.address ?? "",
            city: remote.city ?? "",
            stateProvince: remote.stateProvince ?? "",
            postalCode: remote.postalCode ?? "",
            country: remote.country ?? "",
          };
          dispatch(
            membershipStarted({
              userId: member.id,
              krooId: member.krooId,
              formattedKrooId: member.formattedKrooId,
              emailOptIn: remote.emailOptIn,
            }),
          );
          dispatch(profileDetailsChanged(existingDraft));
          dispatch(languageChanged(remote.language));
          dispatch(photoChanged(remote.photoUri));
          dispatch(visitsHydrated(visits));
          dispatch(travelStateHydrated(travelState));
          setDraft(existingDraft);
          setEditing(false);
          void dispatch(fetchHomeDashboard());
          return;
        }
      }
      await api.updateProfile(draft);
      dispatch(profileDetailsChanged(draft));
      setEditing(false);
    } catch (error) {
      Alert.alert(
        "Passport not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
      // Keep the editor open because the server remains the source of truth.
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <View style={[styles.paper, styles.identityPaper, { width, height }]}>
        <Image
          source={require("@/assets/images/other/passport_backgorund.webp")}
          style={[styles.passportPageBackground, { width }, { height }]}
          contentFit="fill"
        />
        <View style={styles.identityHeading}>
          <Text style={styles.identityCountry}>KROO PASSPORT</Text>
          <View style={styles.headingKrooIdRow}>
            <Text style={styles.krooIdLabel}>
              Kroo ID: {displayedKrooId || "Assigning…"}
            </Text>
            {displayedKrooId ? (
              <Pressable
                accessibilityLabel="Copy Kroo ID"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  void Clipboard.setStringAsync(displayedKrooId);
                  setIdCopied(true);
                  setTimeout(() => setIdCopied(false), 1500);
                }}
                style={styles.copyKrooIdButton}
              >
                <Ionicons
                  name={idCopied ? "checkmark" : "copy-outline"}
                  size={12}
                  color={BrandColors.green}
                />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.identityMotto}>
            A MORE{`\n`}CURIOUS{`\n`}YOU
          </Text>
        </View>
        <ScrollView
          style={styles.signedPassportScroll}
          contentContainerStyle={styles.signedPassportContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.passportHero}>
            <TouchableOpacity
              style={styles.photoBox}
              onPress={() => void pickPhoto()}
              accessibilityRole="button"
              accessibilityLabel={
                profile.photoUri
                  ? "Change passport photo"
                  : "Add passport photo"
              }
            >
              {profile.photoUri ? (
                <Image
                  source={{ uri: profile.photoUri }}
                  style={styles.identityPhoto}
                  contentFit="cover"
                />
              ) : (
                <>
                  <Ionicons name="person" size={64} color={BrandColors.muted} />
                  <Text style={styles.addPhoto}>ADD{`\n`}PHOTO</Text>
                  <Ionicons
                    name="camera-outline"
                    size={15}
                    color={BrandColors.muted}
                  />
                </>
              )}
            </TouchableOpacity>
            <View style={styles.passportStampContainer}>
              <Image
                source={require("@/assets/images/other/leaf.png")}
                style={styles.leafLeft}
                contentFit="contain"
              />
              <Image
                source={require("@/assets/images/favicon.png")}
                style={styles.passportStampImage}
                contentFit="contain"
              />
              <Image
                source={require("@/assets/images/other/leaf.png")}
                style={[styles.leafRight]}
                contentFit="contain"
              />
            </View>
          </View>
          <View style={styles.passportSectionHeading}>
            <Text style={styles.passportSectionTitle}>
              PERSONAL INFORMATION
            </Text>
            <Ionicons
              style={{ marginTop: 2 }}
              name="compass-outline"
              size={17}
              color={BrandColors.copperDark}
            />
          </View>
          <View style={styles.identityBody}>
            <View style={styles.identityFields}>
              <View style={styles.passportFieldRow}>
                <View style={[styles.identityField, styles.passportFieldGrow]}>
                  <Text style={styles.fieldCaption}>GIVEN NAME *</Text>
                  <View style={styles.fieldControl}>
                    <Ionicons
                      name="person-outline"
                      size={12}
                      color={BrandColors.green}
                    />
                    {editing ? (
                      <TextInput
                        value={draft.name}
                        onChangeText={(name) =>
                          setDraft((current) => ({ ...current, name }))
                        }
                        placeholder="Your name"
                        placeholderTextColor="#a89378"
                        style={styles.identityInput}
                      />
                    ) : (
                      <Text style={styles.identityValue}>
                        {draft.name || "—"}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[styles.identityField, styles.passportFieldGrow]}>
                  <Text style={styles.fieldCaption}>FAMILY NAME</Text>
                  <View style={styles.fieldControl}>
                    <Ionicons
                      name="person-outline"
                      size={12}
                      color={BrandColors.green}
                    />
                    {editing ? (
                      <TextInput
                        value={draft.familyName}
                        onChangeText={(familyName) =>
                          setDraft((current) => ({ ...current, familyName }))
                        }
                        placeholder="Your family name"
                        placeholderTextColor="#a89378"
                        autoCapitalize="words"
                        style={styles.identityInput}
                      />
                    ) : (
                      <Text style={styles.identityValue}>
                        {draft.familyName || "—"}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.passportFieldRow}>
                <View style={[styles.identityField, styles.passportFieldGrow]}>
                  <Text style={styles.fieldCaption}>EMAIL ADDRESS</Text>
                  <View style={styles.fieldControl}>
                    <Ionicons
                      name="mail-outline"
                      size={12}
                      color={BrandColors.green}
                    />
                    {editing ? (
                      <TextInput
                        value={draft.email}
                        onChangeText={(email) =>
                          setDraft((current) => ({ ...current, email }))
                        }
                        placeholder="you@example.com"
                        placeholderTextColor="#a89378"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.identityInput}
                      />
                    ) : (
                      <Text numberOfLines={1} style={styles.identityValue}>
                        {draft.email || "—"}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[styles.identityField, styles.passportFieldGrow]}>
                  <Text style={styles.fieldCaption}>PHONE NUMBER</Text>
                  <View style={styles.fieldControl}>
                    <Ionicons
                      name="call-outline"
                      size={12}
                      color={BrandColors.green}
                    />
                    {editing ? (
                      <TextInput
                        value={draft.phoneNumber}
                        onChangeText={(phoneNumber) =>
                          setDraft((current) => ({ ...current, phoneNumber }))
                        }
                        placeholder="Phone number"
                        placeholderTextColor="#a89378"
                        keyboardType="phone-pad"
                        style={styles.identityInput}
                      />
                    ) : (
                      <Text numberOfLines={1} style={styles.identityValue}>
                        {draft.phoneNumber || "—"}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.passportFieldRow}>
                <View style={[styles.identityField, styles.passportFieldGrow]}>
                  <Text style={styles.fieldCaption}>DATE OF BIRTH *</Text>
                  <TouchableOpacity
                    style={styles.fieldControl}
                    onPress={() => editing && setDatePickerVisible(true)}
                    disabled={!editing}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={BrandColors.green}
                    />
                    <Text style={styles.passportSelectText}>
                      {draft.dateOfBirth || "DD / MM / YYYY"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.identityField, styles.passportFieldGrow]}>
                  <Text style={styles.fieldCaption}>NATIONALITY</Text>
                  <TouchableOpacity
                    style={styles.fieldControl}
                    onPress={() => {
                      if (!editing) return;
                      setCountryPickerVisible(true);
                    }}
                    disabled={!editing}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={12}
                      color={BrandColors.green}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.passportSelectText, styles.authSelectText]}
                    >
                      {draft.nationality || "Select nationality"}
                    </Text>
                    {editing ? (
                      <Ionicons
                        name="chevron-down"
                        size={12}
                        color={BrandColors.muted}
                      />
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.passportSectionHeading}>
            <Text style={styles.passportSectionTitle}>EMAIL PREFERENCES</Text>
          </View>
          <View style={styles.preferenceRow}>
            <TouchableOpacity
              style={styles.emailPreference}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: profile.emailOptIn }}
              onPress={() => {
                const checked = !profile.emailOptIn;
                void api
                  .updateProfile({ ...draft, emailOptIn: checked })
                  .then(() => dispatch(emailPreferenceChanged(checked)))
                  .catch(() => undefined);
              }}
            >
              <View style={styles.preferenceCopy}>
                <Ionicons
                  name={profile.emailOptIn ? "checkbox" : "square-outline"}
                  size={14}
                  color={BrandColors.green}
                />
                <Text style={styles.preferenceText}>
                  Receive updates, travel tips and special offers
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.accountActions}>
            {editing ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.actionButtonPrimary,
                    saving && styles.actionButtonDisabled,
                  ]}
                  onPress={() => void save()}
                  disabled={saving}
                  accessibilityState={{ disabled: saving, busy: saving }}
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color={BrandColors.white}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextPrimary,
                    ]}
                  >
                    {saving ? "SAVING…" : "SAVE PASSPORT"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  disabled={saving}
                  accessibilityState={{ disabled: saving }}
                  onPress={() => {
                    setDraft({
                      name: profile.name,
                      familyName: profile.familyName,
                      email: profile.email,
                      phoneNumber: profile.phoneNumber,
                      nationality: profile.nationality,
                      dateOfBirth: profile.dateOfBirth,
                      address: profile.address,
                      city: profile.city,
                      stateProvince: profile.stateProvince,
                      postalCode: profile.postalCode,
                      country: profile.country,
                    });
                    setEditing(false);
                  }}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextSecondary,
                    ]}
                  >
                    CANCEL
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => setEditing(true)}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.actionButtonTextPrimary,
                  ]}
                >
                  EDIT PASSPORT
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
      {datePickerVisible ? (
        <DateTimePicker
          value={
            draft.dateOfBirth
              ? new Date(`${draft.dateOfBirth}T12:00:00`)
              : new Date(2000, 0, 1)
          }
          mode="date"
          maximumDate={new Date()}
          onChange={(_, date) => {
            setDatePickerVisible(Platform.OS === "ios");
            if (date)
              setDraft((current) => ({
                ...current,
                dateOfBirth: date.toISOString().slice(0, 10),
              }));
          }}
        />
      ) : null}
      <Modal
        transparent
        animationType="slide"
        visible={countryPickerVisible}
        onRequestClose={() => setCountryPickerVisible(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={styles.pickerModalRoot}>
          <Pressable
            style={styles.Backdrop}
            onPress={() => setCountryPickerVisible(false)}
          />
          <View style={styles.countrySheet}>
            <View style={styles.countryPickerHeading}>
              <Text>Nationality</Text>
              <TouchableOpacity onPress={() => setCountryPickerVisible(false)}>
                <Ionicons name="close" size={22} color={BrandColors.green} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={countryQuery}
              onChangeText={setCountryQuery}
              placeholder="Search countries"
              placeholderTextColor={BrandColors.muted}
              autoCapitalize="words"
              style={styles.countrySearch}
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredCountries.map((country) => (
                <TouchableOpacity
                  key={country.iso2}
                  style={styles.countryOption}
                  onPress={() => {
                    setDraft((current) => ({
                      ...current,
                      nationality: country.name,
                    }));
                    setCountryQuery("");
                    setCountryPickerVisible(false);
                  }}
                >
                  <Text style={styles.countryOptionCode}>{country.iso3}</Text>
                  <Text style={styles.countryOptionText}>{country.name}</Text>
                  {draft.nationality === country.name ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={BrandColors.green}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  const challengePoints = useAppSelector(
    (state) => state.travel.challengePoints,
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
  const pageHeight = Math.min(availablePageHeight, pageWidth * 1.65);
  const krooScore = useMemo(
    () =>
      calculateKrooScoreFromVisits(visits, completedSightIds, challengePoints),
    [challengePoints, completedSightIds, visits],
  );
  const krooLevel = useMemo(
    () => getKrooLevel(krooScore).toUpperCase(),
    [krooScore],
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
        image: require("@/assets/images/other/passport-front.webp"),
        accessibilityLabel: "Electronic passport front cover",
      },
      { id: "identity", type: "identity" as const },
      ...chunkStamps(stamps),
      {
        id: "back-cover",
        type: "cover" as const,
        image: require("@/assets/images/other/passport-back.webp"),
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
        {page.id === "front-cover" ? (
          <>
            <Text
              style={styles.coverLevel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {krooLevel}
            </Text>
          </>
        ) : null}
      </View>
    ) : page.type === "identity" ? (
      <IdentityPage profile={profile} width={pageWidth} height={pageHeight} />
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
  coverName: {
    position: "absolute",
    top: "10%",
    left: "12%",
    right: "12%",
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
    lineHeight: responsiveFontSize(34),
    letterSpacing: 2,
    color: BrandColors.copper,
    textShadowColor: "rgba(0,0,0,.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  coverLevel: {
    position: "absolute",
    top: "78%",
    left: "13%",
    right: "13%",
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(19),
    lineHeight: responsiveFontSize(25),
    letterSpacing: 2,
    color: "#9F6045",
    textShadowColor: "rgba(0,0,0,.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  paper: {
    backgroundColor: BrandColors.surface,
    borderWidth: 1.5,
    borderColor: colors.paperBorder,
    borderRadius: 12,
    padding: 8,
    elevation: 0,
    overflow: "hidden",
  },
  passportPageBackground: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  identityPaper: {
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },
  signedPassportScroll: {
    flex: 1,
    marginTop: 4,
  },
  signedPassportContent: {
    paddingBottom: 12,
  },
  krooIdLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    letterSpacing: 0.7,
    color: BrandColors.green,
  },
  headingKrooIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  copyKrooIdButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  identityHeading: {
    position: "relative",
  },
  identityCountry: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(19),
    color: BrandColors.green,
    letterSpacing: 1.2,
  },
  identityMotto: {
    position: "absolute",
    right: 0,
    top: 4,
    textAlign: "right",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(7),
    lineHeight: responsiveFontSize(10),
    letterSpacing: 1.6,
    color: BrandColors.green,
  },
  passportStampContainer: {
    marginLeft: -30,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
  },
  passportStampImage: {
    width: 112,
    height: 112,
  },
  leafLeft: {
    width: 50,
    height: "100%",
    marginTop: -20,
    marginRight: -20,
  },
  leafRight: {
    width: 50,
    height: "100%",
    scaleX: -1,
    marginTop: -20,
    marginLeft: -20,
  },
  passportHero: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passportSectionHeading: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BrandColors.line,
  },
  passportSectionTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(12),
    letterSpacing: 1.6,
    color: BrandColors.green,
  },
  identityBody: { paddingTop: 4 },
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
    marginBottom: 16,
  },
  authFieldCaption: { fontSize: responsiveFontSize(11), marginBottom: 4 },
  authFieldControl: { height: 42, paddingHorizontal: 12, borderRadius: 8 },
  authInput: { height: 42, fontSize: responsiveFontSize(15) },
  authSelectText: { fontSize: responsiveFontSize(12) },
  photoBox: {
    width: 90,
    height: 120,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: BrandColors.copperDark,
    backgroundColor: "#D9D1B8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  identityPhoto: { width: "100%", height: "100%" },
  addPhoto: {
    marginTop: 3,
    textAlign: "center",
    lineHeight: responsiveFontSize(12),
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(11),
    letterSpacing: 2.5,
    color: BrandColors.muted,
  },
  identityFields: { gap: 7 },
  identityField: {
    paddingTop: 0,
  },
  fieldCaption: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    letterSpacing: 0.7,
    color: BrandColors.green,
  },
  identityInput: {
    flex: 1,
    height: 30,
    padding: 0,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    color: BrandColors.ink,
  },
  identityValue: {
    flex: 1,
    height: 30,
    textAlignVertical: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    color: BrandColors.ink,
  },
  editPassportButton: {
    position: "absolute",
    right: 0,
    top: 40,
    height: 24,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BrandColors.green,
  },
  editPassportText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(9),
    letterSpacing: 0.7,
    color: BrandColors.green,
  },
  passportSelectText: {
    flex: 1,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(11),
    color: BrandColors.ink,
  },
  fieldControl: {
    height: 28,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: "rgba(132,110,91,.55)",
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  passportFieldRow: { flexDirection: "row", gap: 8 },
  passportFieldGrow: { flex: 1, flexBasis: 0, minWidth: 0 },
  authPassportRow: { width: "100%", flexDirection: "row", gap: 12 },
  authBirthdate: { width: "auto", flex: 1, flexBasis: 0, minWidth: 0 },
  pickerModalRoot: { flex: 1, justifyContent: "flex-end" },
  countrySheet: {
    maxHeight: "52%",
    padding: 16,
    paddingBottom: 22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: BrandColors.surface,
  },
  countryPickerHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countrySearch: {
    height: 42,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BrandColors.line,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(14),
    color: BrandColors.ink,
  },
  countryOption: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.line,
  },
  countryOptionCode: {
    width: 34,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(10),
    letterSpacing: 0.8,
    color: BrandColors.copperDark,
  },
  countryOptionText: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(14),
    color: BrandColors.ink,
  },
  authButtons: { width: "100%", flexDirection: "row", gap: 6 },
  authButton: { flex: 1, height: 42, borderRadius: 8 },
  authButtonText: { fontSize: responsiveFontSize(12) },
  authButtonDisabled: { opacity: 0.55 },
  actionButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 30,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonPrimary: { backgroundColor: BrandColors.green },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonSecondary: {
    borderWidth: 1,
    borderColor: BrandColors.green,
  },
  actionButtonText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(10),
    letterSpacing: 0.8,
  },
  actionButtonTextPrimary: { color: BrandColors.white },
  actionButtonTextSecondary: { color: BrandColors.green },
  accountActions: { marginTop: 20, flexDirection: "row", gap: 6 },
  preferenceRow: { flexDirection: "row", gap: 8, paddingTop: 4 },
  preferenceLanguage: { flex: 1 },
  emailPreference: { flex: 1, paddingTop: 3 },
  preferenceCopy: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  preferenceText: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveFontSize(10),
    color: BrandColors.ink,
  },
  Backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,29,20,.72)",
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
  emptySlot: {},
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
  pagination: { height: 60, alignItems: "center" },
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
    color: colors.muted,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
  },
});
