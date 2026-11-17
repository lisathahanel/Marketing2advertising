# M2A IP Shield — Cross-Platform Architecture

## Product structure

M2A IP Shield has one shared product experience and platform-specific VPN engines.

- **Web / PWA:** Public-IP lookup, browser WebRTC diagnostics, public DNS-over-HTTPS lookup, server catalogue, saved preferences, and installable dashboard. A browser cannot create a system-wide VPN, apply an OS firewall kill switch, or route other device applications.
- **Android:** Native VPN application using Android `VpnService` and the official WireGuard tunnel library. This is the first full-device VPN target.
- **Windows:** Native desktop client using WireGuard's embeddable tunnel service. Elevated service installation and signed binaries are required.
- **macOS:** Native client using WireGuardKit.
- **Linux:** Native integration with the platform WireGuard interface / NetworkManager or a supported userspace implementation.

## Two connection providers

The app must keep one connection lifecycle and two provider implementations:

1. `M2A Network Provider` — only verified, deployed M2A endpoints may be offered as connectable locations.
2. `Personal Server Provider` — imports a user's WireGuard configuration or QR code and connects to that user's own server.

The shared UI must never treat a server catalogue entry, profile preview, API response, or simulated handshake as a connected VPN. A connected state requires a native engine state of `UP` plus an independent public-IP check showing the expected exit address.

## Security boundaries

- Generate WireGuard keys inside the native client. Keep private keys on-device and never send them to M2A APIs.
- Do not store full WireGuard profiles, private keys, or QR payloads in browser localStorage, analytics, logs, or crash reports.
- Redact private keys and preshared keys from logs and diagnostics.
- Do not claim kill-switch, DNS leak protection, IPv6 protection, or split tunneling until the native platform has applied and verified those controls.
- A browser DNS-over-HTTPS lookup only tests the selected public resolver; it does not inspect the operating-system resolver or prove that DNS traffic is routed through a VPN.
- A WebRTC ICE candidate probe is a browser diagnostic, not a device-wide network audit.

## Implementation sequence

1. **Web/PWA foundation:** Make public IP lookup work on static hosting; provide honest browser-only diagnostics; keep all tunnel-dependent controls clearly marked as native-client preferences.
2. **Android Personal Server:** Import and validate WireGuard profiles, obtain Android VPN consent, connect through the official WireGuard backend, expose real state and transfer counters, and verify the exit IP.
3. **Android protection:** Add tested reconnect handling, always-on / lockdown guidance, DNS and IPv6 route verification, and native per-app allow/deny lists.
4. **Windows desktop:** Build a signed native companion using WireGuard's embeddable tunnel service; connect the existing web dashboard to it through a narrow local IPC interface.
5. **macOS and Linux:** Add their native WireGuard integrations and platform-specific permission / routing checks.
6. **M2A Free Network:** Deploy and monitor real VPN servers, provision peer keys securely, publish only verified locations, and add capacity gradually.

## Current implementation status

The repository currently contains a React/Vite PWA. It does **not** yet contain a built Android, Windows, macOS, or Linux VPN client. The web dashboard can check the browser's public IP and run limited browser diagnostics, but it cannot provide full-device VPN protection. Native modules must be implemented, built, tested on real devices, and signed before advertising those capabilities as available.
