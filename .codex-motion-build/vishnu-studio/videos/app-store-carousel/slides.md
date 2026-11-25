# Slides: getting an app on the App Store

<!-- Researched 2026-10-21 from Apple's own pages: developer.apple.com/support/enrollment ($99 a year,
D-U-N-S, work email, live website), App Review Guidelines 2.1(a), 3.1.1, 4.2, 4.8, 5.1.1(v), and App Store
Connect screenshot specifications (1179x2556 or 1206x2622, 1 to 10, no transparency). The 1024x1024 icon and
TestFlight are general knowledge, not from those pages. Vishnu has not shipped on iOS: this one is research. -->

## cover
kicker: APP STORE
title: How to get your app on the [[App Store]]
sub: What Apple checks before it says yes.

## step
kicker: STEP 1
title: Join the Apple Developer Program
- $99 a year
- As an individual, or as an organisation
- Organisations need a D-U-N-S number, a work email on their own domain and a live website
tip: A D-U-N-S number is free in most countries but takes time. Request it first.

## step
kicker: STEP 2
title: Set up App Store Connect
- Create the app record. The bundle ID must match your build exactly
- Accept the agreements, and add tax and banking if you charge
- Upload a build with Xcode and test it on TestFlight
tip: Test the whole flow on a clean install. Crashes and placeholder content are common rejections.

## step
kicker: STEP 3
title: Get [[privacy]] right
- A privacy policy URL, in the app and on the listing
- Your App Privacy answers must match what the app and its SDKs collect
- If people can sign up, they must be able to delete their account in the app
- Google or Facebook login? Also offer one that keeps their email private, like Sign in with Apple

## step
kicker: STEP 4
title: Your store listing
- App name up to 30 characters
- At least 1 iPhone screenshot at 1179×2556 or 1206×2622, up to 10, no transparency
- A 1024×1024 icon, a description, keywords and a support URL
tip: Screenshots must show the real app. Anything that doesn't match what it does gets flagged.

## step
kicker: STEP 5
title: Pass [[review]]
- If there is a login, give Apple a demo account and keep your backend on
- Sell digital features through in-app purchase
- An app that is only your website in a wrapper gets rejected
- Rejected? Apple names the guideline. Fix it and resubmit
cta: Save this. [[Follow]] for more guides.
source: Apple App Review Guidelines 2.1, 3.1.1, 4.2, 4.8, 5.1.1
