# Native or Cross-Platform: The Checklist

By Auralion Labs. Use this before you hire anyone to build your app, or before you start building it yourself.

## The one question that decides most of it

What is the one job a user opens your app to do, and does that job need the phone's hardware?

If it does, lean native. If the job is screens and data (sign in, browse, book, pay, chat, see your history), build it once with a cross-platform framework.

## The checklist

1. Does the core job need the camera, AR, Bluetooth, background audio or location, or health data?
2. Do you need home screen widgets, Live Activities, a watch app or CarPlay in the first version, or only one day?
3. Do you need both iOS and Android on launch day, or does your audience lean heavily to one?
4. Is there a web app that should share logic or design with the mobile app?
5. Who will maintain it in two years: one small team, or separate iOS and Android teams?
6. Does the interaction have to feel perfect on each platform (heavy gestures, animation, real-time graphics)?

Mostly "no" to 1, 2 and 6: build cross-platform. Mostly "yes": build native, or share the logic and keep native screens.

## Your options, in plain words

- **React Native (with Expo):** one codebase in TypeScript, real native components on each platform. A natural fit if you already have a React or Next.js web team. Many small fixes can ship as over-the-air updates without waiting for store review.
- **Flutter:** one codebase in Dart, drawing its own interface. Great for a strongly branded design that should look identical on iOS and Android.
- **Native (Swift and SwiftUI, Kotlin and Jetpack Compose):** two codebases, the best access to hardware and platform features, and the most platform-perfect feel.
- **Kotlin Multiplatform:** share the business logic, keep native screens on each side. A middle path for teams that want native interfaces without writing the same logic twice.

## Mistakes we see most often

- Choosing native because it sounds more serious, for an app that is mostly forms and lists.
- Choosing cross-platform for an app whose whole point is the camera or a connected device.
- Building both platforms at once when the audience is almost all on one.
- Deciding the framework before deciding the one job the app must do brilliantly.

## Read more

The full guide: https://www.auralionlabs.com/blog/native-vs-cross-platform-app-2026

Want a second opinion on your app? Book a free 15-minute call: https://cal.com/auralionlabs/15min
