# Dark Theme, Kit Item Management & Carnet Export — Design Spec

**Date:** 2026-06-26
**Status:** Approved

---

## Overview

Three improvements to the Latitude Equipment Tracker:

1. **Dark theme** — dark-mode visual style across the entire app
2. **Add items to kits** — assign loose items to a kit from the kit detail page; transfer items between kits via the item edit page
3. **Carnet export** — a dedicated page to select individual items and export an ATA Carnet `.xlsx` spreadsheet

---

## 1. Dark Theme

### Colour Tokens

| Role | Value | Token |
|---|---|---|
| Page background | `#0a0a0a` | `--background` (CSS var) |
| Surface (cards, tables, inputs) | `#000000` | `bg-brand-black` |
| Elevated surface (hover, alt rows) | `#1a1a1a` | `bg-brand-dark-surface` (new) |
| Primary text | `#ffffff` | `text-white` |
| Secondary text | `#888888` | `text-brand-mid-grey` |
| Borders | `#333333` | `border-brand-rule-grey` redefined for dark |
| Input background | `#111111` | `bg-brand-input` (new) |
| Nav bar | `#000000` + brand-red top border | unchanged |

### Implementation

- `app/globals.css`: set `--background: #0a0a0a`, `--foreground: #ffffff`, add `body { background-color: var(--background); color: var(--foreground); }`
- Add new CSS theme tokens `--color-brand-dark-surface: #1a1a1a` and `--color-brand-input: #111111` to the `@theme inline` block and `tailwind.config.ts`
- `--color-brand-rule-grey` redefined to `#333333` for dark mode (borders read as subtle on dark backgrounds)
- All existing components already use brand tokens — the token redefinition propagates automatically with minimal per-component edits
- Form inputs, selects, and textareas receive `bg-brand-input text-white border-brand-rule-grey` in a shared `inputClass` constant updated in each form component

---

## 2. Add Items to Kits

### Kit Detail Page — Add Loose Items

A new "Add item to kit" control appears on the kit detail page, below the kit assignment section and above the items table.

- A searchable `<select>` dropdown populated with all loose items (items where `kit_id IS NULL`)
- If no loose items exist, the control is hidden
- "Add" button (disabled until an item is selected)
- On submit: calls a new server action `handleAddItem` defined inline in `app/kits/[id]/page.tsx`

**`handleAddItem` server action:**
1. Calls `updateItem(itemId, { kit_id: kitId })` to assign the item to the kit
2. Calls `assignItem(itemId, kit.current_holder_id, currentUserId, 'Added to kit')` to update the item's holder to match the kit and write an assignment history record
3. Calls `revalidatePath('/kits/[id]')` and `revalidatePath('/equipment')`

The items table below refreshes to show the newly added item.

### Item Edit Page — Kit Field & Transfers

The existing `app/equipment/[id]/edit/_components/edit-item-form.tsx` gains a **Kit** field:

- A `<select>` showing all kits plus a "None (loose item)" option at the top
- Pre-selected to the item's current kit (or None)
- On save: the PATCH to `/api/items/[id]` includes `kit_id` (or `null` for None)

**Server-side PATCH handler** (`app/api/items/[id]/route.ts`) — when `kit_id` changes:
1. Updates `item.kit_id`
2. If `kit_id` is non-null: fetches the kit's `current_holder_id` and calls `assignItem` to update the item's holder and write history ("Moved to kit: X")
3. If `kit_id` is null: no holder change (item keeps its current holder when removed from a kit)

The item edit page must also fetch all kits (`getKits()`) server-side to populate the dropdown.

---

## 3. Carnet Export

### New Page: `/carnet`

A dedicated export page accessible from the main nav (between Kits and Settings).

### Layout

```
[ Carnet Export ]                        [ Export 12 items ▼ ]  ← sticky header bar

  ☐  Inspire 3 Travel Kit  (Jack)
     ☑  DJI Inspire 3 — Unit 1    SN: 12345   £8,000   China   4.2 kg
     ☐  Zenmuse X9-8K              SN: —       £6,500   China   0.8 kg
     ☑  ND Filter Set              SN: —       £240     Japan   0.3 kg

  ☐  Mavic 4 Pro Kit  (Josh)
     ...

  ☐  Loose items
     ☑  Pelican Case 1610          SN: PC-001  £350     USA     3.1 kg
```

- Each kit section has a "Select all" checkbox in the header that selects/deselects all items in that section
- Items missing carnet fields show `—` in those cells
- The sticky export bar shows "X items selected" and an **Export .xlsx** button (disabled at 0)

### Export Mechanism

- On export click: POSTs `{ itemIds: string[] }` to `POST /api/carnet/export`
- Server route (`app/api/carnet/export/route.ts`):
  1. Auth guard — 401 if no user
  2. Fetches items by ID
  3. Builds worksheet using the `xlsx` npm package (SheetJS)
  4. Returns response with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="carnet-export.xlsx"`

### Spreadsheet Columns

| Column | Source field |
|---|---|
| Name | `item.name` |
| Serial Number | `item.serial_number` |
| Value (£) | `item.value` |
| Country of Origin | `item.country_of_origin` |
| Weight (kg) | `item.weight_kg` |

One row per item. Items with missing fields export with blank cells.

### New DB Helper

`lib/db/items.ts` gains `getItemsByIds(ids: string[])` — fetches a list of items by their UUIDs, used by the export route.

---

## Files Created / Modified

| File | Change |
|---|---|
| `app/globals.css` | Dark background, foreground CSS vars |
| `tailwind.config.ts` | New `brand-dark-surface`, `brand-input` tokens |
| `app/layout.tsx` | Ensure body uses `bg-background` |
| `components/nav.tsx` | Add Carnet nav link |
| `components/equipment/item-table.tsx` | Dark input/table styles |
| `components/equipment/assign-control.tsx` | Dark select styles |
| `components/kits/kit-assign-control.tsx` | Dark select styles |
| `components/ui/field.tsx` | Dark label colour |
| `components/ui/confirm-dialog.tsx` | Dark modal background |
| `app/equipment/new/page.tsx` | Dark form styles |
| `app/equipment/[id]/edit/_components/edit-item-form.tsx` | Add Kit field; dark styles |
| `app/equipment/[id]/page.tsx` | Dark card/table styles |
| `app/kits/page.tsx` | Dark background |
| `app/kits/[id]/page.tsx` | Add loose-item picker; dark styles |
| `app/kits/new/page.tsx` | Dark form styles |
| `app/kits/[id]/edit/_components/edit-kit-form.tsx` | Dark form styles |
| `app/settings/page.tsx` | Dark styles |
| `app/settings/_components/settings-form.tsx` | Dark input styles |
| `app/api/items/[id]/route.ts` | Handle kit_id change → assignItem |
| `lib/db/items.ts` | Add `getItemsByIds` |
| `app/carnet/page.tsx` | New — carnet export page |
| `app/carnet/_components/carnet-selector.tsx` | New — client component with checkboxes |
| `app/api/carnet/export/route.ts` | New — xlsx export route |

---

## Out of Scope

- PDF carnet export
- Filtering/searching within the carnet page
- Saving carnet "selections" for reuse
- Removing an item from a kit via the kit detail page (use item edit page instead)
