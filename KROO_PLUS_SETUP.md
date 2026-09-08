# Kroo+ RevenueCat setup

Kroo+ uses RevenueCat through `react-native-purchases`. `expo-iap` and direct
Google Play Developer API handling are not used.

## RevenueCat dashboard

1. Create the Kroo RevenueCat project.
2. Add the Google Play app with package name `com.krootravel.app`.
3. Import the monthly and annual Google Play subscription products/base plans.
4. Create an entitlement named `kroo_plus` and attach both products.
5. Create an offering named `default` with `$rc_monthly` and `$rc_annual`
   packages. Make it the current offering.
6. Add a seven-day trial to the store products if the app should advertise one.

## Frontend

Add the platform-specific RevenueCat **public SDK key**:

```env
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_public_sdk_key
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_public_sdk_key
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=kroo_plus
EXPO_PUBLIC_REVENUECAT_OFFERING_ID=default
EXPO_PUBLIC_REVENUECAT_MONTHLY_PACKAGE_ID=$rc_monthly
EXPO_PUBLIC_REVENUECAT_ANNUAL_PACKAGE_ID=$rc_annual
```

Set the public key in the matching EAS environments as well. Because RevenueCat
is a native dependency, rebuild the development client after installing it:

```sh
npx eas-cli@latest build --platform android --profile development
```

Real store purchases still require a correctly configured Google Play testing
track. Expo Go uses RevenueCat Preview API Mode and cannot make a real purchase.

## Backend

Create a RevenueCat secret API key with permission to read customer/subscriber
information. Keep it only on the Laravel server:

```env
REVENUECAT_SECRET_API_KEY=sk_your_secret_key
REVENUECAT_ENTITLEMENT_ID=kroo_plus
REVENUECAT_WEBHOOK_AUTHORIZATION="Bearer a-long-random-secret"
REVENUECAT_WEBHOOK_SIGNING_SECRET=your-revenuecat-hmac-secret
```

Run the database migration:

```sh
php artisan migrate --force
```

In RevenueCat, create a webhook pointing to:

```text
https://krootravel.com/api/v1/billing/revenuecat/webhook
```

Set its Authorization header to exactly the same value as
`REVENUECAT_WEBHOOK_AUTHORIZATION`. Enable HMAC signing and copy the displayed
secret to `REVENUECAT_WEBHOOK_SIGNING_SECRET`.

The mobile app identifies the RevenueCat customer using the signed-in Kroo user
UUID. After purchase or restore, Laravel fetches that customer from RevenueCat
before granting `pro`. Webhooks repeat that server-side fetch for renewals,
expiration, cancellation, billing problems, and transfers.

## Gift checkout

Native store subscriptions cannot be transferred to another person. A gift
flow needs RevenueCat Web Billing (Stripe) plus recipient redemption. Until that
flow and its checkout URL exist, the gift button remains disabled.
