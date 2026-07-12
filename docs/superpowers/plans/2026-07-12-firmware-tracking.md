# Firmware Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track each unit's installed firmware against its model's latest available version, expose it on a Firmware page, and show a session-dismissable dashboard alert when any camera / monitor / drone is out of date.

**Architecture:** A per-unit `items.firmware_version` and a per-model `firmware_targets` table. Pure functions (`isOutdated`, `buildFirmwareModels`, `countOutdated`) compute out-of-date status; `lib/db/firmware.ts` fetches and delegates to them as the single source of truth for both the Firmware page and the dashboard alert. Latest versions are entered manually now; autonomous checking is a later phase the schema already accommodates.

**Tech Stack:** Next.js 16 (App Router), Supabase (`@supabase/ssr`), TypeScript, Tailwind v4, Jest.

## Global Constraints

- **Read the bundled Next.js docs before writing route/page code:** this is a modified Next.js; `AGENTS.md` requires checking `node_modules/next/dist/docs/` and heeding deprecation notices.
- **`FIRMWARE_CATEGORIES` is exactly `['Cameras', 'Monitoring', 'Drones']`** — each entry must be a member of `ITEM_CATEGORIES`. Only these categories appear on the Firmware page / in the alert.
- **`isOutdated(current, latest)`** returns true ONLY when both are non-empty after trim AND differ when compared trimmed + case-insensitive; any empty/missing side returns false. No version ordering / semver.
- **Items match targets by `name` compared trimmed + case-insensitive** (`firmware_targets.model` ↔ `items.name`).
- **`firmware_version` is threaded like the existing `owner` field:** optional free-text; in the Add form it is standalone state, NOT part of the template `Fields` object (a template/prefix fill must not copy firmware); in the Edit form it is an uncontrolled `defaultValue`. No normalization (free text).
- **Banner dismiss is session-scoped** via `sessionStorage` (key `firmware-alert-dismissed`), so it clears when the browser session ends and resurfaces next session while anything is out of date.
- **Red is acceptable** for the firmware out-of-date badge and the dashboard alert — it denotes a genuine alert state (unlike the owner badge, which was deliberately grey).
- **Pre-commit verification (iCloud quirk):** run `find .next -name '* [0-9].*' -delete` before `npx tsc --noEmit`, then `npx jest`, then `npm run build`.
- **Deploy ordering:** apply `0007_firmware.sql` in the Supabase SQL editor (project `cunpajzbhufiuibbzjne`) FIRST, then `git push` to `main`.
- End every commit message with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Foundations — constant, pure firmware logic, and types

**Files:**
- Modify: `lib/constants.ts`
- Modify: `lib/types.ts`
- Create: `lib/firmware/compare.ts`
- Create: `lib/firmware/models.ts`
- Test: `__tests__/lib/firmware/compare.test.ts` (create)
- Test: `__tests__/lib/firmware/models.test.ts` (create)

**Interfaces:**
- Consumes: `ITEM_CATEGORIES` (existing) from `@/lib/constants`.
- Produces:
  - `FIRMWARE_CATEGORIES: readonly ['Cameras', 'Monitoring', 'Drones']`
  - `isOutdated(current: string | null | undefined, latest: string | null | undefined): boolean`
  - `buildFirmwareModels(items: FirmwareItemRow[], targets: FirmwareTarget[]): FirmwareModel[]` where `FirmwareItemRow = { id: string; name: string; serial_number: string | null; firmware_version: string | null }`
  - `countOutdated(models: FirmwareModel[]): number`
  - Types: `Item.firmware_version: string | null`, `CreateItemData.firmware_version?: string`, `FirmwareTarget`, `UpsertFirmwareTargetData`, `FirmwareUnit`, `FirmwareModel`, `FirmwareItemRow`.

- [ ] **Step 1: Add the types**

In `lib/types.ts`, add `firmware_version` to `Item` (after `owner`):

```ts
  owner: string
  firmware_version: string | null
  deleted_at: string | null
```

Add to `CreateItemData` (after `owner`):

```ts
  owner?: string
  firmware_version?: string
```

