# Slides: getting an app on Google Play

<!-- From publishing Vakya and GT-FIVE (D:\Agency\gtfive_app\docs\PLAY_CONSOLE_SUBMISSION.md and
nitya\docs\19_vakya_master_knowledge_base.md), checked against Google's Play Console Help on 2026-10-21:
answer/6112435 ($25, ID, Android device) and answer/14151465 (12 testers, 14 days, apply for production). -->

## cover
kicker: GOOGLE PLAY
title: How to get your app on [[Google Play]]
sub: Every step they ask for, from publishing two of my apps.

## step
kicker: STEP 1
title: Open a developer account
- A one-time fee of $25
- Choose a personal account, or an organisation account (needs a D-U-N-S number)
- Verify your ID, and prove you own an Android device using the Play Console app
tip: An organisation account skips the 12 tester rule on the next slide. A D-U-N-S number is free but takes time, so request it first.

## step
kicker: STEP 2
title: The [[12 tester]] rule
- New personal accounts (made after 13 Nov 2023) must run a closed test. Internal testing does not count
- 12 testers must keep the app installed on their phones for 14 days in a row
- Track it on your Play Console dashboard, then apply for production
tip: Line up 12 real testers who will keep the app. Google asks how they used it, and reviews within about 7 days.

## step
kicker: STEP 3
title: Build and upload
- Upload an AAB, not an APK
- Internal testing is only for your own quick checks. It never unlocks production
- Every upload needs a higher version code, across all tracks
tip: Google re-signs your app. Add its SHA-256 to Firebase, or Google and phone login break for everyone who installs from Play.

## step
kicker: STEP 4
title: Fill in the forms
- App access: if there is a login, give reviewers a working test account
- Data safety: declare everything you collect. It is a legal statement
- Content rating, target audience, ads, and a privacy policy URL
- If people can sign up, let them delete their account
tip: Tick an under-18 age group only if kids really use your app. It pulls you into the Families policy.

## step
kicker: STEP 5
title: List it, then [[go live]]
- Name up to 30 characters, short description 80, full description 4,000
- Icon 512×512, feature graphic 1024×500, 2 to 8 screenshots (lead with the result)
- Every change is reviewed. Send it from Publishing overview, publish once approved
tip: "Published" is not instant. Never force an update the moment you hit publish.
cta: Save this. [[Follow]] for more guides.
