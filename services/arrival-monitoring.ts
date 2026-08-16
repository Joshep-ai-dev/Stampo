import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

export const ARRIVAL_LOCATION_TASK = "stampo-kroo-plus-arrivals";
const LAST_ARRIVAL_KEY = "stampo:last-arrival";
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function notificationsModule() {
  if (isExpoGo) {
    throw new Error(
      "GPS arrival notifications require a native development build.",
    );
  }
  return import("expo-notifications");
}

export type ArrivalSuggestion = {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  countryCode: string;
  region: string;
  airport: string;
  detectedAt: string;
};

if (!isExpoGo) {
  void notificationsModule().then((Notifications) =>
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    }),
  );
}

async function arrivalFromLocation(location: Location.LocationObject) {
  const [address] = await Location.reverseGeocodeAsync({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  });
  if (!address?.isoCountryCode) return null;

  const placeName = address.name ?? "";
  const airport = /\b(airport|aerodrome|terminal)\b/i.test(placeName)
    ? placeName
    : "";
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    city: address.city ?? address.district ?? address.subregion ?? "",
    country: address.country ?? address.isoCountryCode,
    countryCode: address.isoCountryCode.toUpperCase(),
    region: address.region ?? "",
    airport,
    detectedAt: new Date().toISOString(),
  } satisfies ArrivalSuggestion;
}

async function notifyForArrival(location: Location.LocationObject) {
  const arrival = await arrivalFromLocation(location);
  if (!arrival?.city) return;
  const previousRaw = await AsyncStorage.getItem(LAST_ARRIVAL_KEY);
  const previous = previousRaw
    ? (JSON.parse(previousRaw) as ArrivalSuggestion)
    : null;
  const isRecentDuplicate =
    previous?.city === arrival.city &&
    previous?.countryCode === arrival.countryCode &&
    Date.now() - new Date(previous.detectedAt).getTime() < 24 * 60 * 60 * 1000;
  if (isRecentDuplicate) return;

  await AsyncStorage.setItem(LAST_ARRIVAL_KEY, JSON.stringify(arrival));
  const Notifications = await notificationsModule();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Add your arrival in ${arrival.city}?`,
      body: arrival.airport
        ? `${arrival.airport} was detected. Confirm to add the airport, city, country, and continent as GPS verified.`
        : `You appear to be in ${arrival.city}, ${arrival.country}. Confirm to add this GPS-verified visit and its nearby airport.`,
      data: { type: "arrival", ...arrival },
      sound: "default",
    },
    trigger: null,
  });
}

if (!TaskManager.isTaskDefined(ARRIVAL_LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    ARRIVAL_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations.length) return;
      await notifyForArrival(data.locations.at(-1)!);
    },
  );
}

export async function getCurrentMapLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) return null;
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return Location.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000,
      requiredAccuracy: 5_000,
    }).catch(() => null);
  }
}

export async function watchCurrentMapLocation(
  onLocation: (location: Location.LocationObject) => void,
) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) return null;
  if (!(await Location.hasServicesEnabledAsync())) return null;
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25,
      timeInterval: 10_000,
    },
    onLocation,
  );
}

export async function startArrivalMonitoring() {
  if (isExpoGo) {
    throw new Error(
      "Background GPS arrivals require a development build and are unavailable in Expo Go.",
    );
  }
  const Notifications = await notificationsModule();
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location access is required for GPS arrivals.");
  }
  const notifications = await Notifications.requestPermissionsAsync();
  if (notifications.status !== "granted") {
    throw new Error("Notifications are required for arrival suggestions.");
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Always-on location is required for arrival suggestions.");
  }
  if (!(await Location.isBackgroundLocationAvailableAsync())) {
    throw new Error("Background location is unavailable on this device.");
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("arrivals", {
      name: "Travel arrivals",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  if (!(await Location.hasStartedLocationUpdatesAsync(ARRIVAL_LOCATION_TASK))) {
    await Location.startLocationUpdatesAsync(ARRIVAL_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 1_000,
      timeInterval: 15 * 60 * 1000,
      deferredUpdatesDistance: 1_000,
      deferredUpdatesInterval: 15 * 60 * 1000,
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Stampo GPS arrivals",
        notificationBody: "Watching for a new city or airport arrival.",
        notificationColor: "#D7925F",
      },
    });
  }
  return getCurrentMapLocation();
}

export async function arrivalMonitoringEnabled() {
  return Location.hasStartedLocationUpdatesAsync(ARRIVAL_LOCATION_TASK);
}
