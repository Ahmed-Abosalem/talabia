# طلبيّة | Brand Identity & PWA Standards

This document preserves the technical standards for the Talabia visual identity, specifically for mobile and PWA installations.

## 1. The 45% Safe Zone Rule (Core Standard)
**Requirement:** Any logo placed within a square app icon MUST occupy no more than **45% of the total width** of that square.

- **Reason:** Android circular masks and Splash Screen zooms cut off the outer edges of icons.
- **Center:** The logo must be perfectly centered both horizontally and vertically.
- **Background:** Always use a solid `#ffffff` (Pure White) background to ensure high contrast and a premium native look.

## 2. Icon Technical Specifications
| Icon Role | Dimensions | Purpose | Requirement |
| :--- | :--- | :--- | :--- |
| **Standard PWA** | 192x192 / 512x512 | Any | 45% Logo Width |
| **Splash/Maskable** | 512x512 | Maskable | 45% Logo Width (Max Safe) |
| **Apple Touch** | 180x180 | iOS | Solid White, No Transparency |

## 3. Implementation Files
The following files are the **final production-ready** assets:
- `brand-icon-v3.png`: Unified icon for Android and desktop.
- `apple-touch-icon-v3.png`: Dedicated icon for iOS/iPadOS users.

---
*Created by Antigravity AI Branding Stewardship.*