Append these new types at the end of `lib/types.ts`:

```ts
export type FirmwareTarget = {
  id: string
  model: string
  manufacturer: string | null
  latest_version: string | null
  source_url: string | null
  last_checked_at: string | null
  created_at: string
}

export type UpsertFirmwareTargetData = {
  model: string
  manufacturer?: string
  latest_version?: string
  source_url?: string
}

export type FirmwareItemRow = {
  id: string
  name: string
  serial_number: string | null
  firmware_version: string | null
}

export type FirmwareUnit = {
  id: string
  serial_number: string | null
  firmware_version: string | null
  outdated: boolean
}

export type FirmwareModel = {
  model: string
  manufacturer: string | null
  latest_version: string | null
  source_url: string | null
  last_checked_at: string | null
  units: FirmwareUnit[]
}
```

- [ ] **Step 2: Add the constant**

In `lib/constants.ts`, append:

```ts
export const FIRMWARE_CATEGORIES = ['Cameras', 'Monitoring', 'Drones'] as const
```

- [ ] **Step 3: Write the failing tests for `isOutdated`**

Create `__tests__/lib/firmware/compare.test.ts`:

```ts
import { isOutdated } from '@/lib/firmware/compare'

describe('isOutdated', () => {
  it('is true when current differs from latest', () => {
    expect(isOutdated('1.0.0', '1.1.0')).toBe(true)
  })
  it('is false when they are equal', () => {
    expect(isOutdated('1.1.0', '1.1.0')).toBe(false)
  })
  it('ignores surrounding whitespace', () => {
    expect(isOutdated('  1.1.0 ', '1.1.0')).toBe(false)
  })
  it('is case-insensitive', () => {
    expect(isOutdated('V7.4', 'v7.4')).toBe(false)
  })
  it('is false when either side is empty, null, or undefined', () => {
    expect(isOutdated('', '1.1.0')).toBe(false)
    expect(isOutdated('1.0.0', '')).toBe(false)
    expect(isOutdated(null, '1.1.0')).toBe(false)
    expect(isOutdated('1.0.0', undefined)).toBe(false)
    expect(isOutdated('   ', '1.1.0')).toBe(false)
  })
})
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx jest __tests__/lib/firmware/compare.test.ts`
Expected: FAIL — cannot find module `@/lib/firmware/compare`.

- [ ] **Step 5: Implement `isOutdated`**

Create `lib/firmware/compare.ts`:

```ts
/**
 * A unit is out of date when its installed firmware differs from the model's
 * latest available firmware. Compared trimmed and case-insensitive. If either
 * side is empty/unknown we cannot make a claim, so we report NOT outdated. No
 * attempt is made to order versions — "differs from latest" is the signal.
 */
export function isOutdated(
  current: string | null | undefined,
  latest: string | null | undefined,
): boolean {
  const c = (current ?? '').trim()
  const l = (latest ?? '').trim()
  if (!c || !l) return false
  return c.toLowerCase() !== l.toLowerCase()
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx jest __tests__/lib/firmware/compare.test.ts`
Expected: PASS (all 5 cases).

- [ ] **Step 7: Write the failing tests for `buildFirmwareModels` / `countOutdated`**

Create `__tests__/lib/firmware/models.test.ts`:

