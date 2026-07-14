# Latitude Equipment — Session Handoff

**Project:** Latitude Equipment tracker
**Path:** `/Users/jdownes/Documents/latitude-equipment`
**Stack:** Next.js 16 (App Router) + Supabase (`@supabase/ssr`) + Tailwind v4 + TypeScript
**Deploy:** Vercel, auto-deploys on push to `main`
**Supabase project ref:** `cunpajzbhufiuibbzjne` (migrations applied manually via SQL editor — CLI not authenticated on this machine)

---

## MOST RECENT SESSION (2026-07-14) — UI/UX pass

A design-quality pass across the app (via `/impeccable` + `/ui-ux-pro-max`). **No DB changes** — pure UI/UX, so no migration dependency.

### 1. Auth pages redesigned (login / forgot-password / reset-password)
- Fixed a real bug: auth screens rendered inside the padded root `<main>`, causing a colour seam (`#0a0a0a` vs `#000`) and off-centre push → now `fixed inset-0` full-bleed.
- Added: label↔input association, `autoComplete`/autofill, password show/hide toggle, styled error blocks (`role="alert"`), loading spinner, `focus-visible`, entrance motion (`animate-auth-in` in `globals.css`, respects reduced-motion).
- **New shared module `components/auth/auth-ui.tsx`** — `AuthShell`, `PasswordInput`, `AuthError`, `SubmitButton`, `authInputClass`, `authLabelClass`. Deliberately separate from the app UI kit (auth is a denser, uppercase-label surface).

### 2. Shared UI component kit (extracted; `/impeccable extract`)
- `components/ui/control.ts` → `controlClass` (shared input/select/textarea class; replaced a duplicated `const inputClass` in **11 form files**). `components/equipment/item-table.tsx` keeps its own no-`w-full` inline-cell variant intentionally.
- `components/ui/button.tsx` → `Button` (variants `primary`/`secondary`, `loading`, `loadingLabel`) + `buttonClasses(variant)` for `<Link>`-as-button.
- `components/ui/field.tsx` → added optional `htmlFor`.
- `lib/cn.ts` → tiny className joiner (no clsx/cva in deps).

### 3. App-wide refine pass (from an `/impeccable` critique, was 28/40)
- **Layout:** all forms centered `max-w-2xl mx-auto`; item add/edit forms 2-columned (`grid gap-4 sm:grid-cols-2`: Category+Owner, Value+Weight, Country+Firmware; Name/Serial/Kit/Notes full-width). Hires left as-is (already a 2-col grid).
- **Consistency:** create CTAs unified to red (`Add item`/`Add kit` were dark `bg-brand-black`); form field labels unified onto the white `Field` style; several submit buttons migrated to `Button`.
- **Firmware:** red overload fixed — red now reserved for genuine out-of-date only (header count + per-unit "Update" badge); "Latest unknown — set it" is neutral grey/dotted-underline; cards → `lg:grid-cols-2` grid; added "All up to date" status.

### Design conventions established this pass (KEEP CONSISTENT)
- **Uppercase-tracked-grey** (`text-xs font-extralight uppercase tracking-wider text-brand-mid-grey`) = section headers/eyebrows ONLY (ACCESSORIES, QUICK ACTIONS, STANDBY, category groups). NOT form field labels.
- **Form field labels** = `Field` style (`text-sm font-medium text-white`).
- **Create/primary CTAs are always red** (`bg-brand-red`).

### Verified
`tsc` 0 · `38/38` jest · `next build` passes · visually confirmed in-browser (Chrome, logged in).

### Preview (this now works for the tracker)
- Registered in `~/.claude/launch.json` as **`latitude-equipment`**, cwd set, **port 3007** (3000 is the separate marketing site `…/latitude-equipment-web`). `/login`, `/forgot-password`, `/reset-password` are public; other routes need a Supabase login.

### ⚠️ Gotchas learned
- **Never run `npm run build` while the `next dev` preview is running** — they share `.next` and corrupt the dev server (recurring "Could not find the module … in the React Client Manifest"). Recover: stop dev → `rm -rf .next` (ABSOLUTE repo path; Bash cwd resets to `/Users/jdownes`) → restart dev. Run tsc/jest separately.
- (Pre-existing, still true) repo is in **iCloud Documents**; `.next` picks up duplicate files `* [0-9].*` that cause spurious tsc errors → `find .next -name '* [0-9].*' -delete` before tsc. Moving the repo out of iCloud would stop it.

---

