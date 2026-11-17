# Marketing2Advertising Mobile

The official Marketing2Advertising mobile application, built with Flutter for Android and iOS from one shared Dart codebase.

## Current foundation

- Branded M2A home screen and five-tab mobile navigation.
- Discover, Watch, Services and More entry points.
- Shortcuts to the existing M2A Blogger website and entertainment application.
- Existing channel, app, game and page catalogues retained under `assets/`.
- External links open through the platform browser.
- No duplicate CMS or invented content is maintained in the app.

The current navigation shell is the first implementation milestone. The feature screens are being connected to live content sources incrementally; cards that currently link to a website are shortcuts, not claims that a native feature is already complete.

## Project structure

```
flutter_project/
  android/                 # Android native project
  ios/                     # Generate with Flutter on macOS (see below)
  assets/                  # Existing M2A catalogues
  lib/main.dart             # App entry point and initial navigation shell
  test/                     # Widget and service tests
  pubspec.yaml
```

Feature implementation will be separated into `lib/features/` as the app grows (home, blogs, Firimu, series, TV, games, jobs, services and profile), with shared networking, storage, routing, theme and notification services under `lib/core/`.

## Requirements

- Flutter stable with Dart 3.3 or later.
- Android Studio / Android SDK for Android builds.
- macOS with Xcode for iOS builds. Flutter's iOS toolchain requires Xcode on macOS: https://docs.flutter.dev/platform-integration/ios/setup

## Android development

```bash
cd flutter_project
flutter doctor
flutter pub get
flutter analyze
flutter test
flutter run
``

Build a debug APK:

```bash
flutter build apk --debug
``

Build a release APK or Play Store App Bundle when signing and store configuration are ready:

```bash
flutter build apk --release
flutter build appbundle --release
``

Do not commit keystores, passwords, signing properties or service-account credentials.

## Generate the iOS runner

The repository currently contains the Android native project but does not yet contain a checked-in iOS Runner/Xcode project. On a Mac with Xcode installed, generate the iOS platform scaffold from this Flutter project:

```bash
cd flutter_project
flutter create --platforms=ios --org com.marketing2advertising .
flutter pub get
flutter build ios --no-codesign
```

Then commit the generated `ios/` directory. App Store/TestFlight distribution requires Apple signing and provisioning; see https://docs.flutter.dev/deployment/ios.

## Content sources and safeguards

- Blog content: https://www.marketing2advertising.com/
- Entertainment application: https://marketing2advertising.com/
- Existing JSON catalogues are retained, but channel availability and media rights must be verified before promoting streams as operational.
- Do not scrape or duplicate content unnecessarily. Prefer supported feeds or APIs and respect source-site terms.
- AdMob is not initialized in the current navigation shell. Production advertising must be configured with the correct app IDs, consent flow, privacy disclosures and platform review before release.
- Push notifications, offline sync, saved content, native feature screens and production monetization are planned integrations, not yet implemented in this foundation.

## Brand

App display name: **Marketing2Advertising**  
Bundle identifier target: `com.marketing2advertising.mobile`  
Tagline: **Transforming learning into earning.**