```ts
import { buildFirmwareModels, countOutdated } from '@/lib/firmware/models'
import type { FirmwareTarget } from '@/lib/types'

function target(over: Partial<FirmwareTarget> & { model: string }): FirmwareTarget {
  return {
    id: `t-${over.model}`,
    manufacturer: null,
    latest_version: null,
    source_url: null,
    last_checked_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  }
}

describe('buildFirmwareModels', () => {
  it('groups units under one model (matched case/space-insensitively) and flags outdated units', () => {
    const items = [
      { id: 'a', name: 'DJI Air 3', serial_number: 'S1', firmware_version: '1.0.0' },
      { id: 'b', name: 'dji air 3 ', serial_number: 'S2', firmware_version: '1.1.0' },
    ]
    const targets = [target({ model: 'DJI Air 3', latest_version: '1.1.0', manufacturer: 'DJI' })]
    const models = buildFirmwareModels(items, targets)
    expect(models).toHaveLength(1)
    expect(models[0].model).toBe('DJI Air 3')
    expect(models[0].manufacturer).toBe('DJI')
    expect(models[0].units).toHaveLength(2)
    expect(models[0].units.find((u) => u.id === 'a')!.outdated).toBe(true)
    expect(models[0].units.find((u) => u.id === 'b')!.outdated).toBe(false)
  })

  it('includes a model with no target row, with null target fields and no outdated units', () => {
    const items = [{ id: 'a', name: 'Sony FX6', serial_number: null, firmware_version: '3.0' }]
    const models = buildFirmwareModels(items, [])
    expect(models).toHaveLength(1)
    expect(models[0].latest_version).toBeNull()
    expect(models[0].units[0].outdated).toBe(false)
  })

  it('sorts models by name', () => {
    const items = [
      { id: 'a', name: 'Zebra', serial_number: null, firmware_version: null },
      { id: 'b', name: 'Alpha', serial_number: null, firmware_version: null },
    ]
    const models = buildFirmwareModels(items, [])
    expect(models.map((m) => m.model)).toEqual(['Alpha', 'Zebra'])
  })
})

describe('countOutdated', () => {
  it('counts outdated units across all models', () => {
    const items = [
      { id: 'a', name: 'DJI Air 3', serial_number: null, firmware_version: '1.0.0' },
      { id: 'b', name: 'DJI Air 3', serial_number: null, firmware_version: '1.1.0' },
      { id: 'c', name: 'Sony FX6', serial_number: null, firmware_version: '2.0' },
    ]
    const targets = [
      target({ model: 'DJI Air 3', latest_version: '1.1.0' }),
      target({ model: 'Sony FX6', latest_version: '3.0' }),
    ]
    expect(countOutdated(buildFirmwareModels(items, targets))).toBe(2)
  })
})
```

- [ ] **Step 8: Run to verify it fails**

Run: `npx jest __tests__/lib/firmware/models.test.ts`
Expected: FAIL — cannot find module `@/lib/firmware/models`.

- [ ] **Step 9: Implement `buildFirmwareModels` / `countOutdated`**

Create `lib/firmware/models.ts`:

```ts
import { isOutdated } from './compare'
import type { FirmwareItemRow, FirmwareModel, FirmwareTarget } from '@/lib/types'

/**
 * Group firmware-tracked item rows by model name (trimmed, case-insensitive),
 * join each group to its target, and flag out-of-date units. Pure — the DB
 * layer fetches the rows and delegates here so the page and the dashboard
 * alert share one implementation.
 */
export function buildFirmwareModels(
  items: FirmwareItemRow[],
  targets: FirmwareTarget[],
): FirmwareModel[] {
  const targetByModel = new Map(targets.map((t) => [t.model.trim().toLowerCase(), t]))
  const groups = new Map<string, FirmwareModel>()

  for (const it of items) {
    const model = it.name.trim()
    const key = model.toLowerCase()
    const target = targetByModel.get(key) ?? null
    let group = groups.get(key)
    if (!group) {
      group = {
        model,
        manufacturer: target?.manufacturer ?? null,
        latest_version: target?.latest_version ?? null,
        source_url: target?.source_url ?? null,
        last_checked_at: target?.last_checked_at ?? null,
        units: [],
      }
      groups.set(key, group)
    }
    group.units.push({
      id: it.id,
      serial_number: it.serial_number,
      firmware_version: it.firmware_version,
      outdated: isOutdated(it.firmware_version, target?.latest_version ?? null),
    })
  }

  return Array.from(groups.values()).sort((a, b) => a.model.localeCompare(b.model))
}

export function countOutdated(models: FirmwareModel[]): number {
  return models.reduce((n, m) => n + m.units.filter((u) => u.outdated).length, 0)
}
```

- [ ] **Step 10: Run to verify it passes, then type-check**

Run: `npx jest __tests__/lib/firmware/`
Expected: PASS (compare + models suites).

