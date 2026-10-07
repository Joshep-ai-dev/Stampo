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

Gifts use a separate **consumable, one-time purchase**, never the buyer’s monthly
or annual subscription. Create a one-year gift product in App Store Connect and
Google Play, import it into RevenueCat, and put it in a `gifts` offering with a
custom package named `kroo_plus_gift_year`. Do not attach this product to the
`kroo_plus` entitlement: it must not unlock membership for the buyer.

Frontend configuration (defaults shown):

```env
EXPO_PUBLIC_REVENUECAT_GIFT_OFFERING_ID=gifts
EXPO_PUBLIC_REVENUECAT_GIFT_PACKAGE_ID=kroo_plus_gift_year
```

Backend configuration:

```env
REVENUECAT_GIFT_PRODUCT_IDS=your_ios_gift_product,your_android_gift_product
REVENUECAT_GIFT_ALLOW_SANDBOX=false
```

Use the exact store product IDs, separated by commas. Enable sandbox gifts only
on a testing backend. Configure Laravel’s production mail transport and sender,
run `php artisan migrate --force`, and run Laravel’s scheduler every minute.
Payment verification and email retries run through that scheduler even if the
buyer closes the app after payment. Email transport failures retain the gift and
code for retry; no code is issued before server-side payment verification.

The buyer enters a friend’s email and an optional note. After payment is verified
against the signed-in buyer’s RevenueCat non-subscription transactions, the server
emails the note and a cryptographically random, one-use code. The email also
instructs new recipients to enter their name and gift code on the welcome page.
Account creation and redemption happen in one transaction, with the buyer as
their referrer; failed signup leaves the gift unused. Gift codes
automatically credit the buyer with a referral for new member signups, subject
to the existing challenge period. Existing member redemption leaves referral
relationships unchanged and does not add a referral. Gift codes
are hashed for lookup and encrypted at rest for email delivery. Redeem from
Profile → Membership → Redeem a gift code. The prepaid year starts on redemption;
subscription sync preserves it, and redeem retries never add another year.

The gift code is a bearer code: keep it private. A recipient may redeem it on
their signed-in Kroo account; their account email need not match the delivery
address. Existing subscribers retain their store subscription, and gift time
runs for one year from redemption without changing store renewal settings.

An interrupted purchase is recovered using its saved recipient and payment
baseline. If the store purchase never completed and the app closed before
reporting cancellation, support must cancel the unpaid draft before retrying.
