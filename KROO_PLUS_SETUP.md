# Kroo+ store setup

The app uses one RevenueCat entitlement named `kroo_plus` for Apple App Store
and Google Play subscriptions.

## Android first

1. In Google Play Console, create and activate Kroo+ monthly and annual
   subscription products/base plans. Add the seven-day free-trial offer to each
   base plan if the button should advertise a trial.
2. Upload a signed Android App Bundle to an internal test track. Add the tester's
   Google account both to the track and to **Settings > License testing**.
3. Connect the Google Play app and service-account credentials to RevenueCat.
   The package name must be `com.darkhorse9372.Stampo`.
4. Import both Google Play subscriptions into RevenueCat.
5. Create the `kroo_plus` entitlement and attach both products.
6. In the current RevenueCat offering, assign the monthly product to the
   predefined **Monthly** package and the annual product to the predefined
   **Annual** package. The app uses those package types when the user selects a
   plan.
7. Configure RevenueCat Customer Center with purchase restoration and links to
   the privacy policy and terms.
8. Add the platform-specific public SDK keys to the local environment:

   ```env
   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
   ```

9. Build the Android App Bundle for the Play internal test track:

   ```sh
   eas build --platform android --profile production
   ```

For an end-to-end billing test, install the internal-test build from Google Play,
not directly from an APK. Real purchases do not run in Expo Go. The UI works
there, but native billing calls are unavailable.

## Apple later

Add the App Store products to the same `kroo_plus` entitlement and the same
Monthly/Annual offering packages. The app automatically selects the Apple
RevenueCat key on iOS.