Then:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add lib/constants.ts lib/types.ts lib/firmware/ __tests__/lib/firmware/
git commit -m "feat: firmware constant, comparison/grouping logic, and types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Database migration

**Files:**
- Create: `supabase/migrations/0007_firmware.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `items.firmware_version` column and `firmware_targets` table on the live schema once applied.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0007_firmware.sql`:

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

- [ ] **Step 2: Sanity-check the SQL**

Confirm it follows the style of `supabase/migrations/0001_initial.sql` (RLS `for all to authenticated using (true) with check (true)`, `gen_random_uuid()` default). The migration is applied to the live DB in Task 8, not here.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_firmware.sql
git commit -m "feat: migration for firmware_version column and firmware_targets table

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Firmware data layer

**Files:**
- Create: `lib/db/firmware.ts`
- Test: `__tests__/lib/db/firmware.test.ts` (create)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `FIRMWARE_CATEGORIES` from `@/lib/constants`; `buildFirmwareModels`, `countOutdated` from `@/lib/firmware/models`; types from `@/lib/types`.
- Produces:
  - `getFirmwareTargets(): Promise<FirmwareTarget[]>`
  - `upsertFirmwareTarget(data: UpsertFirmwareTargetData): Promise<FirmwareTarget>`
  - `getFirmwareModels(): Promise<FirmwareModel[]>`
  - `getOutdatedFirmwareCount(): Promise<number>`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/db/firmware.test.ts` (mirrors the mocked-Supabase style in `__tests__/lib/db/items.test.ts`):

```ts
import { getFirmwareTargets, upsertFirmwareTarget } from '@/lib/db/firmware'

const mockFrom: jest.Mock = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

beforeEach(() => jest.clearAllMocks())

describe('getFirmwareTargets', () => {
  it('returns targets ordered by model', async () => {
    const rows = [{ id: 't1', model: 'DJI Air 3', latest_version: '1.1.0' }]
    const order = jest.fn().mockResolvedValue({ data: rows, error: null })
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ order }) })
    const result = await getFirmwareTargets()
    expect(result).toEqual(rows)
    expect(order).toHaveBeenCalledWith('model')
  })

  it('throws on supabase error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ order }) })
    await expect(getFirmwareTargets()).rejects.toThrow('DB error')
  })
})

describe('upsertFirmwareTarget', () => {
  it('upserts on model and stamps last_checked_at when latest_version is provided', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 't1', model: 'DJI Air 3' }, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const upsert = jest.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ upsert })

    await upsertFirmwareTarget({ model: 'DJI Air 3', latest_version: '1.1.0' })

    const [row, opts] = upsert.mock.calls[0]
    expect(opts).toEqual({ onConflict: 'model' })
    expect(row.model).toBe('DJI Air 3')
    expect(row.latest_version).toBe('1.1.0')
    expect(typeof row.last_checked_at).toBe('string')
  })

  it('does not stamp last_checked_at when latest_version is absent', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 't1', model: 'DJI Air 3' }, error: null })
    const upsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) })
    mockFrom.mockReturnValue({ upsert })

    await upsertFirmwareTarget({ model: 'DJI Air 3', source_url: 'https://dji.com' })

    const [row] = upsert.mock.calls[0]
    expect(row.last_checked_at).toBeUndefined()
    expect(row.source_url).toBe('https://dji.com')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/lib/db/firmware.test.ts`
Expected: FAIL — cannot find module `@/lib/db/firmware`.

- [ ] **Step 3: Implement the data layer**

Create `lib/db/firmware.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { FIRMWARE_CATEGORIES } from '@/lib/constants'
import { buildFirmwareModels, countOutdated } from '@/lib/firmware/models'
import type {
  FirmwareItemRow,
  FirmwareModel,
  FirmwareTarget,
  UpsertFirmwareTargetData,
} from '@/lib/types'

export async function getFirmwareTargets(): Promise<FirmwareTarget[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('firmware_targets').select('*').order('model')
  if (error) throw new Error(error.message)
  return data as FirmwareTarget[]
}

