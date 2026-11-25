# Desktop VPN Clients — Implementation Guide

The existing responsive web dashboard and PWA remain the shared UI. Full-device desktop protection requires a native companion with elevated network permissions.

## Windows

Use the official WireGuard embeddable tunnel service rather than implementing the WireGuard protocol from scratch. The native installer must provision the signed service and required WireGuard components. The dashboard should communicate with the companion through a narrowly scoped local IPC interface that authenticates the caller and never returns private keys.

## macOS

Use WireGuardKit through a native macOS app and Network Extension / system VPN permission flow. Package and sign the app with the required Apple entitlements.

## Linux

Use the system WireGuard interface and a supported integration such as NetworkManager or a controlled privileged helper. Do not run arbitrary shell commands from browser-provided input.

## Shared desktop behavior

- Keep the same M2A Free Network and My Private Server choices.
- Import personal WireGuard profiles locally and protect secrets.
- Report actual native tunnel state, route status, DNS state, and transfer counters.
- Apply and test a real kill switch before describing it as active.
- Verify the public exit IP after connection.
- The PWA by itself remains a dashboard; installing it as a desktop app does not grant system VPN privileges.

## Status

This folder is an implementation guide only. No Windows service, macOS Network Extension, Linux helper, installer, or signed desktop package has been built yet.
