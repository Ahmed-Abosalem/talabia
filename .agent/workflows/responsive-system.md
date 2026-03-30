---
description: Responsive Core System Usage Guide
---

# Responsive Core System Documentation

This document outlines the usage of the new Responsive Core System implemented to ensure consistent behavior across all devices.

## 1. Core Principles
- **Mobile First:** All styles are written for mobile first. Use `min-width` media queries for larger screens.
- **Fluid Layouts:** No fixed widths. Use percentages, `minmax()`, `clamp()`, and `flex-grow`.
- **Overflow Protection:** Global `overflow-x: hidden` is applied. All images and inputs are constrained.
- **Container Governance:** All pages must use `<AppContainer>`.

## 2. Using AppContainer
Wrap your page content or main layout area with `<AppContainer>`.

```jsx
import AppContainer from "@/components/Layout/AppContainer";

function MyPage() {
  return (
    <AppContainer>
      {/* Page Content */}
    </AppContainer>
  );
}
```

## 3. CSS Variables (Breakpoints & Spacing)
These are available globally from `styles/system/breakpoints.css` and `styles/system/spacing-system.css`.

- **Breakpoints:** `--bp-xs` (360px), `--bp-sm` (480px), `--bp-md` (768px), `--bp-lg` (1024px), `--bp-xl` (1280px).
- **Spacing:** `--sp-xs` to `--sp-2xl`. Use these for `margin` and `padding`.

## 4. Helper Classes
- `.grid-fluid`: Creates a responsive grid using `auto-fit` and `minmax`.
- `.flex-wrap`, `.flex-center`, `.flex-between`, `.stack-on-mobile`: Standard flex utilities.
- `.table-responsive`: Wrap tables in this class to enable horizontal scrolling on mobile.

## 5. Refactoring Checklist
When modifying existing components:
1.  Remove `max-width` based media queries if possible; switch to `min-width`.
2.  Replace fixed `width: ###px` with `width: 100%` or `max-width`.
3.  Ensure inputs (especially in flex containers) have `min-width: 0`.
4.  Use `repeat(auto-fit, minmax(...))` instead of fixed columns like `repeat(3, 1fr)`.

## 6. CSS File Structure
- `styles/system/`: Contains the core system files (DO NOT EDIT unless updating the system).
- `styles/global.css`: Global styles (check for conflicts).
- `styles/typography.css`: Font definitions.

This system guarantees that no element will ever exceed the screen width if followed correctly.