## How this project is worked
- **Brainstorm-first gate:** for every new creative feature, present a design and get approval BEFORE writing code (superpowers brainstorming skill).
- **Deploy pattern after each feature:** apply any new migration in the Supabase SQL editor FIRST, then `git push`. Code references new DB objects, so ordering matters.
- **Brand tokens (Tailwind `@theme inline`):** `brand-red #ED2643`, `brand-black`, `brand-dark-surface #1a1a1a`, `brand-input #111111`, `brand-mid-grey #888888`, `brand-rule-grey #333333`. Metropolis font via `@font-face`.
- **Verify before commit:** `find .next -name '* [0-9].*' -delete`, then `npx tsc --noEmit`, `npx jest`, `npm run build` (but NOT while dev server runs — see gotcha above).

---

## Outstanding / next-session checklist
1. **Power-user features (biggest remaining UX win, NOT started):** global ⌘K search + bulk owner/location edits. These are feature work (`/impeccable shape`), not a refine. Persona "Alex" (daily-driver inventory tool) is blocked without them.
2. **Minor UI follow-ups:** a few inline red-button literals still un-migrated to `Button`; Settings → Change password lacks a show/hide toggle (reuse `PasswordInput`); dashboard stat tiles could become clickable filters into Equipment/Hires.
3. **Verify migrations applied** in Supabase SQL editor (project `cunpajzbhufiuibbzjne`): `0005_add_items_to_kit.sql` and `0007_firmware.sql` — if firmware or multi-add-to-kit errors in prod, an unapplied migration is the likely cause. (Firmware pages render in prod, which suggests 0007 is applied — but confirm.)
4. Optionally re-run `/impeccable critique` to score the improvement (est. ~31–32/40).

---

## Prior features (BUILT + COMMITTED in earlier sessions)

### Owner + Firmware tracking
- **Owner field** on equipment (Latitude Equipment / Jack / Matt / Tom; `ITEM_OWNERS` + `normalizeOwner` in `lib/constants.ts`). Ownership ≠ location.
- **Firmware tracking** — optional `items.firmware_version` + per-model `firmware_targets` table (migration `0007_firmware.sql`), covers Cameras/Monitoring/Drones only. `lib/firmware/compare.ts` (`isOutdated`), `lib/firmware/models.ts` (`buildFirmwareModels`/`countOutdated`), `lib/db/firmware.ts`, `app/firmware/`, dashboard alert banner (session-dismissable). Manual-first; Phase-2 autonomous manufacturer-site checking deferred (schema ready via `source_url`/`last_checked_at`).

### DJI prefix-match suggestion
DJI serials share a 4-char type prefix; matching a serial prefix offers to reuse an existing item's details. Entry points: Equipment **Scan** button (`components/equipment/scan-to-find.tsx`), and the Add-item form (scan or typed serial, debounced live lookup). Plus a duplicate-serial safety net.
- `lib/db/items.ts` — `getItemBySerial` (exact), `getItemBySerialPrefix` (first-4-char `ilike`).
- `app/api/items/lookup/route.ts` — auth-gated GET → `{ exact, suggestion }`.
- `components/equipment/serial-input.tsx` — controlled `{ name, value, onChange, inputClass }`.

### Other committed features
- **Security hardening** — migration `0004` (profiles RLS self-row, `prevent_is_admin_change()` trigger, atomic RPCs `checkout_hire`/`checkin_hire`/`assign_kit`). Confirmed applied.
- **Serial scanner** (`components/equipment/serial-scanner.tsx`) — camera overlay, `barcode-detector` ponyfill (native Android/Chrome, zxing-wasm fallback iOS/Safari). Torch + vibrate.
- **Copy-from-existing** on Add form + "Add another like this →" on item detail.
- **Multi-add to kit** — `app/kits/[id]/_components/add-item-control.tsx`; migration `0005_add_items_to_kit.sql` (`add_items_to_kit(...)`). ⚠️ Confirm applied.
- **PDF generation** — `pdf-lib` + `@pdf-lib/fontkit` (Vercel-compatible), `lib/pdf/hire-pdf.ts`.
- **Hire management + Latitude Contact** — migration `0003`. Confirmed applied.
- **"Memory" category** in `ITEM_CATEGORIES`.

## Helpful reference
- Helpers: `lib/api/route-helpers.ts` (`serverError`, `readJson`, `optionalNumber`), `lib/db/assignments.ts`, `lib/db/hires.ts`, `lib/db/firmware.ts`.
- Types: `lib/types.ts` (`ItemTemplate`, `Item`, `Kit`, `Hire`, `FirmwareModel`, `FirmwareTarget`).
- Tests: Jest with mocked `@/lib/supabase/server` (`mockFrom`, `mockRpc`); 38 tests passing.
