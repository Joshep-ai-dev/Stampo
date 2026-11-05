# IAP-funded gifting review notes

Custom gift purchase and redemption are restored on iOS and Android.
The iOS buyer purchases consumable kroo_plus_gift_year through Apple IAP.
The backend verifies the RevenueCat transaction before issuing one single-use
code. The recipient claims it on Kroo+ or during signup. The year starts on
redemption. Payment verification, transaction reuse protection, sandbox buyer
allowlisting, and refund reconciliation remain in place.

This replaces the Apple offer-code UI. These are Kroo gift codes, not Apple
subscription offer codes. Apple's earlier objection to custom redemption remains
unresolved; these notes must not claim review approval or compliance is assured.

Before testing or review:
- Deploy the restored backend and upload the updated iOS build.
- Keep the gifts offering and kroo_plus_gift_year package/product configured.
- For Apple sandbox tests enable REVENUECAT_GIFT_ALLOW_SANDBOX and configure
  REVENUECAT_GIFT_SANDBOX_BUYER_IDS with actual designated Kroo buyer UUIDs.
- Configure mail and the Laravel scheduler.
- Test purchase, delivery, claim, duplicate claim, and refund handling.
- Local StoreKit testing also needs the gift consumable in the .storekit file
  and RevenueCat's testing certificate configuration.
- Confirm the API returns JSON rather than a SiteGround CAPTCHA.
- Run backend tests using PHP 8.4.1 or newer.
- Explain the verified IAP-funded gift flow to App Review and seek clarification
  about recipient claim codes. Supply actual buyer/recipient review access.

Android's existing gift flow is retained.
