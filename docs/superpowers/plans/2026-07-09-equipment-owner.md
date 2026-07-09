# Equipment Owner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every equipment item a permanent `owner` (Latitude Equipment by default, or Jack/Matt/Tom individually), distinct from its mutable holder/location, and surface it in the equipment forms, list, and detail page.

**Architecture:** Add an `owner text not null default 'Latitude Equipment'` column to `items`. Owner values are a fixed constant list (`ITEM_OWNERS`). A pure `normalizeOwner()` helper coerces any input to a known owner; both API routes call it so bad input can never persist. The forms gain an Owner `<select>`; the list shows a grey badge only on individually-owned items; the detail page shows an Owner field.

**Tech Stack:** Next.js 16 (App Router), Supabase (`@supabase/ssr`), TypeScript, Tailwind v4, Jest.

## Global Constraints

- **Read the bundled Next.js docs before writing route/page code:** this is a modified Next.js; `AGENTS.md` requires checking `node_modules/next/dist/docs/` and heeding deprecation notices.
- **Owner default is `'Latitude Equipment'`** and MUST be `ITEM_OWNERS[0]`. The full list is exactly `['Latitude Equipment', 'Jack', 'Matt', 'Tom']`.
- **Owner is never copied by template/prefix-match fill** — it is a fresh decision per unit. `ItemTemplate` must NOT gain an `owner` field.
- **Brand tokens (Tailwind):** `brand-red #ED2643`, `brand-dark-surface`, `brand-input`, `brand-mid-grey #888888`, `brand-rule-grey #333333`. The owner badge uses neutral grey (`brand-mid-grey`), NOT red — red is reserved for the "On hire" badge.
- **Pre-commit verification (iCloud quirk):** always run `find .next -name '* [0-9].*' -delete` before `npx tsc --noEmit`, then `npx jest`, then `npm run build`.
- **Deploy ordering:** apply the migration in the Supabase SQL editor (project `cunpajzbhufiuibbzjne`) FIRST, then `git push` to `main` (Vercel auto-deploys).
- End every commit message with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Owner constant, `normalizeOwner` helper, and types

**Files:**
- Modify: `lib/constants.ts`
- Modify: `lib/types.ts`
- Test: `__tests__/lib/constants.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ITEM_OWNERS: readonly ['Latitude Equipment', 'Jack', 'Matt', 'Tom']`
  - `type ItemOwner = (typeof ITEM_OWNERS)[number]`
  - `normalizeOwner(value: unknown): ItemOwner` — returns `value` if it is a member of `ITEM_OWNERS`, otherwise `ITEM_OWNERS[0]`.
  - `Item.owner: string` and `CreateItemData.owner?: string`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/constants.test.ts`:

```ts
import { ITEM_OWNERS, normalizeOwner } from '@/lib/constants'

describe('ITEM_OWNERS', () => {
  it('has Latitude Equipment as the default (first) entry', () => {
    expect(ITEM_OWNERS[0]).toBe('Latitude Equipment')
    expect(ITEM_OWNERS).toEqual(['Latitude Equipment', 'Jack', 'Matt', 'Tom'])
  })
})

