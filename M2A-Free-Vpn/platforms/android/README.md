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

## Status

This folder is an implementation guide only. No Android APK, Gradle project, VPN service, or device test has been produced yet.
