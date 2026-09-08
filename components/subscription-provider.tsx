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
import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
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
const MONTHLY_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_MONTHLY_PACKAGE_ID ?? "$rc_monthly";
const ANNUAL_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ANNUAL_PACKAGE_ID ?? "$rc_annual";

type BillingContextValue = {
  configured: boolean;
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

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.profile.userId);
  const apiKey = revenueCatApiKey();
  const [ready, setReady] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const customerInfoRef = useRef<CustomerInfo | null>(null);
  const identifiedUserRef = useRef<string | null>(null);

  const applyServerEntitlement = useCallback(async () => {
    if (!userId) {
      dispatch(subscriptionUpdated({ configured: Boolean(apiKey), isKrooPlus: false }));
      return false;
    }
    const entitlement = await api.syncRevenueCatSubscription();
    dispatch(subscriptionUpdated({
      configured: Boolean(apiKey),
      isKrooPlus: entitlement.isKrooPlus,
    }));
    return entitlement.isKrooPlus;
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
      customerInfoRef.current = customerInfo;
      setOffering(offerings.all[OFFERING_ID] ?? offerings.current);
      setReady(true);
      await applyServerEntitlement();
    };

    void initialize().catch((error: unknown) => {
      if (cancelled) return;
      setReady(false);
      dispatch(subscriptionFailed(messageFrom(error)));
    });
    return () => { cancelled = true; };
  }, [apiKey, applyServerEntitlement, dispatch, userId]);

  useEffect(() => {
    if (!ready) return;
    const listener = (customerInfo: CustomerInfo) => {
      customerInfoRef.current = customerInfo;
      if (userId) void applyServerEntitlement().catch(() => undefined);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
  }, [applyServerEntitlement, ready, userId]);

  const purchase = useCallback(async (plan: KrooPlusPlan) => {
    if (!userId) throw new Error("Sign in before purchasing Kroo+.");
    if (!ready) throw new Error("RevenueCat is not configured yet.");
    const selectedPackage: PurchasesPackage | null = packageForPlan(offering, plan);
    if (!selectedPackage) {
      throw new Error(`The Kroo+ ${plan} package is missing from the RevenueCat offering.`);
    }
    try {
      const result = await Purchases.purchasePackage(selectedPackage);
      customerInfoRef.current = result.customerInfo;
      await applyServerEntitlement();
    } catch (error) {
      if (!wasCancelled(error)) throw error;
    }
  }, [applyServerEntitlement, offering, ready, userId]);

  const restore = useCallback(async () => {
    if (!userId) throw new Error("Sign in before restoring Kroo+.");
    if (!ready) throw new Error("RevenueCat is not configured yet.");
    customerInfoRef.current = await Purchases.restorePurchases();
    return applyServerEntitlement();
  }, [applyServerEntitlement, ready, userId]);

  const manage = useCallback(async () => {
    if (!ready) throw new Error("RevenueCat is not configured yet.");
    await Purchases.showManageSubscriptions();
  }, [ready]);

  const prices = useMemo(() => ({
    monthly: packageForPlan(offering, "monthly")?.product.priceString ?? null,
    annual: packageForPlan(offering, "annual")?.product.priceString ?? null,
  }), [offering]);

  const value = useMemo<BillingContextValue>(() => ({
    configured: ready,
    prices,
    purchase,
    restore,
    manage,
  }), [manage, prices, purchase, ready, restore]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useKrooPlusBilling() {
  const value = useContext(BillingContext);
  if (!value) throw new Error("useKrooPlusBilling must be used inside SubscriptionProvider.");
  return value;
}