/**
 * Insert or update a target keyed on model. Only fields present in `data` are
 * written, so a partial save cannot wipe other columns. Setting a non-empty
 * latest_version stamps last_checked_at (the moment the latest was confirmed).
 */
export async function upsertFirmwareTarget(
  data: UpsertFirmwareTargetData,
): Promise<FirmwareTarget> {
  const supabase = await createClient()
  const row: Record<string, unknown> = { model: data.model.trim() }
  if (data.manufacturer !== undefined) row.manufacturer = data.manufacturer.trim() || null
  if (data.source_url !== undefined) row.source_url = data.source_url.trim() || null
  if (data.latest_version !== undefined) {
    const v = data.latest_version.trim()
    row.latest_version = v || null
    if (v) row.last_checked_at = new Date().toISOString()
  }
  const { data: saved, error } = await supabase
    .from('firmware_targets')
    .upsert(row, { onConflict: 'model' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return saved as FirmwareTarget
}

export async function getFirmwareModels(): Promise<FirmwareModel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('id, name, serial_number, firmware_version')
    .in('category', [...FIRMWARE_CATEGORIES])
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  const targets = await getFirmwareTargets()
  return buildFirmwareModels((data ?? []) as FirmwareItemRow[], targets)
}

export async function getOutdatedFirmwareCount(): Promise<number> {
  return countOutdated(await getFirmwareModels())
}
```

- [ ] **Step 4: Run to verify it passes, then type-check**

Run: `npx jest __tests__/lib/db/firmware.test.ts`
Expected: PASS (4 cases).

Then:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/db/firmware.ts __tests__/lib/db/firmware.test.ts
git commit -m "feat: firmware data layer (targets, models, outdated count)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: API routes — firmware targets + item firmware_version

**Files:**
- Create: `app/api/firmware-targets/route.ts`
- Modify: `app/api/items/route.ts` (POST)
- Modify: `app/api/items/[id]/route.ts` (PATCH)

**Interfaces:**
- Consumes: `upsertFirmwareTarget` from `@/lib/db/firmware`; `serverError`, `readJson` from `@/lib/api/route-helpers`; `createItem`/`updateItem` (already accept `firmware_version` via the types from Task 1).
- Produces: `POST /api/firmware-targets` upserts a target; item create/update persist `firmware_version`.

**Note on testing:** there is no API-route test harness in this repo (route logic is thin; `upsertFirmwareTarget` is unit-tested in Task 3). Verify this task with `tsc`/`build` and the Task 8 preview drive. Do not scaffold a route-test framework.

- [ ] **Step 1: Create the firmware-targets route**

Create `app/api/firmware-targets/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { upsertFirmwareTarget } from '@/lib/db/firmware'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  const model = typeof body.model === 'string' ? body.model.trim() : ''
  if (!model) return NextResponse.json({ message: 'Model is required' }, { status: 400 })

  try {
    const target = await upsertFirmwareTarget({
      model,
      manufacturer: typeof body.manufacturer === 'string' ? body.manufacturer : undefined,
      latest_version: typeof body.latest_version === 'string' ? body.latest_version : undefined,
      source_url: typeof body.source_url === 'string' ? body.source_url : undefined,
    })
    return NextResponse.json(target)
  } catch (e: unknown) {
    return serverError(e, 'POST /api/firmware-targets')
  }
}
```

- [ ] **Step 2: Add firmware_version to the item POST route**

In `app/api/items/route.ts`, add `firmware_version` to the `createItem` call (alongside `owner`):

```ts
      weight_kg: weightKg,
      owner: normalizeOwner(body.owner),
      firmware_version: body.firmware_version || undefined,
    })
```

- [ ] **Step 3: Add firmware_version to the item PATCH route**

In `app/api/items/[id]/route.ts`, in the standard field-update block, add `firmware_version` to the `updateItem` call (after the owner spread):

```ts
      weight_kg: weightKg,
      ...(body.owner !== undefined ? { owner: normalizeOwner(body.owner) } : {}),
      firmware_version: body.firmware_version || undefined,
    })
