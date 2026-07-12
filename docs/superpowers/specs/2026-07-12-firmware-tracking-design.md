# Firmware Tracking — Design

**Date:** 2026-07-12
**Status:** Approved, ready for implementation plan

## Problem

Cameras, monitors, and drones run firmware that the manufacturer periodically updates. The team has no way to record what firmware each unit is on, to know the latest version a manufacturer offers, or to be alerted when a unit is out of date. This feature adds firmware tracking with a dashboard alert, built manually now and structured so autonomous manufacturer-website checking can be added later without schema changes.

## Decisions

- **Phased, manual-first.** The "latest available firmware version" is entered/maintained by a human now. Autonomous checking of manufacturer websites is explicitly **out of scope** for this build (see Phase 2 below). The data model is identical either way, so nothing is wasted.
- **Two levels.** A unit's installed firmware lives on the item (`items.firmware_version`); the manufacturer's latest version lives per-model (`firmware_targets.latest_version`). "Out of date" is derived by comparing the two.
- **String comparison, not version ordering.** A unit is out of date when its firmware differs from its model's latest — compared trimmed and case-insensitive. No attempt to parse or order versions (semver ordering is unreliable across manufacturers).
- **Scope: Cameras, Monitoring, Drones only.** Other categories do not get firmware tracking on the Firmware page or in the alert.
- **Banner dismiss is per-session** (`sessionStorage`) — it clears when the browser session ends and resurfaces next visit while anything is out of date.

## Data model

Migration `0007_firmware.sql`:

```sql
-- Per-unit installed firmware (optional; only meaningful for tracked categories).
alter table items add column firmware_version text;

-- Per-model latest firmware the manufacturer offers. One row per model,
-- matched to items by items.name. source_url + last_checked_at are unused by
-- the manual MVP but are the exact fields Phase-2 automation will write to.
create table firmware_targets (
  id uuid default gen_random_uuid() primary key,
  model text not null unique,
  manufacturer text,
  latest_version text,
  source_url text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table firmware_targets enable row level security;

create policy "auth_all_firmware_targets" on firmware_targets for all to authenticated
  using (true) with check (true);
```

