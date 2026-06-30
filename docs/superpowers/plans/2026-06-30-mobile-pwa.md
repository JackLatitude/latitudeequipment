# Mobile & PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Latitude Equipment Tracker mobile-friendly and installable as a PWA on iPhone, with a bottom tab nav, responsive equipment list cards, and proper icons.

**Architecture:** PWA manifest + icons for installability; a new `MobileNav` component (hidden on desktop, shown on mobile) alongside the existing `Nav` (hidden on mobile); `ItemTable` gains a card layout for small screens via Tailwind responsive prefixes — no separate routes or mobile-specific pages.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, Python/Pillow for icon generation, TypeScript.

## Global Constraints

- Next.js 16 App Router — `params` are `Promise<{id: string}>`, server components by default
- Tailwind v4 with `@theme inline` in `globals.css` — brand tokens already defined
- Brand colours: `--background: #0a0a0a`, `--foreground: #ffffff`, `brand-red: #ED2643`, `brand-dark-surface: #1a1a1a`, `brand-rule-grey: #333333`, `brand-mid-grey: #888888`, `brand-input: #111111`, `brand-black: #0a0a0a`
- Mobile breakpoint: `lg` (1024px) — below this shows mobile UI, above shows desktop UI
- Icon source: `/Users/jdownes/Documents/Latitude/LATITUDE LOGO /4. Icon/LATITUDE O.png` (4855×4742 RGBA)
- Working directory: `/Users/jdownes/Documents/latitude-equipment`
- No new npm dependencies unless absolutely necessary

---

### Task 1: Icons & PWA Manifest

**Files:**
- Create: `scripts/generate-icons.py`
- Create: `public/manifest.json`
- Create: `public/icon-192.png` (generated)
- Create: `public/icon-512.png` (generated)
- Create: `public/apple-touch-icon.png` (generated)
- Create: `public/favicon.ico` (generated)
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `public/manifest.json`, PWA icons, meta tags in `<head>`

- [ ] **Step 1: Write the icon generation script**

Create `scripts/generate-icons.py`:

```python
#!/usr/bin/env python3
"""Generate PWA icons and favicon from LATITUDE O.png."""
from PIL import Image
import struct, zlib, os

SRC = "/Users/jdownes/Documents/Latitude/LATITUDE LOGO /4. Icon/LATITUDE O.png"
OUT = os.path.join(os.path.dirname(__file__), "../public")

img = Image.open(SRC).convert("RGBA")

# Square crop (it's already nearly square: 4855×4742)
size = min(img.size)
left = (img.width - size) // 2
top = (img.height - size) // 2
img = img.crop((left, top, left + size, top + size))

# PWA icons
for px in [192, 512]:
    resized = img.resize((px, px), Image.LANCZOS)
    resized.save(os.path.join(OUT, f"icon-{px}.png"), "PNG")
    print(f"  ✓ icon-{px}.png")

# Apple touch icon
apple = img.resize((180, 180), Image.LANCZOS)
apple.save(os.path.join(OUT, "apple-touch-icon.png"), "PNG")
print("  ✓ apple-touch-icon.png")

# favicon.ico (multi-size: 16, 32, 48)
sizes = [16, 32, 48]
ico_images = [img.resize((s, s), Image.LANCZOS) for s in sizes]
ico_images[0].save(
    os.path.join(OUT, "favicon.ico"),
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=ico_images[1:],
)
print("  ✓ favicon.ico")
print("Done.")
```

- [ ] **Step 2: Run the script**

```bash
cd /Users/jdownes/Documents/latitude-equipment
python3 scripts/generate-icons.py
```

Expected output:
```
  ✓ icon-192.png
  ✓ icon-512.png
  ✓ apple-touch-icon.png
  ✓ favicon.ico
Done.
```

Verify files exist:
```bash
ls -lh public/icon-192.png public/icon-512.png public/apple-touch-icon.png public/favicon.ico
```

- [ ] **Step 3: Create the PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "Latitude Equipment",
  "short_name": "Equipment",
  "description": "Equipment tracker for Latitude Equipment",
  "start_url": "/equipment",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 4: Add PWA meta tags to layout**

