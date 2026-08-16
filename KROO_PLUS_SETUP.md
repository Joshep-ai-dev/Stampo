# Kroo+ store setup

The app uses one RevenueCat entitlement named `kroo_plus` for Apple App Store
and Google Play subscriptions.

1. Create the subscription products in App Store Connect and Google Play
   Console. Monthly and annual products can use different store product IDs.
2. Connect both store apps to one RevenueCat project.
3. Create the `kroo_plus` entitlement and attach every Kroo+ product to it.
4. Create a current RevenueCat offering and configure its paywall and Customer
   Center. Include purchase restoration and links to the privacy policy and
   terms.
5. Add the platform-specific public SDK keys to the local environment:

   ```env
   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
   ```

6. Rebuild the native development clients after installing the purchase SDK:

   ```sh
   eas build --platform android --profile preview
   eas build --platform ios --profile preview
   ```

Real purchases do not run in Expo Go. Test Android through a Play internal test
track with a license tester, and iOS through a Sandbox Apple Account/TestFlight.
