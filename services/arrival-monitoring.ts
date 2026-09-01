import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { api, type NearbyCatalogPlace } from "@/services/api";

export const ARRIVAL_LOCATION_TASK = "stampo-kroo-plus-arrivals";
const LAST_ARRIVAL_KEY = "stampo:last-arrival";
const LAST_NEARBY_PLACE_KEY = "stampo:last-nearby-place";
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function notificationsModule() {
  return import("expo-notifications");
}

export type ArrivalSuggestion = {
  latitude: number;
  longitude: number;
  city: string;
  cityCandidates?: string[];
  country: string;
  countryCode: string;
  region: string;
  airport: string;
  detectedAt: string;
  nearbyPlace?: NearbyCatalogPlace;
};

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
  // Reverse geocoders vary by platform and country. A position inside a city
  // may be returned as its village, district, county, prefecture, or region.
  const cityCandidates = [
    address.city,
    address.subregion,
    address.district,
    address.region,
  ].filter(
    (value, index, values): value is string =>
      Boolean(value?.trim()) &&
      values.findIndex(
        (candidate) => candidate?.trim().toLocaleLowerCase() === value?.trim().toLocaleLowerCase(),
      ) === index,
  );
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    city: cityCandidates[0] ?? "",
    cityCandidates,
    country: address.country ?? address.isoCountryCode,
    countryCode: address.isoCountryCode.toUpperCase(),
    region: address.region ?? "",
    airport,
    detectedAt: new Date().toISOString(),
  } as ArrivalSuggestion;
}

async function notifyForArrival(location: Location.LocationObject) {
  const arrival = await arrivalFromLocation(location);
  if (!arrival?.city) return;
  const nearbyPlace = await api
    .nearbyCatalogPlaces(location.coords.latitude, location.coords.longitude)
    .then((places) => places[0] ?? null)
    .catch(() => null);
  if (nearbyPlace) {
    const previousPlace = await AsyncStorage.getItem(LAST_NEARBY_PLACE_KEY);
    if (previousPlace !== nearbyPlace.type + ":" + nearbyPlace.id) {
      await AsyncStorage.setItem(
        LAST_NEARBY_PLACE_KEY,
        nearbyPlace.type + ":" + nearbyPlace.id,
      );
      arrival.nearbyPlace = nearbyPlace;
      if (nearbyPlace.type === "airport") {
        const code = nearbyPlace.iataCode || nearbyPlace.icaoCode;
        arrival.airport = `${nearbyPlace.name}${code ? ` (${code})` : ""}`;
      }
    }
  }
  const previousRaw = await AsyncStorage.getItem(LAST_ARRIVAL_KEY);
  const previous = previousRaw
    ? (JSON.parse(previousRaw) as ArrivalSuggestion)
    : null;
  const isRecentDuplicate =
    previous?.city === arrival.city &&
    previous?.countryCode === arrival.countryCode &&
    Date.now() - new Date(previous.detectedAt).getTime() < 24 * 60 * 60 * 1000;
  if (isRecentDuplicate && !arrival.nearbyPlace) return;

  await AsyncStorage.setItem(LAST_ARRIVAL_KEY, JSON.stringify(arrival));
  const Notifications = await notificationsModule();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: arrival.nearbyPlace
        ? arrival.nearbyPlace.type === "airport"
          ? `Airport arrival: ${arrival.nearbyPlace.name}`
          : `You're near ${arrival.nearbyPlace.name}`
        : `Add your arrival in ${arrival.city}?`,
      body: arrival.airport
        ? `${arrival.airport} was detected. Confirm to add the airport, city, country, and continent as GPS verified.`
        : arrival.nearbyPlace
          ? `${Math.round(arrival.nearbyPlace.distanceMeters)} m away. Confirm your GPS-verified visit in ${arrival.city}.`
        : `You appear to be in ${arrival.city}, ${arrival.country}. Confirm to add this GPS-verified visit and its nearby airport.`,
      data: { type: "arrival", ...arrival },
      sound: "default",
    },
    trigger: null,
  });
}

if (!isExpoGo && !TaskManager.isTaskDefined(ARRIVAL_LOCATION_TASK)) {
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
  const Notifications = await notificationsModule();
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location access is required for GPS arrivals.");
  }
  const notifications = await Notifications.requestPermissionsAsync();
  if (notifications.status !== "granted") {
    throw new Error("Notifications are required for arrival suggestions.");
  }
  if (isExpoGo) {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    await notifyForArrival(location);
    return location;
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
        notificationTitle: "Kroo GPS arrivals",
        notificationBody: "Watching for a new city or airport arrival.",
        notificationColor: "#D7925F",
      },
    });
  }
  return getCurrentMapLocation();
}

export async function arrivalMonitoringEnabled() {
  if (isExpoGo) return false;
  return Location.hasStartedLocationUpdatesAsync(ARRIVAL_LOCATION_TASK);
}

export async function stopArrivalMonitoring() {
  if (isExpoGo) return;
  if (await Location.hasStartedLocationUpdatesAsync(ARRIVAL_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(ARRIVAL_LOCATION_TASK);
  }
}
