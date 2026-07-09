# Equipment Owner — Design

**Date:** 2026-07-09
**Status:** Approved, ready for implementation plan

## Problem

The tracker records where equipment is via `items.current_holder_id` (the *location*/holder — mutable, changes constantly as gear moves between people and kits). It has no concept of who **owns** each item. Most gear is owned by Latitude Equipment (the company), but some belongs to the three partners individually. Ownership is a permanent attribute, distinct from location, and needs to be visible and editable in the equipment page.

## Decisions

- **Owner is a fixed list of 4**, not derived from login accounts: `Latitude Equipment` (default), `Jack`, `Matt`, `Tom`. Stored as a plain text field on each item. Decoupled from `profiles` (the company is not an account) and from `current_holder_id` (location).
- **List display:** show an owner badge only on individually-owned items. Latitude-owned items show nothing. No owner column, no owner filter (YAGNI — can be added later).
- Owner is **not** copied by the "copy from existing" / prefix-match template fill — it is a fresh decision per unit.

## Data model

Migration `0006_item_owner.sql`:

```sql
alter table items
  add column owner text not null default 'Latitude Equipment';
```

The `not null default 'Latitude Equipment'` makes every existing row instantly correct — no backfill, no nulls to handle.

Owner values are defined by a new constant mirroring `ITEM_CATEGORIES`:

```ts
// lib/constants.ts
export const ITEM_OWNERS = ['Latitude Equipment', 'Jack', 'Matt', 'Tom'] as const
```

`'Latitude Equipment'` is the canonical default and MUST be `ITEM_OWNERS[0]` so the default can be referenced as such.

## Types

`lib/types.ts`:
- `Item` gains `owner: string`.
- `CreateItemData` gains `owner?: string` (optional; defaults to Latitude Equipment when omitted).
- `ItemTemplate` is **unchanged** — owner is intentionally excluded so template/prefix-match fills never carry owner over.

## Data layer (`lib/db/items.ts`)

- `getItems` and `getItem` select `*`, so `owner` comes back automatically — no query change required, but verify.
- `createItem`: persist `owner`, coercing a missing/invalid value to `ITEM_OWNERS[0]`.
- `updateItem`: persist `owner` when provided, coercing an invalid value to the default.

## API (`app/api/items` routes)

- On create and update, read `owner` from the request body.
- Validate against `ITEM_OWNERS`. If missing or not a member of the list, fall back to `ITEM_OWNERS[0]` (`'Latitude Equipment'`) rather than erroring — owner is a low-stakes label and the default is always safe.

## Forms

Both the Add form (`app/equipment/new/_components/new-item-form.tsx`) and Edit form (`app/equipment/[id]/edit/_components/edit-item-form.tsx`):
- Add an "Owner" `<select>` populated from `ITEM_OWNERS`, styled with the shared `inputClass`, placed near the Category field.
- Add form defaults the selection to `ITEM_OWNERS[0]`. Edit form initialises from the item's current `owner`.
- The template/prefix-match "use its details" fill must leave the owner selection untouched (it fills name/category/value/country/weight/notes only — owner is not part of `ItemTemplate`, so this is automatic; confirm the fill handler does not reset owner).

## Equipment list (`components/equipment/item-table.tsx`)

Add an owner badge rendered **only when** `item.owner !== 'Latitude Equipment'`, showing the owner name (`Jack`/`Matt`/`Tom`). Rendered in both:
- the mobile card (next to the name, alongside where "On hire" appears), and
- the desktop table Name cell (next to the name).

Style: mirror the existing "On hire" badge shape (`text-[10px]`, rounded-full, small padding) but in a **neutral grey** palette (`brand-mid-grey` text, subtle grey border/background) so it is visually distinct from the red "On hire" tag. No new table column; no filter control.

## Item detail page (`app/equipment/[id]/page.tsx`)

Add an "Owner" field to the item's detail display (alongside the existing fields such as holder/kit/serial), showing `item.owner`.

## Testing

Extend the Jest `/api/items` tests (mocked `@/lib/supabase/server`):
- Creating an item with no `owner` persists `'Latitude Equipment'`.
- Creating with a valid owner (e.g. `'Jack'`) persists that value.
- Creating/updating with an invalid owner (e.g. `'Nigel'`) coerces to `'Latitude Equipment'`.

## Deploy

Per project pattern: apply `0006_item_owner.sql` in the Supabase SQL editor (project `cunpajzbhufiuibbzjne`) **first**, then `git push`. The default clause means the migration is safe to apply to the live table with existing rows.

## Out of scope (YAGNI)

- Owner filter on the equipment list.
- Owner change history / audit trail.
- Per-owner permissions or access control.
- Reassigning owner in bulk.