```

- [ ] **Step 4: Verify it type-checks**

Run:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/firmware-targets/route.ts app/api/items/route.ts app/api/items/[id]/route.ts
git commit -m "feat: firmware-targets upsert route and firmware_version in item routes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Item forms + detail page firmware field

**Files:**
- Modify: `app/equipment/new/_components/new-item-form.tsx`
- Modify: `app/equipment/[id]/edit/_components/edit-item-form.tsx`
- Modify: `app/equipment/[id]/page.tsx`

**Interfaces:**
- Consumes: `Item.firmware_version` from Task 1.
- Produces: both forms send `firmware_version` in their request body; the detail page shows it.

- [ ] **Step 1: Add firmware state + field to the New item form**

In `app/equipment/new/_components/new-item-form.tsx`:

Add firmware state next to the other `useState` hooks (right after the `owner` state):
```ts
  const [firmwareVersion, setFirmwareVersion] = useState('')
```

Add `firmware_version` to the POST body inside `handleSubmit` (alongside `owner`):
```ts
        owner,
        firmware_version: firmwareVersion,
        kit_id: kitId,
```

Add the Firmware field to the JSX immediately AFTER the `Weight (kg)` `<Field>` block and BEFORE the `Notes` field:
```tsx
      <Field label="Firmware version">
        <input value={firmwareVersion} onChange={(e) => setFirmwareVersion(e.target.value)} placeholder="e.g. 01.00.0500" className={inputClass} />
      </Field>
```

Do NOT add `firmware_version` to the `Fields` type or to `fieldsFromTemplate`/`applyTemplate` — firmware must not be copied by a template/prefix fill.

- [ ] **Step 2: Add firmware field to the Edit item form**

In `app/equipment/[id]/edit/_components/edit-item-form.tsx`:

Add `firmware_version` to the standard-update PATCH body inside `handleSubmit` (alongside the other fields):
```ts
        weight_kg: raw.weight_kg,
        owner: raw.owner,
        firmware_version: raw.firmware_version,
```

Add the Firmware field to the JSX immediately AFTER the `Weight (kg)` `<Field>` block and BEFORE the `Notes` field:
```tsx
      <Field label="Firmware version">
        <input name="firmware_version" defaultValue={item.firmware_version ?? ''} placeholder="e.g. 01.00.0500" className={inputClass} />
      </Field>
