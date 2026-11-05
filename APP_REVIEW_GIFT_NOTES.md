# Apple review: App Store offer codes

After deploying and testing, explain to App Review:

We removed custom gift purchases and custom gift-code redemption from iOS,
including gift signup. The Kroo+ screen now includes Redeem App Store offer code,
which opens Apple's native redemption sheet through RevenueCat. Apple validates
codes and processes subscription offers. Access updates through verified
RevenueCat customer information and backend subscription sync. Opening or
cancelling the sheet does not grant premium access. Restore Purchases remains
available. Android retains its existing gifting flow.

Required App Store Connect setup (not created by app code):
1. Open the Kroo+ subscription and create an Apple offer with the intended
   duration, price, eligible customers, regions, and renewal terms.
2. Generate and distribute Apple-issued offer codes. Kroo custom gift codes
   cannot be converted by entering them in Apple's redemption sheet.
3. Ensure the subscription product is attached to RevenueCat's kroo_plus
   entitlement and default offering for the Apple app.
4. Remove the unused gift consumable from this iOS submission if attached.
   Keep Android products and the gifts offering used by Android.

Deployment and testing:
- Deploy the backend restrictions and upload the updated iOS build.
- Test on a real iOS device with valid Apple test offer codes as supported by
  App Store Connect. Check success, invalid/used code, and cancellation.
- Check activation after redemption and after returning to the app; verify
  Restore Purchases recovers the subscription if needed.
- Verify custom gift routes redirect and custom gift codes fail during signup.
- Verify monthly/annual purchases, restore, and Android gifting still work.
- Run backend regression tests with PHP 8.4.1 or newer.
- Provide working Kroo review credentials and redemption navigation in App
  Store Connect. Add test code details appropriate to Apple's review process.

This iOS feature provides Apple subscription offers. It does not sell
customer-to-customer prepaid gifts. Apple controls eligibility and renewal.
The API platform header selects product behavior; it is not device attestation.
Older clients without the header do not receive the new platform restrictions.
