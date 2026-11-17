# Android VPN Client — Implementation Guide

## Required foundation

Use Android's `VpnService` API and the official embeddable WireGuard tunnel library:

```kotlin
dependencies {
    implementation("com.wireguard.android:tunnel:1.0.20260102")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.3")
}
```

Use Java 17 compatibility and enable core library desugaring as described by the WireGuard Android embedding documentation. Confirm the latest stable Maven Central version before each release.

The Android manifest must declare the WireGuard backend VPN service with `android.permission.BIND_VPN_SERVICE` and the `android.net.VpnService` intent action. The app must call `VpnService.prepare()` and obtain the user's system consent before starting a VPN.

## Personal Server flow

1. Let the user import a WireGuard `.conf` file or scan a QR code.
2. Parse and validate the configuration locally.
3. Keep private and preshared keys on-device; redact them from logs.
4. Ask for Android VPN permission.
5. Create a tunnel using the WireGuard tunnel library and report the backend's actual state.
6. Verify the new public exit IP using an independent IP check.
7. Disconnect and remove in-memory secrets when requested.

## Protection controls

- Use Android's native always-on VPN / lockdown capabilities where supported; explain the system settings to the user.
- Use native VPN routing and app allow/deny lists for split tunneling.
- Verify IPv4 and IPv6 routes, DNS configuration, reconnect behavior, and network changes.
- Do not display “Protected” until the backend reports the tunnel up and the exit-IP check confirms the expected route.

## Build locally

Open this folder (`M2A-Free-Vpn/platforms/android`) in Android Studio with JDK 17 and Android SDK 36 installed, or use Gradle 8.13+:

```bash
gradle :app:assembleDebug
```

The first build downloads the Android Gradle Plugin, Kotlin plugin, and WireGuard tunnel library. This repository does not include a Gradle wrapper yet.

## Status

This folder contains an initial Android Gradle/Kotlin application scaffold. It imports a personal WireGuard `.conf` file into memory, requests Android VPN permission, starts/stops the official WireGuard GoBackend, and performs an independent public-IP check after the backend reports UP. The public-IP check requests `api.ipify.org`, which receives the device's public IP as part of that request.

It has not been compiled, signed, or tested on a physical Android device. It is not yet ready for release. QR import, native kill-switch verification, persistent secure profile management, M2A server provisioning, and full shared-dashboard integration remain outstanding.

Reference documentation:
- [WireGuard embedding guide](https://www.wireguard.com/embedding/)
- [Android VPN developer guide](https://developer.android.com/develop/connectivity/vpn)
- [WireGuard Android tunnel library on Maven Central](https://central.sonatype.com/artifact/com.wireguard.android/tunnel)
