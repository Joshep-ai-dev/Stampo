import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

import { api } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  subscriptionFailed,
  subscriptionLoading,
  subscriptionUpdated,
} from "@/store/subscription-slice";

export type KrooPlusPlan = "monthly" | "annual";

const OFFERING_ID = process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? "default";
const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? "kroo_plus";
const MONTHLY_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_MONTHLY_PACKAGE_ID ?? "$rc_monthly";
const ANNUAL_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ANNUAL_PACKAGE_ID ?? "$rc_annual";

type BillingContextValue = {
  configured: boolean;
  ready: boolean;
  prices: { monthly: string | null; annual: string | null };
  purchase: (plan: KrooPlusPlan) => Promise<void>;
  restore: () => Promise<boolean>;
  manage: () => Promise<void>;
};

const BillingContext = createContext<BillingContextValue | null>(null);

function revenueCatApiKey() {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "";
  }
  return "";
}

function packageForPlan(offering: PurchasesOffering | null, plan: KrooPlusPlan) {
  if (!offering) return null;
  const identifier = plan === "monthly" ? MONTHLY_PACKAGE_ID : ANNUAL_PACKAGE_ID;
  return offering.availablePackages.find((item) => item.identifier === identifier)
    ?? (plan === "monthly" ? offering.monthly : offering.annual);
}

function messageFrom(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return "RevenueCat could not complete this request.";
}

function wasCancelled(error: unknown) {
  return typeof error === "object" && error && "userCancelled" in error
    && error.userCancelled === true;
}

function wasAlreadyPurchased(error: unknown) {
  return typeof error === "object" && error && "code" in error
    && error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR;
}

