# Kroo+ Google Play Billing setup

Kroo+ uses Google Play Billing directly through `expo-iap`. RevenueCat is not used.

## Google Play Console

1. Use the Android app with package name `com.darkhorse9372.Stampo`.
2. Create one subscription product with product ID `kroo_plus`.
3. Add and activate the `monthly` and `annual` base plans.
4. If the UI should advertise a seven-day trial, add an eligible seven-day free-trial offer to both base plans.
5. Upload a signed AAB to an internal test track.
6. Add the tester's Google account to the internal test and to **Settings > License testing**.

The identifiers are configured with:

```env
EXPO_PUBLIC_KROO_PLUS_MONTHLY_PRODUCT_ID=kroo_plus
EXPO_PUBLIC_KROO_PLUS_ANNUAL_PRODUCT_ID=kroo_plus
EXPO_PUBLIC_KROO_PLUS_MONTHLY_BASE_PLAN_ID=monthly
EXPO_PUBLIC_KROO_PLUS_ANNUAL_BASE_PLAN_ID=annual
```

Separate monthly and annual subscription products are also supported: set the two product ID variables to their corresponding Google Play product IDs.

## Build and test

```sh
npx eas-cli@latest build --platform android --profile production
```

Install the build through the Google Play internal test track. Billing is not available in Expo Go and an AAB cannot be installed directly on a device.

The app loads prices from Google Play, supplies the selected base plan's offer token, restores active subscriptions, finishes completed transactions, and opens Google Play's subscription-management screen for active members.

## Production verification

Before public release, validate the Google Play purchase token on the backend with the Google Play Developer API before granting a server-side `pro` plan. Client-side active-subscription checks are useful for UI state but are not a secure replacement for server verification.