```

- [ ] **Step 3: Add the Firmware field to the detail page**

In `app/equipment/[id]/page.tsx`, add `['Firmware version', item.firmware_version ?? '—']` as the LAST entry of the `<dl>` field array (after `'Weight'`):
```tsx
          ['Weight', item.weight_kg != null ? `${item.weight_kg} kg` : '—'],
          ['Firmware version', item.firmware_version ?? '—'],
        ].map(([label, value]) => (
```

- [ ] **Step 4: Verify it type-checks**

Run:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/equipment/new/_components/new-item-form.tsx app/equipment/[id]/edit/_components/edit-item-form.tsx app/equipment/[id]/page.tsx
git commit -m "feat: firmware version field on item forms and detail page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Firmware page + nav links

**Files:**
- Create: `app/firmware/page.tsx`
- Create: `app/firmware/_components/firmware-model-card.tsx`
- Modify: `components/nav.tsx`
- Modify: `components/mobile-nav.tsx`

**Interfaces:**
- Consumes: `getFirmwareModels` from `@/lib/db/firmware`; `FirmwareModel` from `@/lib/types`.
- Produces: the `/firmware` route and its nav entries.

- [ ] **Step 1: Create the Firmware page**

Create `app/firmware/page.tsx`:

```tsx
import { getFirmwareModels } from '@/lib/db/firmware'
import { countOutdated } from '@/lib/firmware/models'
import { FirmwareModelCard } from './_components/firmware-model-card'

export default async function FirmwarePage() {
  const models = await getFirmwareModels()
  const outdated = countOutdated(models)

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-xl font-semibold text-white">Firmware</h1>
        {outdated > 0 && (
          <span className="text-sm text-brand-red">{outdated} out of date</span>
        )}
      </div>

      {models.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">
          No cameras, monitors, or drones yet. Add equipment in those categories to track firmware.
        </p>
      ) : (
        <div className="space-y-4">
          {models.map((m) => (
            <FirmwareModelCard key={m.model} model={m} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the model card (with inline latest-version editor)**

Create `app/firmware/_components/firmware-model-card.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FirmwareModel } from '@/lib/types'

const inputClass =
  'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

export function FirmwareModelCard({ model }: { model: FirmwareModel }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [latest, setLatest] = useState(model.latest_version ?? '')
  const [source, setSource] = useState(model.source_url ?? '')
  const [manufacturer, setManufacturer] = useState(model.manufacturer ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/firmware-targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.model,
        manufacturer,
        latest_version: latest,
        source_url: source,
      }),
    })
    if (res.ok) {
      setEditing(false)
      router.refresh()
    } else {
      const { message } = await res.json()
      setError(message)
      setSaving(false)
    }
  }

  return (
    <div className="border border-brand-rule-grey rounded-lg bg-brand-dark-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-white truncate">{model.model}</p>
          {model.manufacturer && <p className="text-xs text-brand-mid-grey">{model.manufacturer}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-xs text-brand-mid-grey hover:text-white flex-shrink-0 transition-colors"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {!editing && (
        <div className="mt-2 text-sm">
          {model.latest_version ? (
            <p className="text-brand-mid-grey">
              Latest: <span className="text-white">{model.latest_version}</span>
              {model.source_url && (
                <>
                  {' · '}
                  <a href={model.source_url} target="_blank" rel="noreferrer" className="text-white hover:underline">
                    source
                  </a>
                </>
              )}
            </p>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="text-brand-red hover:underline">
              Latest unknown — set it
            </button>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          <input value={latest} onChange={(e) => setLatest(e.target.value)} placeholder="Latest version" className={inputClass} />
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source URL" className={inputClass} />
          <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Manufacturer (optional)" className={inputClass} />
          {error && <p className="text-sm text-brand-red">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-brand-red text-white text-sm font-medium px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      <ul className="mt-3 border-t border-brand-rule-grey divide-y divide-brand-rule-grey">
        {model.units.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-brand-mid-grey truncate">{u.serial_number ?? '—'}</span>
            <span className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white">{u.firmware_version ?? '—'}</span>
              {u.outdated && (
                <span className="text-[10px] text-brand-red bg-brand-red/10 border border-brand-red/30 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                  Update
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Add the desktop nav link**

In `components/nav.tsx`, add a Firmware link immediately after the Equipment link:
```tsx
        <Link href="/equipment" className={linkClass('/equipment')}>Equipment</Link>
        <Link href="/firmware" className={linkClass('/firmware')}>Firmware</Link>
```

- [ ] **Step 4: Add the mobile nav tab**

In `components/mobile-nav.tsx`, add a `FirmwareIcon` component after the existing `EquipmentIcon` function:
```tsx
function FirmwareIcon({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#888888'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  )
}
```

And add a tab entry to the `tabs` array immediately after the Equipment entry:
```tsx
    { href: '/equipment', label: 'Equipment', Icon: EquipmentIcon },
    { href: '/firmware', label: 'Firmware', Icon: FirmwareIcon },
```

- [ ] **Step 5: Verify it type-checks and builds**

Run:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/firmware/ components/nav.tsx components/mobile-nav.tsx
git commit -m "feat: firmware page with per-model editor and nav links

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Dashboard firmware alert banner

**Files:**
- Create: `app/dashboard/_components/firmware-alert-banner.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getOutdatedFirmwareCount` from `@/lib/db/firmware`.
- Produces: a session-dismissable alert at the top of the dashboard.

- [ ] **Step 1: Create the banner client component**

Create `app/dashboard/_components/firmware-alert-banner.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DISMISS_KEY = 'firmware-alert-dismissed'

export function FirmwareAlertBanner({ count }: { count: number }) {
  // Start hidden so we never flash the banner before reading sessionStorage.
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  if (count <= 0 || dismissed) return null

  return (
    <div className="mb-6 flex items-center justify-between gap-3 border border-brand-red/40 bg-brand-red/10 rounded-lg px-4 py-3">
      <p className="text-sm text-white">
        {count} {count === 1 ? 'item needs' : 'items need'} a firmware update.{' '}
        <Link href="/firmware" className="font-medium text-brand-red hover:underline">
          Review →
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss firmware alert"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
        className="text-brand-mid-grey hover:text-white flex-shrink-0 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into the dashboard**

In `app/dashboard/page.tsx`:

Add the import:
```ts
import { getOutdatedFirmwareCount } from '@/lib/db/firmware'
import { FirmwareAlertBanner } from './_components/firmware-alert-banner'
```

Add `getOutdatedFirmwareCount()` to the existing `Promise.all` and destructure its result:
```ts
  const [items, kits, hires, clients, outdatedFirmwareCount] = await Promise.all([
    getItems(),
    getKits(),
    getHires(),
    getClients(),
    getOutdatedFirmwareCount(),
  ])
```

Render the banner as the first child inside the top-level `return (<div>` — immediately before the `{/* Status readout hero */}` section:
```tsx
    <div>
      <FirmwareAlertBanner count={outdatedFirmwareCount} />
      {/* Status readout hero */}
```

- [ ] **Step 3: Verify it type-checks and builds**

Run:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/_components/firmware-alert-banner.tsx app/dashboard/page.tsx
git commit -m "feat: session-dismissable firmware alert on the dashboard

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Full verification, drive the flow, and deploy

**Files:** none (verification + deploy).

- [ ] **Step 1: Full local verification**

Run in order:
```bash
find .next -name '* [0-9].*' -delete
npx tsc --noEmit
npx jest
npm run build
```
Expected: tsc clean; all Jest tests pass (prior suite + new `compare`, `models`, `firmware` suites); build succeeds.

- [ ] **Step 2: Drive the feature in the preview** (after the migration is applied — see Step 3; the create/edit and page flows need the `firmware_version` column and `firmware_targets` table to exist)

Start the dev server via the preview tooling and confirm end-to-end:
- Add/Edit item form shows an optional "Firmware version" field; setting it on a camera/drone persists (detail page shows it).
- `/firmware` lists cameras/monitors/drones grouped by model; the "Edit" control sets a latest version + source URL; a unit whose firmware differs from latest shows the red "Update" badge; a model with no target shows "Latest unknown — set it".
- The dashboard shows the red alert when something is out of date; the ✕ dismisses it; it stays gone on client navigation within the session and returns after a full reload with a fresh session (the sessionStorage key is cleared).
- Adding an item via a "copy from existing"/prefix suggestion leaves the Firmware field blank (not copied).

Fix any issue by returning to the relevant task's files, then re-run Step 1.

- [ ] **Step 3: Apply the migration to Supabase FIRST**

In the Supabase SQL editor (project `cunpajzbhufiuibbzjne`), run the contents of `supabase/migrations/0007_firmware.sql`. Confirm the `items.firmware_version` column and `firmware_targets` table exist (e.g. `select firmware_version from items limit 1;` and `select * from firmware_targets limit 1;` both succeed).

- [ ] **Step 4: Push to deploy**

```bash
git push origin main
```
Confirm the push lands (`git status` shows up to date with `origin/main`) and Vercel begins a deploy.

---

## Notes for the implementer

- `lib/db/items.ts` (`createItem`/`updateItem`) needs NO change — they pass their data object straight to Supabase, and `getItem`/`getItems` `select('*')`, so `firmware_version` flows through automatically once it is in the type and the routes send it (same passthrough as `owner`).
- `firmware_version: body.firmware_version || undefined` in the item routes follows the existing optional-text-field idiom (category, notes, country): an empty string is treated as "no change" on update. This is intentional and consistent with the surrounding code — do not "fix" it into clobbering behavior.
- The `FirmwareModelCard` "Update" badge legitimately uses `brand-red` (it is an alert state), unlike the grey owner badge. This is per the spec's Global Constraints.
- If `tsc` flags an object literal missing `firmware_version` where an `Item` is built by hand (not cast from DB data), add the field there — but all reads are cast (`as Item`) and will not error.
