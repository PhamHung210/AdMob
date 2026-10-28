# AdMob Hello World (Android)

Two React Native screens, real Google Mobile Ads SDK, test **Banner** at bottom, SDK fullscreen **Interstitial** on screen transition (maximum **one opened interstitial per three minutes**, shared across both screens).

> Android-only demo. This **cannot run in Expo Go or show native AdMob in a browser**. It requires an Android development build. No custom/fake ad views or simulated close button are used.

## Requirements
- Node.js >= 22.13, npm
- Android Studio, Android SDK, Android emulator OR Android phone with USB debugging enabled
- Java JDK 17, `ANDROID_HOME` configured when building locally
- Internet connection for npm packages / Google test ads

## Setup

```bash
npm install
npx expo install --fix
npm run doctor
npm run typecheck
npm test
```

`expo install --fix` aligns dependencies to your installed Expo SDK. `package-lock.json` should be committed after installation. If `expo-doctor` reports the chosen AdMob version incompatible with Expo SDK 58, use the library's documented supported release and rebuild the native app; don't bypass incompatibility warnings.

## Launch on Android (local native build)

1. Launch Android emulator (with Google Play Services) **or** connect Android phone by USB (`adb devices`).
2. In the project directory:

```bash
npm run android
```

This compiles the **native Android development build** and installs it. The first run requires Gradle downloads. The build cannot be completed by simply opening Expo Go.

For subsequent JavaScript-only changes:

```bash
npm start
```

Select the installed development client. If your physical phone cannot connect to Metro through Wi-Fi, use `adb reverse tcp:8081 tcp:8081`, then retry.

## Alternative: EAS Android development APK

```bash
npm install
npx expo install --fix
npx eas-cli login
npx eas-cli build --platform android --profile development
```

Install the resulting APK on your Android phone, then `npm start` on your computer and connect the development client. EAS login and cloud build are external services; they are not needed when local Android build tools are installed.

## Google sample IDs (Android)

- Sample App ID in `app.json`: `ca-app-pub-3940256099942544~3347511713`
- Banner ID: `TestIds.BANNER` = `ca-app-pub-3940256099942544/6300978111`
- Interstitial ID: `TestIds.INTERSTITIAL` = `ca-app-pub-3940256099942544/1033173712`

These are official Google testing IDs. **Do not replace them with real ad unit IDs while testing**. `BannerAd` is mounted at screen bottom; `InterstitialAd.show()` delegates presentation and close controls to Google SDK.

## Behavior and state machine

1. At startup: gather UMP consent (`AdsConsent.gatherConsent()`), and only initialize/load ads when `canRequestAds` is true.
2. Show a Google test banner at bottom once SDK is initialized; reused container stays anchored when changing screens.
3. Load an interstitial asynchronously before first navigation.
4. On a navigation tap: if ad is loaded and cooldown is over, call `show()` and keep the old screen visible. After SDK **CLOSED**, navigate. Cooldown starts on **OPENED**.
5. When not loaded, blocked by consent, error before opening, or within 180 seconds of the last opened interstitial: **navigate immediately without an ad**.
6. On **CLOSED**, preload the next interstitial so it can be ready when 180 seconds have elapsed. Rapid taps are guarded.

Cooldown is in-memory across both screens. It resets if the entire app process is killed/restarted; if cooldown must persist across restarts, add persistent storage.

An error after SDK OPENED is not treated as evidence the fullscreen ad has closed: navigation waits for CLOSED (to avoid navigating under an open ad).

## Manual acceptance checklist

- [ ] App opens to Page 1, bottom SDK test banner loads (internet/consent permitting).
- [ ] Wait for the status `Interstitial đã tải: Có` and tap navigation: SDK test interstitial opens.
- [ ] Page changes to Page 2 **only after** dismissing the SDK interstitial.
- [ ] Tap back immediately: goes to Page 1 without another interstitial (cooldown).
- [ ] Both pages show a bottom SDK banner.
- [ ] After >= 3 minutes from last OPENED, next transition can show an interstitial if loaded.
- [ ] With network disabled / no ad ready, navigation still works.

## Limitations

The project source is prepared, with unit tests for cooldown. Native Android compilation, Google ad delivery, and on-device dismissal handling require a machine with network, Android toolchain, and a device/emulator; those cannot be verified by static inspection alone.

Docs: https://docs.page/invertase/react-native-google-mobile-ads/ ; https://docs.expo.dev/build/setup/ ; https://developers.google.com/admob/android/test-ads
