import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  deepLinkToSubscriptions,
  type ProductSubscription,
  type Purchase,
  useIAP,
} from "expo-iap";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Platform } from "react-native";

import { api } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  subscriptionFailed,
  subscriptionLoading,
  subscriptionUpdated,
} from "@/store/subscription-slice";

export type KrooPlusPlan = "monthly" | "annual";

const MONTHLY_PRODUCT_ID =
  process.env.EXPO_PUBLIC_KROO_PLUS_MONTHLY_PRODUCT_ID ?? "kroo_plus";
const ANNUAL_PRODUCT_ID =
  process.env.EXPO_PUBLIC_KROO_PLUS_ANNUAL_PRODUCT_ID ?? "kroo_plus";
const MONTHLY_BASE_PLAN_ID =
  process.env.EXPO_PUBLIC_KROO_PLUS_MONTHLY_BASE_PLAN_ID ?? "monthly";
const ANNUAL_BASE_PLAN_ID =
  process.env.EXPO_PUBLIC_KROO_PLUS_ANNUAL_BASE_PLAN_ID ?? "annual";
const ANDROID_PACKAGE_NAME = "com.darkhorse9372.Stampo";
const PRODUCT_IDS = [...new Set([MONTHLY_PRODUCT_ID, ANNUAL_PRODUCT_ID])];

type BillingContextValue = {
  configured: boolean;
  prices: { monthly: string | null; annual: string | null };
  purchase: (plan: KrooPlusPlan) => Promise<void>;
  restore: () => Promise<boolean>;
  manage: () => Promise<void>;
};

const BillingContext = createContext<BillingContextValue | null>(null);

function planProductId(plan: KrooPlusPlan) {
  return plan === "monthly" ? MONTHLY_PRODUCT_ID : ANNUAL_PRODUCT_ID;
}

function planBaseId(plan: KrooPlusPlan) {
  return plan === "monthly" ? MONTHLY_BASE_PLAN_ID : ANNUAL_BASE_PLAN_ID;
}

function findProduct(products: ProductSubscription[], plan: KrooPlusPlan) {
  return products.find((product) => product.id === planProductId(plan));
}

function findAndroidOffer(product: ProductSubscription | undefined, plan: K rooPlusPlan) {
  if (!product || product.platform !== "android") return undefined;
  return product.subscriptionOffers.find(
    (offer) => offer.basePlanIdAndroid === planBaseId(plan),
  ) ?? product.subscriptionOffers[0];
}

function DisabledBillingProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(subscriptionUpdated({ configured: false, isKrooPlus: false }));
  }, [dispatch]);
  const value = useMemo<BillingContextValue>(() => ({
    configured: false,
    prices: { monthly: null, annual: null },
    purchase: async () => { throw new Error("Google Play Billing is unavailable in Expo Go. Install a development or production build."); },
    restore: async () => false,
    manage: async () => { throw new Error("Google Play Billing is unavailable in Expo Go."); },
  }), []);
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

function NativeBillingProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.profile.userId);
  const finishRef = useRef<(purchase: Purchase) => Promise<void>>(async () => undefined);

  const updateEntitlement = useCallback((active: boolean) => {
    dispatch(subscriptionUpdated({ configured: true, isKrooPlus: active }));
    if (userId) void api.setPlan(active ? "pro" : "free").catch(() => undefined);
  }, [dispatch, userId]);

  const onPurchaseSuccess = useCallback((purchase: Purchase) => {
    if (!PRODUCT_IDS.includes(purchase.productId)) return;
    void finishRef.current(purchase).then(() => updateEntitlement(true)).catch((error: unknown) => {
      dispatch(subscriptionFailed(error instanceof Error ? error.message : "Could not complete the purchase."));
    });
  }, [dispatch, updateEntitlement]);

  const iap = useIAP({
    onPurchaseSuccess,
    onPurchaseError: (error) => dispatch(subscriptionFailed(error.message)),
    onError: (error) => dispatch(subscriptionFailed(error.message)),
  });
  const {
    connected,
    subscriptions,
    fetchProducts,
    finishTransaction,
    getActiveSubscriptions,
    hasActiveSubscriptions,
    requestPurchase,
    restorePurchases,
  } = iap;

  finishRef.current = (purchase) => finishTransaction({ purchase, isConsumable: false });

  const refreshEntitlement = useCallback(async () => {
    const active = await hasActiveSubscriptions(PRODUCT_IDS);
    updateEntitlement(active);
    await getActiveSubscriptions(PRODUCT_IDS);
    return active;
  }, [getActiveSubscriptions, hasActiveSubscriptions, updateEntitlement]);

  useEffect(() => {
    if (!connected) {
      dispatch(subscriptionLoading());
      return;
    }
    void Promise.all([
      fetchProducts({ skus: PRODUCT_IDS, type: "subs" }),
      refreshEntitlement(),
    ]).catch((error: unknown) => {
      dispatch(subscriptionFailed(error instanceof Error ? error.message : "Could not connect to Google Play Billing."));
    });
  }, [connected, dispatch, fetchProducts, refreshEntitlement]);

  const purchase = useCallback(async (plan: KrooPlusPlan) => {
    if (!connected) throw new Error("Google Play Billing is not connected yet.");
    const product = findProduct(subscriptions, plan);
    if (!product) throw new Error(`The Kroo+ ${plan} product is not available in Google Play.`);
    const offer = findAndroidOffer(product, plan);
    if (!offer?.offerTokenAndroid) throw new Error(`The Kroo+ ${plan} base plan is not active in Google Play Console.`);
    await requestPurchase({
      request: {
        google: {
          skus: [product.id],
          subscriptionOffers: [{ sku: product.id, offerToken: offer.offerTokenAndroid }],
          obfuscatedAccountId: userId || undefined,
        },
      },
      type: "subs",
    });
  }, [connected, requestPurchase, subscriptions, userId]);

  const restore = useCallback(async () => {
    if (!connected) throw new Error("Google Play Billing is not connected yet.");
    await restorePurchases();
    return refreshEntitlement();
  }, [connected, refreshEntitlement, restorePurchases]);

  const manage = useCallback(() => deepLinkToSubscriptions({
    packageNameAndroid: ANDROID_PACKAGE_NAME,
    skuAndroid: MONTHLY_PRODUCT_ID,
  }), []);

  const prices = useMemo(() => ({
    monthly: findAndroidOffer(findProduct(subscriptions, "monthly"), "monthly")?.displayPrice ?? findProduct(subscriptions, "monthly")?.displayPrice ?? null,
    annual: findAndroidOffer(findProduct(subscriptions, "annual"), "annual")?.displayPrice ?? findProduct(subscriptions, "annual")?.displayPrice ?? null,
  }), [subscriptions]);

  const value = useMemo<BillingContextValue>(() => ({
    configured: connected,
    prices,
    purchase,
    restore,
    manage,
  }), [connected, manage, prices, purchase, restore]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const unavailable = Platform.OS !== "android" || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  return unavailable
    ? <DisabledBillingProvider>{children}</DisabledBillingProvider>
    : <NativeBillingProvider>{children}</NativeBillingProvider>;
}

export function useKrooPlusBilling() {
  const value = useContext(BillingContext);
  if (!value) throw new Error("useKrooPlusBilling must be used inside SubscriptionProvider.");
  return value;
}
