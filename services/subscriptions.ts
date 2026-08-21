import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

export const KROO_PLUS_ENTITLEMENT = "kroo_plus";
export type KrooPlusPlan = "monthly" | "annual";

const platformApiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
});

let configured = false;
let configuredAppUserID: string | null = null;

export function isKrooPlus(customerInfo: CustomerInfo) {
  return customerInfo.entitlements.active[KROO_PLUS_ENTITLEMENT] !== undefined;
}

export async function configureSubscriptions(appUserID?: string | null) {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  // Production store keys are rejected by RevenueCat's Expo Go preview mode.
  // Real subscriptions remain available in native development/production builds.
  if (!platformApiKey || Platform.OS === "web" || isExpoGo) return null;

  if (!configured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({
      apiKey: platformApiKey,
      appUserID: appUserID || undefined,
    });
    configured = true;
    configuredAppUserID = appUserID ?? null;
  } else if (appUserID && configuredAppUserID !== appUserID) {
    await Purchases.logIn(appUserID);
    configuredAppUserID = appUserID;
  } else if (!appUserID && configuredAppUserID) {
    await Purchases.logOut();
    configuredAppUserID = null;
  }

  return Purchases.getCustomerInfo();
}

export function subscriptionsAreConfigured() {
  return configured;
}

export async function presentKrooPlusPaywall() {
  if (!configured) throw new Error("Kroo+ payments are not configured yet.");
  await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: KROO_PLUS_ENTITLEMENT,
    displayCloseButton: true,
  });
  return Purchases.getCustomerInfo();
}

export async function purchaseKrooPlus(plan: KrooPlusPlan) {
  if (!configured) throw new Error("Kroo+ payments are not configured yet.");

  const offerings = await Purchases.getOfferings();
  const offering = offerings.current;
  if (!offering) {
    throw new Error(
      "Kroo+ plans are not available. Check the RevenueCat offering configuration.",
    );
  }

  const selectedPackage =
    plan === "annual" ? offering.annual : offering.monthly;
  if (!selectedPackage) {
    throw new Error(
      `The Kroo+ ${plan} plan is not available in the current offering.`,
    );
  }

  const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
  return customerInfo;
}

export async function getKrooPlusPlanPrices() {
  if (!configured) return null;
  const offering = (await Purchases.getOfferings()).current;
  if (!offering) return null;
  return {
    monthly: offering.monthly?.product.priceString ?? null,
    annual: offering.annual?.product.priceString ?? null,
  };
}

export async function restoreKrooPlus() {
  if (!configured) throw new Error("Kroo+ payments are not configured yet.");
  return Purchases.restorePurchases();
}

export async function manageKrooPlus() {
  if (!configured) throw new Error("Kroo+ payments are not configured yet.");
  await RevenueCatUI.presentCustomerCenter();
  return Purchases.getCustomerInfo();
}

export { Purchases };
