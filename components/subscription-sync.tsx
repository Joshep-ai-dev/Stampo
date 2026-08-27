import { useEffect } from "react";
import { AppState } from "react-native";
import type { CustomerInfo } from "react-native-purchases";

import { api } from "@/services/api";

import {
  configureSubscriptions,
  isKrooPlus,
  Purchases,
  subscriptionsAreConfigured,
} from "@/services/subscriptions";
import {
  subscriptionFailed,
  subscriptionLoading,
  subscriptionUpdated,
} from "@/store/subscription-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function SubscriptionSync() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.profile.userId);

  useEffect(() => {
    let active = true;
    const update = (customerInfo: CustomerInfo) => {
      if (!active) return;
      const hasKrooPlus = isKrooPlus(customerInfo);
      dispatch(
        subscriptionUpdated({
          configured: true,
          isKrooPlus: hasKrooPlus,
        }),
      );
      if (userId) {
        void api.setPlan(hasKrooPlus ? "pro" : "free").catch(() => undefined);
      }
    };

    dispatch(subscriptionLoading());
    void configureSubscriptions(userId)
      .then((customerInfo) => {
        if (!active) return;
        if (customerInfo) {
          Purchases.addCustomerInfoUpdateListener(update);
          update(customerInfo);
        }
        else
          dispatch(
            subscriptionUpdated({ configured: false, isKrooPlus: false }),
          );
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatch(
          subscriptionFailed(
            error instanceof Error
              ? error.message
              : "Could not check Kroo+ access.",
          ),
        );
      });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState !== "active" || !subscriptionsAreConfigured()) return;
        void Purchases.getCustomerInfo().then(update).catch(() => undefined);
      },
    );

    return () => {
      active = false;
      appStateSubscription.remove();
      if (subscriptionsAreConfigured())
        Purchases.removeCustomerInfoUpdateListener(update);
    };
  }, [dispatch, userId]);

  return null;
}