Matching: `items.name` (trimmed) equals `firmware_targets.model`. Same-model items already share an exact `name` (the Add form's copy-from-existing and "Add another" preserve it), so grouping by name is correct.

## Constants

`lib/constants.ts`:

```ts
export const FIRMWARE_CATEGORIES = ['Cameras', 'Monitoring', 'Drones'] as const
```

Each entry MUST be a member of `ITEM_CATEGORIES`.

## Types

`lib/types.ts`:
- `Item` gains `firmware_version: string | null`.
- `CreateItemData` gains `firmware_version?: string`.
- New `FirmwareTarget`: `{ id, model, manufacturer: string | null, latest_version: string | null, source_url: string | null, last_checked_at: string | null, created_at }`.
- New `UpsertFirmwareTargetData`: `{ model: string; manufacturer?: string; latest_version?: string; source_url?: string }`.
- New view type `FirmwareModel` for the page: `{ model: string; manufacturer: string | null; latest_version: string | null; source_url: string | null; last_checked_at: string | null; units: FirmwareUnit[] }` where `FirmwareUnit = { id: string; serial_number: string | null; firmware_version: string | null; outdated: boolean }`.

## Comparison logic

Pure helper (its own small module, e.g. `lib/firmware/compare.ts`):

```ts
export function isOutdated(current: string | null | undefined, latest: string | null | undefined): boolean
```

Returns `true` only when both `current` and `latest` are non-empty (after trim) and differ when compared trimmed + case-insensitive. Any missing/empty side returns `false`. Unit-tested directly.

## Data layer

`lib/db/firmware.ts`:
- `getFirmwareTargets(): Promise<FirmwareTarget[]>` — all targets.
- `upsertFirmwareTarget(data: UpsertFirmwareTargetData): Promise<FirmwareTarget>` — upsert by `model`; stamps `last_checked_at = now()` whenever `latest_version` is provided.
- `getFirmwareModels(): Promise<FirmwareModel[]>` — loads tracked-category items (Cameras/Monitoring/Drones, not soft-deleted) and all targets, groups items by trimmed name, joins each group to its target, computes `outdated` per unit via `isOutdated`. Sorted by model name. Models with items but no target row appear with null target fields.
- `getOutdatedFirmwareCount(): Promise<number>` — count of units where `outdated` is true. Implemented on top of `getFirmwareModels` (single source of truth) so the dashboard and page never diverge.

`lib/db/items.ts`: no change needed — `createItem`/`updateItem` pass their data object straight through, so `firmware_version` flows once it is in the type and the routes send it (same pattern as `owner`).

## API

- `app/api/firmware-targets/route.ts` — auth-gated. POST upserts a target from `{ model, manufacturer?, latest_version?, source_url? }`. `model` is required (400 if missing). Calls `upsertFirmwareTarget`. Returns the saved target.
- `app/api/items/route.ts` (POST) and `app/api/items/[id]/route.ts` (PATCH): add `firmware_version` to the create/update payloads. On create, pass `firmware_version: body.firmware_version || undefined`. On update, include it the same way the other optional text fields are handled (present-in-body → set). Follows the existing field pattern; no normalization needed (free text).

## Firmware page

`app/firmware/page.tsx` (server component) + `_components/`:
- Loads `getFirmwareModels()`.
- Renders each model as a card/section: manufacturer + model name, unit count, the latest version with a clickable `source_url` link (if set), and a `last_checked_at` timestamp.
- An inline editor per model (client component) to set/update **latest version** and **source URL**, POSTing to `/api/firmware-targets` (upsert by model), then refreshing. Models with no target show a "Latest unknown — set it" prompt that opens the same editor.
- Under each model, the units: serial + current firmware, with out-of-date units flagged in red (reuse the existing badge idiom; red is acceptable here as it denotes a real alert state).
- Empty state when there are no tracked-category items.

Nav: add a "Firmware" link to both `components/nav.tsx` (desktop) and `components/mobile-nav.tsx`.

## Item forms + detail

- `app/equipment/new/_components/new-item-form.tsx` and `app/equipment/[id]/edit/_components/edit-item-form.tsx`: add an optional "Firmware version" text field (shown for all items), wired into the request body. In the Add form it is standalone state (like `owner`), NOT part of the template `Fields` — a template/prefix fill must not copy firmware (each unit's firmware is its own). In the Edit form it is an uncontrolled `defaultValue={item.firmware_version ?? ''}`.
- `app/equipment/[id]/page.tsx`: add "Firmware version" to the detail `<dl>` (value `item.firmware_version ?? '—'`).

## Dashboard banner

- `app/dashboard/page.tsx`: call `getOutdatedFirmwareCount()`; render a `FirmwareAlertBanner` client component at the very top of the page content, passing the count.
- `FirmwareAlertBanner` (client): if `count > 0` and not dismissed this session, show a dismissable red-accented banner — "{count} item{s} need a firmware update" with a "Review →" link to `/firmware` and a × dismiss button. Dismiss writes a flag to `sessionStorage` (key e.g. `firmware-alert-dismissed`); the banner reads it on mount and hides if set. Session-scoped, so it resurfaces next session while anything is out of date.

## Testing

- `isOutdated` unit tests: differs → true; equal → false; differs only by surrounding whitespace → false; differs only by case → false; either side empty/null/undefined → false.
- `lib/db/firmware.ts` tests (mocked `@/lib/supabase/server`, matching existing `__tests__/lib/db/*` pattern): `upsertFirmwareTarget` stamps `last_checked_at` when `latest_version` is provided and passes `model`; `getFirmwareModels` groups units under models and marks the right units outdated; `getOutdatedFirmwareCount` returns the count of outdated units.

## Deploy

Per project pattern: apply `0007_firmware.sql` in the Supabase SQL editor (project `cunpajzbhufiuibbzjne`) FIRST, then `git push`. The `add column` is nullable (no default needed) and the new table is additive — safe on the live schema.

## Out of scope (Phase 2 — autonomous checking)

- A scheduled job (Vercel Cron → an `/api/firmware/check` route) that, for each target with a `source_url`, uses the Claude API to fetch the manufacturer page and extract the latest version, writing a **suggested** `latest_version` + `last_checked_at` for a human to confirm rather than trusting blindly.
- Per-item manufacturer field, version-ordering/semver logic, email/push notifications, and firmware history/audit are all out of scope.
