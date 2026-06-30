# Mobile & PWA Design Spec

**Date:** 2026-06-30  
**Goal:** Make the Latitude Equipment Tracker mobile-friendly and installable as a PWA on iPhone, with Equipment and Kits as the primary mobile workflows.

---

## Scope

- PWA installability (manifest, icons, meta tags)
- Responsive navigation (bottom tab bar on mobile, existing nav on desktop)
- Responsive layout (padding, safe areas, input sizing)
- Equipment list — card layout on mobile
- Kit list — card layout on mobile
- Carnet, detail pages, forms — padding tweaks only (already single-column)

---

## Icons

Source: `/Users/jdownes/Documents/Latitude/LATITUDE LOGO /4. Icon/LATITUDE O.png`  
(4855×4742 RGBA — the red/black degree symbol)

Generated assets (Python/Pillow at build time, committed to `public/`):
- `public/favicon.ico` — multi-size (16, 32, 48px)
- `public/icon-192.png` — 192×192 for PWA manifest
- `public/icon-512.png` — 512×512 for PWA manifest
- `public/apple-touch-icon.png` — 180×180 for iOS home screen

---

## PWA Manifest

`public/manifest.json`:
```json
{
  "name": "Latitude Equipment",
  "short_name": "Equipment",
  "description": "Equipment tracker for Latitude Equipment",
  "start_url": "/equipment",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## Layout Meta Tags

Added to `app/layout.tsx` `<head>`:
- `<link rel="manifest" href="/manifest.json">`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="Equipment">`
- `<meta name="theme-color" content="#0a0a0a">`

---

## Navigation

### Mobile (< lg)

**Top bar** (48px, fixed):
- Brand-black background, 3px brand-red top border
- Logo centred (or left-aligned), no nav links, no sign-out

**Bottom tab bar** (64px, fixed, `pb-safe`):
- Brand-black background, 1px brand-rule-grey top border
- Three tabs: Equipment (`/equipment`), Kits (`/kits`), Settings (`/settings`)
- Each tab: icon (24px) above label (10px, ExtraLight)
- Active tab: icon + label in white, 2px brand-red indicator above tab
- Inactive tab: icon + label in `brand-mid-grey`
- Safe area padding: `padding-bottom: env(safe-area-inset-bottom)`

### Desktop (≥ lg)

Existing `Nav` component unchanged.

### Sign-out on mobile

Accessible from the Settings page — a "Sign out" button at the bottom of the settings form.

---

## Layout

`app/layout.tsx` `<main>`:
- Mobile: `px-4 py-4 pb-24` (extra bottom padding clears the tab bar + safe area)
- Desktop: `px-6 py-8` (unchanged)

Tailwind class: `px-4 py-4 pb-24 lg:px-6 lg:py-8 lg:pb-8`

---

## Equipment List — Mobile Cards

`app/equipment/_components/item-table-wrapper.tsx` (client component):
- Desktop (≥ lg): existing table unchanged
- Mobile (< lg): items rendered as a vertical stack of cards

Card anatomy:
```
┌─────────────────────────────────┐
│ [Item name]           [chevron] │
│ Serial: ABC123                  │
│ Holder: Jack Downes             │
└─────────────────────────────────┘
```
- Tap entire card → navigates to item detail
- Search and filter controls stack vertically on mobile
- "Add item" button: full-width on mobile

---

## Kit List — Mobile Cards

`app/kits/page.tsx` / `_components`:
- Desktop: existing layout unchanged
- Mobile: each kit as a card showing kit name, holder, item count
- Tap → kit detail

---

## Detail Pages & Forms

No structural changes. Tweaks only:
- Input `font-size: 16px` minimum (prevents iOS auto-zoom on focus) — add `text-base` to all `<input>` and `<select>` fields
- Consistent reduced padding from layout

---

## Implementation Tasks

1. **Icons & manifest** — Generate icons with Pillow, write `manifest.json`, update `layout.tsx` meta
2. **Mobile nav** — New `MobileNav` component (top bar + bottom tabs), conditional render in layout
3. **Responsive layout** — Update `<main>` classes, safe-area CSS, input font-size fix
4. **Equipment list cards** — Responsive card view in `ItemTableWrapper`
5. **Kit list cards** — Responsive card view in kits list
