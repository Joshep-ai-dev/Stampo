import * as Location from "expo-location";

export type GpsVerificationStatus =
  | "unverified"
  | "gps_verified"
  | "gps_failed";

export type GpsVerification = {
  status: GpsVerificationStatus;
  checkedAt?: string;
  matchedCountryCode?: string;
  accuracyMeters?: number | null;
  reason?: string;
};

export async function verifyVisitCountryByGps(countryCode: string) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return {
      status: "gps_failed",
      checkedAt: new Date().toISOString(),
      reason: "Location permission denied",
    } satisfies GpsVerification;
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const [address] = await Location.reverseGeocodeAsync({
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  });
  const matchedCountryCode = address?.isoCountryCode?.toUpperCase();
  const expectedCountryCode = countryCode.toUpperCase();

  return {
    status:
      matchedCountryCode === expectedCountryCode
        ? "gps_verified"
        : "gps_failed",
    checkedAt: new Date().toISOString(),
    matchedCountryCode,
    accuracyMeters: current.coords.accuracy,
    reason: matchedCountryCode
      ? undefined
      : "Could not detect current country",
  } satisfies GpsVerification;
}
