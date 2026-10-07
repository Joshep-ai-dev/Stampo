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
  PRODUCT_CATEGORY,
} from "react-native-purchases";

import { api, type MembershipGift, type SubscriptionEntitlement } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  subscriptionFailed,
  subscriptionLoading,
  subscriptionUpdated,
} from "@/store/subscription-slice";

export type KrooPlusPlan = "monthly" | "annual";

const OFFERING_ID = process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? "default";
const GIFT_OFFERING_ID = process.env.EXPO_PUBLIC_REVENUECAT_GIFT_OFFERING_ID ?? "gifts";
const GIFT_PACKAGE_ID = process.env.EXPO_PUBLIC_REVENUECAT_GIFT_PACKAGE_ID ?? "kroo_plus_gift_year";
const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? "kroo_plus";
const MONTHLY_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_MONTHLY_PACKAGE_ID ?? "$rc_monthly";
const ANNUAL_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ANNUAL_PACKAGE_ID ?? "$rc_annual";
const BILLING_UNAVAILABLE_MESSAGE =
  "Google Play Billing is unavailable on this device. Sign in to the Play Store or use a Google Play-enabled device.";

let revenueCatLogHandlerConfigured = false;

type BillingContextValue = {
  configured: boolean;
  ready: boolean;
  connecting: boolean;
  error: string | null;
  retry: () => void;
  prices: { monthly: string | null; annual: string | null };
  purchase: (plan: KrooPlusPlan) => Promise<boolean>;
  giftPrice: string | null;
  purchaseGift: (email: string, message: string) => Promise<MembershipGift | null>;
  updateEntitlement: (entitlement: SubscriptionEntitlement) => void;
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

function configureRevenueCatLogging() {
  if (revenueCatLogHandlerConfigured) return;
  revenueCatLogHandlerConfigured = true;
  Purchases.setLogHandler((level, message) => {
    if (message.includes("Billing is not available in this device")) {
      if (__DEV__) console.warn(`[RevenueCat] ${BILLING_UNAVAILABLE_MESSAGE}`);
      return;
    }
    if (level === LOG_LEVEL.ERROR) console.error(`[RevenueCat] ${message}`);
    else if (level === LOG_LEVEL.WARN) console.warn(`[RevenueCat] ${message}`);
    else if (__DEV__) console.log(`[RevenueCat] ${message}`);
  });
  void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
}

function packageForPlan(
  offering: PurchasesOffering | null,
  plan: KrooPlusPlan,
) {
  if (!offering) return null;
  const identifier =
    plan === "monthly" ? MONTHLY_PACKAGE_ID : ANNUAL_PACKAGE_ID;
  return (
    offering.availablePackages.find((item) => item.identifier === identifier) ??
    (plan === "monthly" ? offering.monthly : offering.annual)
  );
}

export function revenueCatErrorMessage(error: unknown) {
  if (typeof error === "object" && error) {
    if (
      "underlyingErrorMessage" in error
      && typeof error.underlyingErrorMessage === "string"
      && error.underlyingErrorMessage.trim()
    ) {
      return error.underlyingErrorMessage;
    }
    if ("message" in error) return String(error.message);
  }
  return "RevenueCat could not complete this request.";
}

function wasCancelled(error: unknown) {
  return (
    typeof error === "object" &&
    error &&
    "userCancelled" in error &&
    error.userCancelled === true
  );
}

function wasAlreadyPurchased(error: unknown) {
  return (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR
  );
}

function hasActiveKrooPlus(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.profile.userId);
  const apiKey = revenueCatApiKey();
  const [ready, setReady] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [giftPackage, setGiftPackage] = useState<PurchasesPackage | null>(null);
  const [expirationAt, setExpirationAt] = useState<number | null>(null);
  const customerInfoRef = useRef<CustomerInfo | null>(null);
  const serverExpiresAtRef = useRef<number | null>(null);
  const identifiedUserRef = useRef<string | null>(null);

  const updateEntitlement = useCallback((entitlement: SubscriptionEntitlement) => {
    serverExpiresAtRef.current = entitlement.expiresAt ? Date.parse(entitlement.expiresAt) : null;
    setExpirationAt(serverExpiresAtRef.current);
    dispatch(subscriptionUpdated({ configured: Boolean(apiKey), isKrooPlus: entitlement.isKrooPlus }));
  }, [apiKey, dispatch]);

  const applyCustomerInfo = useCallback(
    (customerInfo: CustomerInfo) => {
      customerInfoRef.current = customerInfo;
      const entitlement = customerInfo.entitlements.all[ENTITLEMENT_ID];
      setExpirationAt(entitlement?.expirationDateMillis ?? null);
      const isKrooPlus = hasActiveKrooPlus(customerInfo) || (serverExpiresAtRef.current !== null && serverExpiresAtRef.current > Date.now());
      dispatch(
        subscriptionUpdated({
          configured: Boolean(apiKey),
          isKrooPlus,
        }),
      );
      return isKrooPlus;
    },
    [apiKey, dispatch],
  );

  const applyServerEntitlement = useCallback(
    async (_customerInfo?: CustomerInfo) => {
      if (!userId) {
        dispatch(
          subscriptionUpdated({
            configured: Boolean(apiKey),
            isKrooPlus: false,
          }),
        );
        return false;
      }
      const entitlement = await api.syncRevenueCatSubscription();
      serverExpiresAtRef.current = entitlement.expiresAt ? Date.parse(entitlement.expiresAt) : null;
      setExpirationAt(serverExpiresAtRef.current);
      const isKrooPlus = entitlement.isKrooPlus;
      dispatch(
        subscriptionUpdated({
          configured: Boolean(apiKey),
          isKrooPlus,
        }),
      );
      return isKrooPlus;
    },
    [apiKey, dispatch, userId],
  );

  useEffect(() => {
    let cancelled = false;
    serverExpiresAtRef.current = null;
    if (!apiKey) {
      setReady(false);
      setOffering(null);
      setGiftPackage(null);
      setInitializationError("Store purchases are not configured in this build. Add the RevenueCat public SDK key and rebuild Kroo.");
      dispatch(subscriptionUpdated({ configured: false, isKrooPlus: false }));
      if (userId) void api.subscriptionStatus().then((result) => {
        if (!cancelled) {
          serverExpiresAtRef.current = result.expiresAt ? Date.parse(result.expiresAt) : null;
          setExpirationAt(serverExpiresAtRef.current);
          dispatch(subscriptionUpdated({ configured: false, isKrooPlus: result.isKrooPlus }));
        }
      }).catch((error) => { if (!cancelled) dispatch(subscriptionFailed(revenueCatErrorMessage(error))); });
      return () => { cancelled = true; };
    }

    dispatch(subscriptionLoading());
    setReady(false);
    setInitializationError(null);
    setGiftPackage(null);
    const initialize = async () => {
      if (!(await Purchases.isConfigured())) {
        configureRevenueCatLogging();
        Purchases.configure({ apiKey, appUserID: userId ?? undefined });
        identifiedUserRef.current = userId;
      } else if (userId && identifiedUserRef.current !== userId) {
        await Purchases.logIn(userId);
        identifiedUserRef.current = userId;
      } else if (!userId && identifiedUserRef.current) {
        await Purchases.logOut();
        identifiedUserRef.current = null;
      }

      const [canMakePayments, customerInfo] = await Promise.all([
        Purchases.canMakePayments().catch(() => false),
        Purchases.getCustomerInfo(),
      ]);
      if (cancelled) return;
      applyCustomerInfo(customerInfo);
      if (!canMakePayments) {
        setOffering(null);
        setReady(false);
        setInitializationError(BILLING_UNAVAILABLE_MESSAGE);
        try {
          await applyServerEntitlement(customerInfo);
        } catch (error) {
          if (!cancelled) dispatch(subscriptionFailed(revenueCatErrorMessage(error)));
        }
        return;
      }
      const offerings = await Purchases.getOfferings();
      if (cancelled) return;
      setOffering(offerings.all[OFFERING_ID] ?? offerings.current);
      const gift = offerings.all[GIFT_OFFERING_ID]?.availablePackages.find((item) => item.identifier === GIFT_PACKAGE_ID);
      setGiftPackage(gift?.product.productCategory === PRODUCT_CATEGORY.NON_SUBSCRIPTION ? gift : null);
      setReady(true);
      try {
        await applyServerEntitlement(customerInfo);
      } catch (error) {
        if (!cancelled) dispatch(subscriptionFailed(revenueCatErrorMessage(error)));
      }
    };

    void initialize().catch((error: unknown) => {
      if (cancelled) return;
      setReady(false);
      setInitializationError(revenueCatErrorMessage(error));
      dispatch(subscriptionFailed(revenueCatErrorMessage(error)));
    });
    return () => {
      cancelled = true;
    };
  }, [apiKey, applyCustomerInfo, applyServerEntitlement, connectionAttempt, dispatch, userId]);

  const retry = useCallback(() => {
    setInitializationError(null);
    setReady(false);
    setConnectionAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const listener = (customerInfo: CustomerInfo) => {
      applyCustomerInfo(customerInfo);
      if (userId)
        void applyServerEntitlement(customerInfo).catch(() => undefined);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [applyCustomerInfo, applyServerEntitlement, ready, userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let expirationTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      if (!apiKey || !ready) {
        const result = await api.subscriptionStatus();
        if (cancelled) return;
        serverExpiresAtRef.current = result.expiresAt ? Date.parse(result.expiresAt) : null;
        setExpirationAt(serverExpiresAtRef.current);
        dispatch(subscriptionUpdated({ configured: Boolean(apiKey), isKrooPlus: result.isKrooPlus }));
        return;
      }
      await Purchases.invalidateCustomerInfoCache();
      const customerInfo = await Purchases.getCustomerInfo();
      if (cancelled) return;
      applyCustomerInfo(customerInfo);
      await applyServerEntitlement(customerInfo);
    };

    const refreshSafely = () => {
      void refresh().catch((error: unknown) => {
        if (!cancelled) dispatch(subscriptionFailed(revenueCatErrorMessage(error)));
      });
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refreshSafely();
      },
    );

    if (expirationAt !== null) {
      const maxTimerDelay = 2_147_000_000;
      const delay = Math.max(
        1_000,
        Math.min(expirationAt - Date.now() + 1_000, maxTimerDelay),
      );
      expirationTimer = setTimeout(refreshSafely, delay);
    }

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      if (expirationTimer) clearTimeout(expirationTimer);
    };
  }, [
    applyCustomerInfo,
    apiKey,
    applyServerEntitlement,
    dispatch,
    expirationAt,
    ready,
    userId,
  ]);

  const purchase = useCallback(
    async (plan: KrooPlusPlan) => {
      if (!userId)
        throw new Error(
          "Finish setting up your Kroo Passport before purchasing Kroo+.",
        );
      if (!apiKey)
        throw new Error("RevenueCat is not configured in this build.");
      if (!ready)
        throw new Error(
          initializationError ||
            "Kroo+ is still connecting to the store. Please wait a moment.",
        );
      const selectedPackage: PurchasesPackage | null = packageForPlan(
        offering,
        plan,
      );
      if (!selectedPackage) {
        throw new Error(
          `The Kroo+ ${plan} package is missing from the RevenueCat offering.`,
        );
      }
      try {
        const result = await Purchases.purchasePackage(selectedPackage);
        applyCustomerInfo(result.customerInfo);
        await applyServerEntitlement(result.customerInfo);
        return true;
      } catch (error) {
        if (wasCancelled(error)) return false;
        if (wasAlreadyPurchased(error)) {
          const customerInfo = await Purchases.restorePurchases();
          applyCustomerInfo(customerInfo);
          await applyServerEntitlement(customerInfo);
          return true;
        }
        throw error;
      }
    },
    [
      apiKey,
      applyCustomerInfo,
      applyServerEntitlement,
      initializationError,
      offering,
      ready,
      userId,
    ],
  );

  const restore = useCallback(async () => {
    if (!userId)
      throw new Error(
        "Finish setting up your Kroo Passport before restoring Kroo+.",
      );
    if (!apiKey) throw new Error("RevenueCat is not configured in this build.");
    if (!ready)
      throw new Error(
        "Kroo+ is still connecting. Please try again in a moment.",
      );
    const customerInfo = await Purchases.restorePurchases();
    applyCustomerInfo(customerInfo);
    return applyServerEntitlement(customerInfo);
  }, [apiKey, applyCustomerInfo, applyServerEntitlement, ready, userId]);

  const purchaseGift = useCallback(async (email: string, message: string) => {
    if (!userId) throw new Error("Join or sign into Kroo before buying a gift.");
    if (!ready || !giftPackage) throw new Error("The prepaid gift product is not available yet. Please try again later.");
    const gift = await api.createMembershipGift(email, message, giftPackage.product.identifier);
    if (gift.status !== "pending") return gift;
    // The server saves the recipient before opening the store and recovers verified payments.
    if (!gift.checkoutAllowed) {
      const recovered = await api.verifyMembershipGift(gift.id);
      if (recovered.status !== "pending") return recovered;
      throw new Error("A gift payment is already pending verification. We’ll email your friend automatically once it is confirmed. Please don’t purchase again. Contact support if you cancelled the store purchase.");
    }
    try {
      await Purchases.purchasePackage(giftPackage);
    } catch (error) {
      if (wasCancelled(error)) {
        await api.cancelMembershipGift(gift.id);
        return null;
      }
      throw error;
    }
    const verified = await api.verifyMembershipGift(gift.id);
    if (verified.status === "pending") throw new Error("Your payment is awaiting verification. We’ll email your friend automatically once it is confirmed. Please don’t purchase again.");
    return verified;
  }, [giftPackage, ready, userId]);

  const manage = useCallback(async () => {
    if (!apiKey) throw new Error("RevenueCat is not configured in this build.");
    if (!ready)
      throw new Error(
        "Kroo+ is still connecting. Please try again in a moment.",
      );
    await Purchases.showManageSubscriptions();
  }, [apiKey, ready]);

  const prices = useMemo(
    () => ({
      monthly: packageForPlan(offering, "monthly")?.product.priceString ?? null,
      annual: packageForPlan(offering, "annual")?.product.priceString ?? null,
    }),
    [offering],
  );

  const value = useMemo<BillingContextValue>(
    () => ({
      configured: Boolean(apiKey),
      ready,
      connecting: Boolean(apiKey) && !ready && initializationError === null,
      error: initializationError,
      retry,
      prices,
      purchase,
      giftPrice: giftPackage?.product.priceString ?? null,
      purchaseGift,
      updateEntitlement,
      restore,
      manage,
    }),
    [apiKey, giftPackage, initializationError, manage, prices, purchase, purchaseGift, ready, restore, retry, updateEntitlement],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useKrooPlusBilling() {
  const value = useContext(BillingContext);
  if (!value)
    throw new Error(
      "useKrooPlusBilling must be used inside SubscriptionProvider.",
    );
  return value;
}