Replace the entire `app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Nav } from '@/components/nav'
import { MobileNav } from '@/components/mobile-nav'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/users'

export const metadata: Metadata = {
  title: 'Latitude Equipment',
  description: 'Equipment tracker for Latitude Equipment',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Equipment',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = user ? await getProfile(user.id) : null

  return (
    <html lang="en">
      <body>
        {profile && (
          <>
            <Nav displayName={profile.display_name} />
            <MobileNav displayName={profile.display_name} />
          </>
        )}
        <main className="max-w-6xl mx-auto px-4 py-4 pb-24 lg:px-6 lg:py-8 lg:pb-8">
          {children}
        </main>
      </body>
    </html>
  )
}
```

Note: `MobileNav` doesn't exist yet — it will be created in Task 2. This will cause a TypeScript error until Task 2 is complete; that's expected.

- [ ] **Step 5: Verify build still works**

```bash
cd /Users/jdownes/Documents/latitude-equipment
npx tsc --noEmit 2>&1 | grep -v "MobileNav" | head -20
```

Expected: only errors about `MobileNav` not found (resolved in Task 2).

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-icons.py public/manifest.json public/icon-192.png public/icon-512.png public/apple-touch-icon.png public/favicon.ico app/layout.tsx
git commit -m "feat: PWA manifest, icons, and meta tags"
```

---

### Task 2: Mobile Navigation

**Files:**
- Create: `components/mobile-nav.tsx`

**Interfaces:**
- Consumes: `displayName: string` prop (same as `Nav`)
- Produces: `MobileNav` exported component used in `app/layout.tsx`

The component renders two elements, both hidden on `lg+`:
1. A slim top bar (48px, fixed, `z-40`) — logo only
2. A bottom tab bar (64px + safe area, fixed, `z-40`) — Equipment, Kits, Settings tabs

- [ ] **Step 1: Create `components/mobile-nav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = { displayName: string }

