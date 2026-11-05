# Apple review: prepaid Kroo+ gifts

Use these notes after deploying and testing the submitted build.

Kroo offers a prepaid one-year gift purchased through Apple In-App Purchase
product kroo_plus_gift_year. It does not auto-renew or upgrade the buyer.
The backend checks the buyer's RevenueCat purchase history before issuing a
single-use gift code. One transaction funds one gift. The recipient claims that
purchased gift using the code; the year starts on redemption. Refunded gifts
are blocked and claimed gifted access is revoked when refunds are reconciled.

Review steps:
1. Sign into the supplied Kroo review buyer account.
2. Open Profile > Gift a membership.
3. Enter a controlled recipient email and complete Apple's purchase sheet.
4. Read the gift code sent to that inbox after server verification.
5. Use a second account on the Kroo+ screen to redeem it, or enter it during
   new-member signup. Another account cannot reuse it.

Before submission:
- Deploy the backend and run its scheduler; upload the updated iOS build.
- Attach the consumable gift IAP to the submission where required.
- Verify the Apple public SDK key and gifts/kroo_plus_gift_year package mapping.
- Enable sandbox gifts and allowlist the review buyer's actual Kroo user UUID.
- Supply buyer login and controlled recipient inbox access in App Store Connect.
- Test purchase, delivery, signup, redemption, duplicate claims, and refunds.
- Run the backend tests with PHP 8.4.1 or newer.

This implements IAP-funded gifting, not Apple-issued promotional offer codes.
Apple must assess the gift-claim flow; approval is not guaranteed by these changes.
Android keeps its existing purchase and claim flow.