function hasActiveKrooPlus(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.profile.userId);
  const apiKey = revenueCatApiKey();
  const [ready, setReady] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [expirationAt, setExpirationAt] = useState<number | null>(null);
  const customerInfoRef = useRef<CustomerInfo | null>(null);
  const identifiedUserRef = useRef<string | null>(null);

  const applyCustomerInfo = useCallback((customerInfo: CustomerInfo) => {
    customerInfoRef.current = customerInfo;
    const entitlement = customerInfo.entitlements.all[ENTITLEMENT_ID];
    setExpirationAt(entitlement?.expirationDateMillis ?? null);
    const isKrooPlus = hasActiveKrooPlus(customerInfo);
    dispatch(subscriptionUpdated({
      configured: Boolean(apiKey),
      isKrooPlus,
    }));
    return isKrooPlus;
  }, [apiKey, dispatch]);

  const applyServerEntitlement = useCallback(async (customerInfo?: CustomerInfo) => {
    if (!userId) {
      dispatch(subscriptionUpdated({ configured: Boolean(apiKey), isKrooPlus: false }));
      return false;
    }
    const entitlement = await api.syncRevenueCatSubscription();
    const isKrooPlus = customerInfo
      ? hasActiveKrooPlus(customerInfo)
      : entitlement.isKrooPlus;
    dispatch(subscriptionUpdated({
      configured: Boolean(apiKey),
      isKrooPlus,
    }));
    return isKrooPlus;
  }, [apiKey, dispatch, userId]);

  useEffect(() => {
    let cancelled = false;
    if (!apiKey) {
      setReady(false);
      setOffering(null);
      dispatch(subscriptionUpdated({ configured: false, isKrooPlus: false }));
      return;
    }

    dispatch(subscriptionLoading());
    setReady(false);
    const initialize = async () => {
      if (!await Purchases.isConfigured()) {
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
        Purchases.configure({ apiKey, appUserID: userId ?? undefined });
        identifiedUserRef.current = userId;
      } else if (userId && identifiedUserRef.current !== userId) {
        await Purchases.logIn(userId);
        identifiedUserRef.current = userId;
      } else if (!userId && identifiedUserRef.current) {
        await Purchases.logOut();
        identifiedUserRef.current = null;
      }

      const [offerings, customerInfo] = await Promise.all([
        Purchases.getOfferings(),
        Purchases.getCustomerInfo(),
      ]);
      if (cancelled) return;
      applyCustomerInfo(customerInfo);
      setOffering(offerings.all[OFFERING_ID] ?? offerings.current);
      setReady(true);
      try {
        await applyServerEntitlement(customerInfo);
      } catch (error) {
        if (!cancelled) dispatch(subscriptionFailed(messageFrom(error)));
      }
    };

    void initialize().catch((error: unknown) => {
      if (cancelled) return;
      setReady(false);
      dispatch(subscriptionFailed(messageFrom(error)));
    });
    return () => { cancelled = true; };
  }, [apiKey, applyCustomerInfo, applyServerEntitlement, dispatch, userId]);

  useEffect(() => {
    if (!ready) return;
    const listener = (customerInfo: CustomerInfo) => {
      applyCustomerInfo(customerInfo);
      if (userId) void applyServerEntitlement(customerInfo).catch(() => undefined);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
  }, [applyCustomerInfo, applyServerEntitlement, ready, userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    let expirationTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      await Purchases.invalidateCustomerInfoCache();
      const customerInfo = await Purchases.getCustomerInfo();
      if (cancelled) return;
      applyCustomerInfo(customerInfo);
      await applyServerEntitlement(customerInfo);
    };

    const refreshSafely = () => {
      void refresh().catch((error: unknown) => {
        if (!cancelled) dispatch(subscriptionFailed(messageFrom(error)));
      });
    };

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshSafely();
    });

    if (expirationAt !== null) {
      const maxTimerDelay = 2_147_000_000;
      const delay = Math.max(1_000, Math.min(expirationAt - Date.now() + 1_000, maxTimerDelay));
      expirationTimer = setTimeout(refreshSafely, delay);
    }

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      if (expirationTimer) clearTimeout(expirationTimer);
    };
  }, [applyCustomerInfo, applyServerEntitlement, dispatch, expirationAt, ready, userId]);

  const purchase = useCallback(async (plan: KrooPlusPlan) => {
    if (!userId) throw new Error("Sign in before purchasing Kroo+.");
    if (!apiKey) throw new Error("RevenueCat is not configured in this build.");
    if (!ready) throw new Error("Kroo+ is still connecting. Please try again in a moment.");
    const selectedPackage: PurchasesPackage | null = packageForPlan(offering, plan);
    if (!selectedPackage) {
      throw new Error(`The Kroo+ ${plan} package is missing from the RevenueCat offering.`);
    }
    try {
      const result = await Purchases.purchasePackage(selectedPackage);
      applyCustomerInfo(result.customerInfo);
      await applyServerEntitlement(result.customerInfo);
    } catch (error) {
      if (wasCancelled(error)) return;
      if (wasAlreadyPurchased(error)) {
        const customerInfo = await Purchases.restorePurchases();
        applyCustomerInfo(customerInfo);
        await applyServerEntitlement(customerInfo);
        return;
      }
      throw error;
    }
  }, [apiKey, applyCustomerInfo, applyServerEntitlement, offering, ready, userId]);

  const restore = useCallback(async () => {
    if (!userId) throw new Error("Sign in before restoring Kroo+.");
    if (!apiKey) throw new Error("RevenueCat is not configured in this build.");
    if (!ready) throw new Error("Kroo+ is still connecting. Please try again in a moment.");
    const customerInfo = await Purchases.restorePurchases();
    applyCustomerInfo(customerInfo);
    return applyServerEntitlement(customerInfo);
  }, [apiKey, applyCustomerInfo, applyServerEntitlement, ready, userId]);

  const manage = useCallback(async () => {
    if (!apiKey) throw new Error("RevenueCat is not configured in this build.");
    if (!ready) throw new Error("Kroo+ is still connecting. Please try again in a moment.");
    await Purchases.showManageSubscriptions();
  }, [apiKey, ready]);

  const prices = useMemo(() => ({
    monthly: packageForPlan(offering, "monthly")?.product.priceString ?? null,
    annual: packageForPlan(offering, "annual")?.product.priceString ?? null,
  }), [offering]);

  const value = useMemo<BillingContextValue>(() => ({
    configured: Boolean(apiKey),
    ready,
    prices,
    purchase,
    restore,
    manage,
  }), [apiKey, manage, prices, purchase, ready, restore]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useKrooPlusBilling() {
  const value = useContext(BillingContext);
  if (!value) throw new Error("useKrooPlusBilling must be used inside SubscriptionProvider.");
  return value;
}
