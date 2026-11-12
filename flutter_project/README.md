# M2A Mobile App (Flutter & PWA)

Mirrors the official website [https://www.marketing2advertising.com/](https://www.marketing2advertising.com/).

## Features
- **Brand Theme**: Dark mode `#0b0b0f` with gold accent (`#F59E0B`).
- **Live Channels (19 TV Stations)**: HLS `.m3u8` streaming with Chewie, LIVE badge, connecting state, and "Network not well – Try Again" error retry screen.
- **Multi Apps (19 Free Tools)**: Calculator, Text to PDF, QR Code, Video Player, HTML Editor, Password Gen, Word Counter, Case Converter, JSON Formatter, Base64, etc.
- **Free Games (15 Games)**: Snake, 2048, Word Guess, Memory Match, Minesweeper, 15 Puzzle, Simon Says, Tic-Tac-Toe, Connect Four, Blackjack, Breakout, Space Shooter, Flappy, Whack-a-Mole, Reaction Test.
- **Blogger Feed Synchronization**: Live JSON sync with `/feeds/posts/default?alt=json`, offline caching, pagination, category filtering.
- **Global Career & Job Matching**: Ireland, Singapore, Luxembourg, UAE, Norway sponsorships and career matching.
- **Monetization**: Google AdMob Banner, Interstitial (between apps/games), and GDPR/UMP consent flow.

---

## How to Build the Release APK and Google Play AAB

### 1. Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) installed (v3.0.0 or higher).
- Android Studio with Android SDK and command-line tools.

### 2. Setup the Project
```bash
cd flutter_project
flutter pub get
```

### 3. Generate Android Keystore for Google Play
Run this command to create your signing key:
```bash
keytool -genkey -v -keystore ~/m2a-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias m2a_alias
```

Create `android/key.properties`:
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=m2a_alias
storeFile=/path/to/m2a-release-key.jks
```

### 4. Build Release APK (Direct phone install)
```bash
flutter build apk --release
```
Your APK will be ready at:
`build/app/outputs/flutter-apk/app-release.apk`

### 5. Build Release AAB (For Google Play Store submission)
```bash
flutter build appbundle --release
```
Your App Bundle will be ready at:
`build/app/outputs/bundle/release/app-release.aab`

### 6. Publish on Google Play Console
1. Log in to [Google Play Console](https://play.google.com/console).
2. Click **Create app** -> Enter App Name: **M2A**, Default Language: English, Free app.
3. Complete the Store Listing:
   - **Short description**: Live TV Channels, 19 Multi Tools, 15 Free Games, and Tech Careers.
   - **Full description**: M2A is your digital agency hub featuring 19 live television channels, 19 free productivity tools, 15 instant games, and real-time Blogger feed synchronization from marketing2advertising.com.
4. Upload `app-release.aab` under **Production -> Create new release**.
5. Complete Content Rating, Target Audience, and Privacy Policy URL (`https://www.marketing2advertising.com/p/privacy-policy.html`).
6. Submit for review!