describe('normalizeOwner', () => {
  it('defaults to Latitude Equipment when the value is missing or empty', () => {
    expect(normalizeOwner(undefined)).toBe('Latitude Equipment')
    expect(normalizeOwner(null)).toBe('Latitude Equipment')
    expect(normalizeOwner('')).toBe('Latitude Equipment')
  })

  it('keeps a valid individual owner', () => {
    expect(normalizeOwner('Jack')).toBe('Jack')
    expect(normalizeOwner('Matt')).toBe('Matt')
    expect(normalizeOwner('Tom')).toBe('Tom')
  })

  it('coerces an unknown owner to the default', () => {
    expect(normalizeOwner('Nigel')).toBe('Latitude Equipment')
    expect(normalizeOwner(42)).toBe('Latitude Equipment')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/lib/constants.test.ts`
Expected: FAIL — `normalizeOwner` is not exported (`TypeError`/import error).

- [ ] **Step 3: Add the constant and helper**

In `lib/constants.ts`, append after the existing `ITEM_CATEGORIES` block:

```ts
export const ITEM_OWNERS = ['Latitude Equipment', 'Jack', 'Matt', 'Tom'] as const

export type ItemOwner = (typeof ITEM_OWNERS)[number]

/**
 * Coerce arbitrary input to a known owner. Any value not in ITEM_OWNERS
 * (missing, empty, or unrecognised) falls back to the default, Latitude
 * Equipment. Owner is a low-stakes label, so the default is always safe.
 */
export function normalizeOwner(value: unknown): ItemOwner {
  return (ITEM_OWNERS as readonly string[]).includes(value as string)
    ? (value as ItemOwner)
    : ITEM_OWNERS[0]
}
```

- [ ] **Step 4: Add the type fields**

In `lib/types.ts`, add `owner` to `Item` (after `weight_kg`):

```ts
  weight_kg: number | null
  owner: string
  deleted_at: string | null
```

And to `CreateItemData` (after `weight_kg`):

```ts
  weight_kg?: number
  owner?: string
```

Leave `ItemTemplate` unchanged.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest __tests__/lib/constants.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
git add lib/constants.ts lib/types.ts __tests__/lib/constants.test.ts
git commit -m "feat: add ITEM_OWNERS constant, normalizeOwner helper, and owner types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Database migration

**Files:**
- Create: `supabase/migrations/0006_item_owner.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `items.owner` column (text, not null, default `'Latitude Equipment'`) on the live schema once applied.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0006_item_owner.sql`:

```sql
-- Owner: the permanent owner of an item — the company (default) or an
-- individual partner. Distinct from current_holder_id, which tracks the
-- item's changing location/holder. The not-null default makes every
-- existing row correct with no backfill.
alter table items
  add column owner text not null default 'Latitude Equipment';
```

- [ ] **Step 2: Sanity-check the SQL**

Confirm the file matches the `ITEM_OWNERS[0]` value exactly (`'Latitude Equipment'`) and follows the same style as `supabase/migrations/0005_add_items_to_kit.sql`. (The migration is applied to the live DB in Task 6, not here.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_item_owner.sql
git commit -m "feat: migration adding owner column to items

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Wire owner through the API routes

**Files:**
- Modify: `app/api/items/route.ts` (POST)
- Modify: `app/api/items/[id]/route.ts` (PATCH)

**Interfaces:**
- Consumes: `normalizeOwner` from `@/lib/constants`; `createItem`/`updateItem` from `@/lib/db/items` (already accept `owner` via the `CreateItemData`/`Partial<CreateItemData>` types from Task 1).
- Produces: POST persists a normalized `owner` on create; PATCH persists a normalized `owner` when `owner` is present in the body.

**Note on testing:** there is no API-route test harness in this repo (tests live in `__tests__/lib/db/` and mock Supabase). The coercion logic is unit-tested in Task 1 via `normalizeOwner`; these route edits are verified by `tsc`/`build` and the preview drive in Task 6. Do not scaffold a new route-test framework.

- [ ] **Step 1: Update the POST route**

In `app/api/items/route.ts`, add the import (extend the existing import block):

```ts
import { normalizeOwner } from '@/lib/constants'
```

Then add `owner` to the `createItem` call so it reads:

```ts
    const item = await createItem({
      name: body.name,
      serial_number: body.serial_number || undefined,
      category: body.category || undefined,
      notes: body.notes || undefined,
      value,
      country_of_origin: body.country_of_origin || undefined,
      weight_kg: weightKg,
      owner: normalizeOwner(body.owner),
    })
```

- [ ] **Step 2: Update the PATCH route**

In `app/api/items/[id]/route.ts`, add the import:

```ts
import { normalizeOwner } from '@/lib/constants'
```

Then, in the **standard field update** block (the one that builds the `updateItem(id, {...})` call after the numeric checks — NOT the early-returning kit_id branch), add owner conditionally so a partial update without `owner` can never clobber it:

```ts
    const item = await updateItem(id, {
      name: body.name,
      serial_number: body.serial_number || undefined,
      category: body.category || undefined,
      notes: body.notes || undefined,
      value,
      country_of_origin: body.country_of_origin || undefined,
      weight_kg: weightKg,
      ...(body.owner !== undefined ? { owner: normalizeOwner(body.owner) } : {}),
    })
```

Leave the kit_id branch (which early-returns) untouched — kit changes come from a separate PATCH call that carries no owner.

- [ ] **Step 3: Verify it type-checks**

Run:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/items/route.ts app/api/items/[id]/route.ts
git commit -m "feat: validate and persist item owner in create/update routes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Owner select on the Add and Edit forms

**Files:**
- Modify: `app/equipment/new/_components/new-item-form.tsx`
- Modify: `app/equipment/[id]/edit/_components/edit-item-form.tsx`

**Interfaces:**
- Consumes: `ITEM_OWNERS` from `@/lib/constants`; `Item.owner` from Task 1.
- Produces: both forms send `owner` in their request body. The Add form defaults to `ITEM_OWNERS[0]` and template fills do not change it; the Edit form initialises from `item.owner`.

- [ ] **Step 1: Add owner state and field to the New item form**

In `app/equipment/new/_components/new-item-form.tsx`:

Extend the constants import:
```ts
import { ITEM_CATEGORIES, ITEM_OWNERS } from '@/lib/constants'
```

Add owner state next to the other `useState` hooks (e.g. right after the `kitId` state on line 50):
```ts
  const [owner, setOwner] = useState<string>(ITEM_OWNERS[0])
```

Add `owner` to the POST body inside `handleSubmit` (add the line alongside the other fields):
```ts
        weight_kg: fields.weight,
        notes: fields.notes,
        owner,
        kit_id: kitId,
```

Add the Owner field to the JSX immediately AFTER the Category `<Field>` block (before the Kit field):
```tsx
      <Field label="Owner">
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass}>
          {ITEM_OWNERS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </Field>
```

Do NOT touch `fieldsFromTemplate` or `applyTemplate` — owner is intentionally outside the template `Fields`, so applying a template leaves the owner selection as-is.

- [ ] **Step 2: Add owner field to the Edit item form**

In `app/equipment/[id]/edit/_components/edit-item-form.tsx`:

Extend the constants import:
```ts
import { ITEM_CATEGORIES, ITEM_OWNERS } from '@/lib/constants'
```

Add `owner` to the standard-update PATCH body inside `handleSubmit`:
```ts
        value: raw.value,
        country_of_origin: raw.country_of_origin,
        weight_kg: raw.weight_kg,
        owner: raw.owner,
```

Add the Owner field to the JSX immediately AFTER the Category `<Field>` block (before the Kit field):
```tsx
      <Field label="Owner">
        <select name="owner" defaultValue={item.owner} className={inputClass}>
          {ITEM_OWNERS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </Field>
```

- [ ] **Step 3: Verify it type-checks**

Run:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/equipment/new/_components/new-item-form.tsx app/equipment/[id]/edit/_components/edit-item-form.tsx
git commit -m "feat: owner select on add and edit item forms

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Owner badge in the list + Owner field on the detail page

**Files:**
- Modify: `components/equipment/item-table.tsx`
- Modify: `app/equipment/[id]/page.tsx`

**Interfaces:**
- Consumes: `ITEM_OWNERS` from `@/lib/constants`; `Item.owner` from Task 1.
- Produces: a grey owner badge on individually-owned rows; an "Owner" entry in the detail page's field grid.

- [ ] **Step 1: Add the badge to the equipment list**

In `components/equipment/item-table.tsx`, add the import near the top:
```ts
import { ITEM_OWNERS } from '@/lib/constants'
```

In the **mobile card**, inside the `<div className="flex items-center min-w-0">` that holds the name and the "On hire" badge, add the owner badge right after the existing "On hire" `<span>` block:
```tsx
                              {item.owner !== ITEM_OWNERS[0] && (
                                <span className="text-[10px] text-brand-mid-grey bg-white/5 border border-brand-rule-grey rounded-full px-1.5 py-0.5 ml-2 whitespace-nowrap flex-shrink-0">
                                  {item.owner}
                                </span>
                              )}
```

In the **desktop table** Name `<td>`, add the owner badge right after the existing "On hire" `<span>` block:
```tsx
                              {item.owner !== ITEM_OWNERS[0] && (
                                <span className="text-[10px] text-brand-mid-grey bg-white/5 border border-brand-rule-grey rounded-full px-1.5 py-0.5 ml-2 align-middle whitespace-nowrap">
                                  {item.owner}
                                </span>
                              )}
```

- [ ] **Step 2: Add the Owner field to the detail page**

In `app/equipment/[id]/page.tsx`, add `['Owner', item.owner]` as the FIRST entry of the `<dl>` field array (before `'Serial number'`):
```tsx
        {[
          ['Owner', item.owner],
          ['Serial number', item.serial_number ?? '—'],
          ['Category', item.category ?? '—'],
```

- [ ] **Step 3: Verify it type-checks**

Run:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/equipment/item-table.tsx app/equipment/[id]/page.tsx
git commit -m "feat: show owner badge in list and owner field on item detail

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Full verification, drive the flow, and deploy

**Files:** none (verification + deploy).

- [ ] **Step 1: Full local verification**

Run in order:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
npx jest
npm run build
```
Expected: tsc clean; all Jest tests pass (the prior suite plus the new `constants.test.ts`); build succeeds.

- [ ] **Step 2: Drive the feature in the preview**

Start the dev server via the preview tooling and confirm end-to-end:
- Add-item form shows an Owner select defaulting to **Latitude Equipment**; changing it to **Jack** and saving persists it (detail page shows Owner: Jack).
- The equipment list shows a grey **Jack** badge on that item and NO badge on a Latitude-owned item.
- Editing the item's owner back to **Latitude Equipment** removes the badge.
- Applying a "copy from existing" template or a serial prefix suggestion does NOT change the Owner selection.

Fix any issue by returning to the relevant task's files, then re-run Step 1.

- [ ] **Step 3: Apply the migration to Supabase FIRST**

In the Supabase SQL editor (project `cunpajzbhufiuibbzjne`), run the contents of `supabase/migrations/0006_item_owner.sql`. Confirm success (e.g. `select owner from items limit 5;` returns `Latitude Equipment` for existing rows).

- [ ] **Step 4: Push to deploy**

```bash
git push origin main
```
Confirm the push lands (`git status` shows up to date with `origin/main`) and Vercel begins a deploy.

---

## Notes for the implementer

- The DB layer (`createItem`/`updateItem` in `lib/db/items.ts`) needs NO code change: both pass their data object straight to Supabase `.insert`/`.update`, and `getItems`/`getItem` already `select('*')`, so `owner` flows through automatically once it is in the type and the DB column exists.
- If `tsc` surfaces an error about a literal object missing `owner` where an `Item` is constructed by hand (not cast from DB data), that is a real gap — add `owner` there. DB reads are cast (`as Item`) and will not error.