function EquipmentIcon({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#888888'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

function KitsIcon({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#888888'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#888888'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export function MobileNav({ displayName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const tabs = [
    { href: '/equipment', label: 'Equipment', Icon: EquipmentIcon },
    { href: '/kits', label: 'Kits', Icon: KitsIcon },
    { href: '/settings', label: 'Settings', Icon: SettingsIcon },
  ]

  return (
    <>
      {/* Slim top bar — mobile only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-black border-t-[3px] border-brand-red h-12 flex items-center justify-center">
        <Image
          src="/logos/logo_equipment_dark.png"
          alt="Latitude Equipment"
          width={100}
          height={36}
          priority
        />
      </div>

      {/* Bottom tab bar — mobile only */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-black border-t border-brand-rule-grey"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center pt-2 pb-3 gap-1 relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-red" />
                )}
                <Icon active={active} />
                <span
                  className="text-[10px] font-extralight"
                  style={{ color: active ? '#ffffff' : '#888888' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Hide desktop Nav on mobile**

Update `components/nav.tsx` — add `hidden lg:flex` to the outer `<nav>` element. Replace:

```tsx
<nav className="bg-brand-black border-t-[3px] border-brand-red px-6 flex items-center justify-between h-16">
```

With:

```tsx
<nav className="hidden lg:flex bg-brand-black border-t-[3px] border-brand-red px-6 items-center justify-between h-16">
```

- [ ] **Step 3: Add top-bar offset to desktop main padding**

The desktop nav is 64px tall (`h-16`). The mobile top bar is 48px (`h-12`). Both are `fixed`, so `<main>` needs a top margin. Update the `<main>` in `app/layout.tsx`:

```tsx
<main className="max-w-6xl mx-auto px-4 pt-16 pb-24 lg:pt-24 lg:px-6 lg:pb-8">
  {children}
</main>
```

Wait — the desktop nav is `fixed`? Check: looking at the existing nav, it uses no `fixed` class, it's in normal flow. So desktop doesn't need `pt`. But the new mobile top bar IS fixed (`fixed top-0`). So mobile needs `pt-12` to clear the 48px top bar, and desktop needs no extra top padding.

Correct `<main>`:

```tsx
<main className="max-w-6xl mx-auto px-4 pt-16 pb-24 lg:pt-8 lg:px-6 lg:pb-8">
  {children}
</main>
```

(pt-16 = 64px on mobile to clear 48px top bar with breathing room; lg:pt-8 restores desktop padding since desktop nav is in normal flow)

- [ ] **Step 4: Build check**

```bash
cd /Users/jdownes/Documents/latitude-equipment
npx tsc --noEmit 2>&1 | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Add sign-out button to Settings page**

The mobile bottom tab bar has no sign-out. The spec says sign-out is accessible from Settings on mobile. Add it to `app/settings/_components/settings-form.tsx`.

At the top of the `SettingsForm` component (after the existing state variables), add:
```tsx
const router = useRouter()
```
And add the import at the top:
```tsx
import { useRouter } from 'next/navigation'
```

Add this section at the very bottom of the returned JSX, after the Change password section:
```tsx
      <section className="pt-4 border-t border-brand-rule-grey lg:hidden">
        <button
          type="button"
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
          }}
          className="w-full text-sm font-medium text-brand-mid-grey hover:text-white py-2 transition-colors"
        >
          Sign out
        </button>
      </section>
```

Note: `createClient` is already imported at the top of the file. The `lg:hidden` class ensures this only shows on mobile (sign-out is in the desktop nav on larger screens).

- [ ] **Step 6: Build check**

```bash
cd /Users/jdownes/Documents/latitude-equipment
npx tsc --noEmit 2>&1 | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add components/mobile-nav.tsx components/nav.tsx app/layout.tsx app/settings/_components/settings-form.tsx
git commit -m "feat: mobile nav — bottom tabs, slim top bar, and sign-out in settings"
```

---

### Task 3: Responsive Layout & Input Fix

**Files:**
- Modify: `app/globals.css`
- Modify: `components/equipment/item-table.tsx` (input class fix)
- Modify: `app/settings/_components/settings-form.tsx` (input class fix)
- Modify: `app/equipment/[id]/edit/_components/edit-item-form.tsx` (input class fix)

**Interfaces:**
- Consumes: nothing new
- Produces: global `text-base` minimum on all inputs (prevents iOS auto-zoom); safe-area support

iOS auto-zooms into any `<input>` with `font-size < 16px`. Our `text-sm` inputs are 14px. Fix by overriding to 16px on mobile while keeping visual size the same with `sm:text-sm`.

- [ ] **Step 1: Add safe-area support to globals.css**

Append to `app/globals.css`:

```css
/* Safe area support for PWA on notched iPhones */
:root {
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}
```

- [ ] **Step 2: Fix input font-size across the app**

iOS zooms in when an input has `font-size < 16px`. Our inputs use `text-sm` (14px). The fix: use `text-base lg:text-sm` on all inputs.

Find every file that defines `inputClass` with `text-sm` and update it:

**`components/equipment/item-table.tsx`** — change:
```tsx
const inputClass = 'border border-brand-rule-grey rounded px-3 py-2 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
```
To:
```tsx
const inputClass = 'border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
```

**`app/settings/_components/settings-form.tsx`** — change:
```tsx
const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
```
To:
```tsx
const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
```

**`app/login/page.tsx`** — same substitution on `inputClass`.

**`app/forgot-password/page.tsx`** — same substitution on `inputClass`.

**`app/reset-password/page.tsx`** — same substitution on `inputClass`.

Search for any remaining occurrences:
```bash
grep -rn "text-sm bg-brand-input" app/ components/ --include="*.tsx"
```
Apply the same fix to any other files found.

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git add -u  # stages all modified tracked files
git commit -m "feat: safe-area CSS, fix input font-size to prevent iOS zoom"
```

---

### Task 4: Equipment List — Mobile Cards

**Files:**
- Modify: `components/equipment/item-table.tsx`

**Interfaces:**
- Consumes: same `Props` as before — `items: Item[]`, `profiles: Profile[]`, `search: string`, `holderId: string`, `onSearchChange`, `onHolderChange`
- Produces: card layout on mobile (`< lg`), table layout on desktop (`lg+`)

- [ ] **Step 1: Update `components/equipment/item-table.tsx`**

Replace the entire file:

```tsx
'use client'

import Link from 'next/link'
import type { Item, Profile } from '@/lib/types'

type Props = {
  items: Item[]
  profiles: Profile[]
  search: string
  holderId: string
  onSearchChange: (v: string) => void
  onHolderChange: (v: string) => void
}

export function ItemTable({ items, profiles, search, holderId, onSearchChange, onHolderChange }: Props) {
  const inputClass = 'border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div>
      {/* Filters — stack on mobile, row on desktop */}
      <div className="flex flex-col gap-2 mb-4 lg:flex-row lg:gap-3">
        <input
          type="search"
          placeholder="Search by name or serial…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} w-full lg:w-72`}
        />
        <select
          value={holderId}
          onChange={(e) => onHolderChange(e.target.value)}
          className={`${inputClass} w-full lg:w-auto`}
        >
          <option value="">All holders</option>
          <option value="unassigned">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">No equipment found.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/equipment/${item.id}`}
                className="flex items-center justify-between bg-brand-dark-surface border border-brand-rule-grey rounded-lg px-4 py-3 active:opacity-70"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{item.name}</p>
                  <p className="text-sm text-brand-mid-grey mt-0.5">
                    {item.serial_number ? item.serial_number : '—'}
                    {item.kit?.name ? ` · ${item.kit.name}` : ''}
                  </p>
                  <p className="text-sm text-brand-mid-grey">
                    {item.current_holder?.display_name ?? 'Unassigned'}
                  </p>
                </div>
                <svg className="flex-shrink-0 ml-3 text-brand-mid-grey" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <table className="hidden lg:table w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-rule-grey text-left text-brand-mid-grey">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Serial</th>
                <th className="pb-2 pr-4 font-medium">Kit</th>
                <th className="pb-2 font-medium">Holder</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-brand-rule-grey hover:bg-brand-dark-surface">
                  <td className="py-2.5 pr-4">
                    <Link href={`/equipment/${item.id}`} className="font-medium text-white hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-brand-mid-grey">{item.serial_number ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-brand-mid-grey">{item.kit?.name ?? '—'}</td>
                  <td className="py-2.5 text-brand-mid-grey">
                    {item.current_holder?.display_name ?? 'Unassigned'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Make "Add item" button full-width on mobile**

In `app/equipment/page.tsx`, update the header row:

```tsx
<div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
  <h1 className="text-xl font-semibold text-white">Equipment</h1>
  <Link
    href="/equipment/new"
    className="bg-brand-black text-white text-sm font-medium px-4 py-2.5 rounded hover:opacity-80 text-center sm:py-2"
  >
    Add item
  </Link>
</div>
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/equipment/item-table.tsx app/equipment/page.tsx
git commit -m "feat: equipment list — mobile card layout"
```

---

### Task 5: Kit List & Detail — Mobile Polish

**Files:**
- Modify: `app/kits/page.tsx`
- Modify: `app/kits/[id]/page.tsx`

The kit list already uses a responsive card grid. This task adds full-width "Add kit" button on mobile and ensures the kit detail page (items list) is touch-friendly.

- [ ] **Step 1: Update kit list header for mobile**

In `app/kits/page.tsx`, replace the header `<div>`:

```tsx
<div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
  <h1 className="text-xl font-semibold text-white">Kits</h1>
  <Link
    href="/kits/new"
    className="bg-brand-black text-brand-white text-sm font-medium px-4 py-2.5 rounded hover:bg-brand-red transition-colors text-center sm:py-2"
  >
    Add kit
  </Link>
</div>
```

- [ ] **Step 2: Check kit detail items list**

Read `app/kits/[id]/page.tsx` and `app/kits/[id]/_components/`. If the items inside a kit are displayed in a table, apply the same card treatment as Task 4. If they're already cards or a simple list, leave them.

```bash
cat app/kits/[id]/page.tsx
ls app/kits/[id]/_components/
```

If an items table exists in kit detail, add a mobile card view following the exact same pattern as `ItemTable` in Task 4 (card for `< lg`, table for `lg+`). Each card shows item name, serial number, and a chevron.

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/kits/page.tsx
git add -u
git commit -m "feat: kit list mobile polish and touch-friendly detail"
```

---

### Task 6: Deploy

- [ ] **Step 1: Final build check**

```bash
cd /Users/jdownes/Documents/latitude-equipment
npm run build 2>&1 | tail -20
```

Expected: no errors, static pages generated.

- [ ] **Step 2: Deploy to production**

```bash
vercel --prod 2>&1 | grep -E "Aliased|Error|✓ Compiled"
```

Expected:
```
✓ Compiled successfully
▲ Aliased  https://latitude-equipment.vercel.app
```

- [ ] **Step 3: Test on iPhone**

1. Open Safari on iPhone → navigate to `https://latitude-equipment.vercel.app`
2. Tap Share → Add to Home Screen → confirm icon appears (the LATITUDE° mark)
3. Open from home screen — should launch full-screen with no Safari chrome
4. Verify bottom tab bar shows Equipment, Kits, Settings
5. Verify Equipment list shows cards (not table) on mobile
6. Verify tapping a card navigates to item detail
7. Verify inputs don't trigger zoom on focus

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```
