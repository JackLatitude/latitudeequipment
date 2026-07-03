# Hire Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client management, hire lifecycle tracking (draft → active → returned), and branded PDF packing slips to the Latitude Equipment tracker.

**Architecture:** Three new Supabase tables (`clients`, `hires`, `hire_items`) with a Postgres function for auto-generated `LAT-NNN` refs. New `/hires` route tree with client pages nested under it. PDF generated server-side by a Python/ReportLab script invoked from a Next.js API route.

**Tech Stack:** Next.js 16 App Router, Supabase (`@supabase/ssr`), Tailwind v4, Jest, Python 3 + ReportLab.

**Spec:** `docs/superpowers/specs/2026-07-03-hire-management-design.md` (authoritative).

## Global Constraints

- Brand tokens (already in `app/globals.css`): `brand-red #ED2643`, `brand-black`, `brand-dark-surface #1a1a1a`, `brand-input #111111`, `brand-mid-grey #888888`, `brand-rule-grey #333333`.
- Standard input class: `border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red`.
- Standard label class: `block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5`.
- Primary button class: `bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50`.
- Page h1: `text-2xl font-bold text-white`.
- Hire status values are exactly: `draft`, `active`, `returned`.
- Hire refs are exactly `LAT-` + 3-digit zero-padded number (`LAT-001`).
- API route pattern: auth check via `supabase.auth.getUser()` returning 401, then try/catch returning `NextResponse.json({ message }, { status: 500 })` on error (see `app/api/kits/route.ts`).
- DB helper pattern: `createClient()` from `@/lib/supabase/server`, throw `new Error(error.message)` on failure (see `lib/db/kits.ts`).
- Tests: Jest, mock `@/lib/supabase/server` (see `__tests__/lib/db/kits.test.ts`).
- Run tests with `npx jest <path> -v`.
- Next.js 16: route params are `Promise` — always `const { id } = await params`.
- No pricing, invoicing, email, or client portal (out of scope).
- Commit after every task. Do NOT push (user pushes manually).

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260703_hire_management.sql`

**Interfaces:**
- Produces: tables `clients`, `hires`, `hire_items`; trigger that fills `hires.ref` on insert.

- [ ] **Step 1: Check the migrations directory convention**

Run: `ls supabase/migrations/ 2>/dev/null || ls supabase/ 2>/dev/null || echo "no supabase dir"`

If there is no `supabase/migrations/` directory, look at how previous schema changes were applied (check `docs/` and git log for `.sql` files). If the project has no migration convention, create `supabase/migrations/` and note in the commit message that the SQL must be run manually in the Supabase SQL editor.

- [ ] **Step 2: Write the migration SQL**

Create `supabase/migrations/20260703_hire_management.sql`:

```sql
-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

-- Hires
create table hires (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  title text not null,
  client_id uuid not null references clients(id),
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'returned')),
  notes text,
  created_by_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Hire items (one row per physical item on a hire)
create table hire_items (
  id uuid primary key default gen_random_uuid(),
  hire_id uuid not null references hires(id) on delete cascade,
  item_id uuid not null references items(id),
  checked_out_at timestamptz,
  checked_in_at timestamptz,
  condition_out text,
  condition_in text,
  unique (hire_id, item_id)
);

-- Auto-generate LAT-NNN ref on insert
create or replace function generate_hire_ref()
returns trigger as $$
declare
  next_num int;
begin
  select coalesce(max((substring(ref from 5))::int), 0) + 1
    into next_num
    from hires
    where ref ~ '^LAT-[0-9]+$';
  new.ref := 'LAT-' || lpad(next_num::text, 3, '0');
  return new;
end;
$$ language plpgsql;

create trigger hires_set_ref
  before insert on hires
  for each row
  when (new.ref is null or new.ref = '')
  execute function generate_hire_ref();

-- RLS: match existing tables (authenticated users full access)
alter table clients enable row level security;
alter table hires enable row level security;
alter table hire_items enable row level security;

create policy "Authenticated full access" on clients
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on hires
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on hire_items
  for all to authenticated using (true) with check (true);
```

Note: the app inserts hires without a `ref` value — the trigger fills it. Because `ref` is `not null`, the insert payload must pass `ref: ''` OR the column default must be handled by the trigger; the trigger runs `before insert` and fires `when (new.ref is null or new.ref = '')`, so inserting with `ref` omitted works only if the column allows the trigger to run before the not-null check. Postgres checks not-null constraints AFTER before-insert triggers, so omitting `ref` entirely is fine.

- [ ] **Step 3: Apply the migration**

If the project uses the Supabase CLI: `npx supabase db push` (or the project's established command). Otherwise, print the SQL and instruct the user to run it in the Supabase SQL editor — then STOP and report BLOCKED status until confirmed, because every later task depends on these tables existing.

Verify: in a Node one-liner or via the app, `select * from hires` returns empty result (not "relation does not exist").

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260703_hire_management.sql
git commit -m "feat: add clients, hires, hire_items tables with LAT-ref trigger"
```

---

### Task 2: Types and client DB helpers

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/db/clients.ts`
- Test: `__tests__/lib/db/clients.test.ts`

**Interfaces:**
- Produces: types `Client`, `CreateClientData`, `Hire`, `HireItem`, `HireStatus`, `CreateHireData`; functions `getClients(): Promise<Client[]>`, `getClient(id): Promise<Client | null>`, `createClient_(data: CreateClientData): Promise<Client>`, `updateClient(id, data: Partial<CreateClientData>): Promise<Client>`, `deleteClient(id): Promise<void>` (throws `Error('CLIENT_HAS_HIRES')` if the client has hires).

- [ ] **Step 1: Add types to `lib/types.ts`**

Append to `lib/types.ts`:

```typescript
export type Client = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type CreateClientData = {
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export type HireStatus = 'draft' | 'active' | 'returned'

export type Hire = {
  id: string
  ref: string
  title: string
  client_id: string
  client?: Client
  start_date: string | null
  end_date: string | null
  status: HireStatus
  notes: string | null
  created_by_id: string | null
  created_at: string
  hire_items?: HireItem[]
}

export type HireItem = {
  id: string
  hire_id: string
  item_id: string
  item?: Item
  checked_out_at: string | null
  checked_in_at: string | null
  condition_out: string | null
  condition_in: string | null
}

export type CreateHireData = {
  title: string
  client_id: string
  start_date?: string
  end_date?: string
  notes?: string
  created_by_id: string
}
```

- [ ] **Step 2: Write failing tests**

Create `__tests__/lib/db/clients.test.ts`:

```typescript
import { getClients, deleteClient } from '@/lib/db/clients'

const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getClients', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns clients ordered by name', async () => {
    const fakeClients = [{ id: '1', name: 'Nike' }]
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: fakeClients, error: null }),
      }),
    })
    const result = await getClients()
    expect(result).toEqual(fakeClients)
  })
})

describe('deleteClient', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws CLIENT_HAS_HIRES when client has hires', async () => {
    // count query for hires
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
      }),
    })
    await expect(deleteClient('c1')).rejects.toThrow('CLIENT_HAS_HIRES')
  })

  it('deletes when client has no hires', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    })
    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })
    mockFrom.mockReturnValueOnce({ delete: mockDelete })
    await deleteClient('c1')
    expect(mockDelete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest __tests__/lib/db/clients.test.ts -v`
Expected: FAIL — cannot find module `@/lib/db/clients`

- [ ] **Step 4: Implement `lib/db/clients.ts`**

```typescript
import { createClient as createSupabase } from '@/lib/supabase/server'
import type { Client, CreateClientData } from '@/lib/types'

export async function getClients(): Promise<Client[]> {
  const supabase = await createSupabase()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data as Client[]
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createSupabase()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Client
}

export async function createClient_(data: CreateClientData): Promise<Client> {
  const supabase = await createSupabase()
  const { data: client, error } = await supabase
    .from('clients')
    .insert(data)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return client as Client
}

export async function updateClient(id: string, data: Partial<CreateClientData>): Promise<Client> {
  const supabase = await createSupabase()
  const { data: client, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return client as Client
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = await createSupabase()
  const { count, error: countError } = await supabase
    .from('hires')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
  if (countError) throw new Error(countError.message)
  if ((count ?? 0) > 0) throw new Error('CLIENT_HAS_HIRES')
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

Note: the function is named `createClient_` (trailing underscore) to avoid colliding with the Supabase `createClient` import. The count query in the test mocks `.select().eq()` resolving directly — if the real chain resolves differently, adjust the mock, not the implementation shape.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/lib/db/clients.test.ts -v`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/db/clients.ts __tests__/lib/db/clients.test.ts
git commit -m "feat: add client types and DB helpers"
```

---

### Task 3: Hire DB helpers

**Files:**
- Create: `lib/db/hires.ts`
- Test: `__tests__/lib/db/hires.test.ts`

**Interfaces:**
- Consumes: types from Task 2 (`Hire`, `HireItem`, `CreateHireData`).
- Produces:
  - `getHires(): Promise<Hire[]>` — all hires with client joined, ordered by created_at desc
  - `getHire(id): Promise<Hire | null>` — with client and hire_items→items joined
  - `createHire(data: CreateHireData): Promise<Hire>`
  - `updateHire(id, data: Partial<Omit<CreateHireData, 'created_by_id'>>): Promise<Hire>`
  - `addHireItems(hireId: string, itemIds: string[]): Promise<void>` — bulk insert, ignores duplicates
  - `removeHireItem(hireId: string, itemId: string): Promise<void>`
  - `checkoutHire(hireId: string): Promise<void>` — sets status active + all checked_out_at
  - `checkinHireItem(hireId: string, itemId: string, condition?: string): Promise<void>`
  - `checkinHire(hireId: string): Promise<void>` — checks in all outstanding + sets status returned
  - `getActiveHireItemsByItemIds(itemIds: string[]): Promise<HireItem[]>` — hire_items on active hires (checked_out_at set, checked_in_at null) with hire joined; used for "On hire" chips
  - `getHiresByClient(clientId: string): Promise<Hire[]>`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/db/hires.test.ts`:

```typescript
import { getHires, checkoutHire, checkinHire } from '@/lib/db/hires'

const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getHires', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns hires with client joined, newest first', async () => {
    const fakeHires = [{ id: 'h1', ref: 'LAT-001', title: 'Nike Shoot' }]
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: fakeHires, error: null }),
      }),
    })
    const result = await getHires()
    expect(result).toEqual(fakeHires)
    expect(mockFrom).toHaveBeenCalledWith('hires')
  })
})

describe('checkoutHire', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sets checked_out_at on all items then status to active', async () => {
    const itemsUpdateEq = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({ eq: itemsUpdateEq }),
    })
    const hireUpdateEq = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({ eq: hireUpdateEq }),
    })
    await checkoutHire('h1')
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'hire_items')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'hires')
  })
})

describe('checkinHire', () => {
  beforeEach(() => jest.clearAllMocks())

  it('checks in outstanding items then sets status to returned', async () => {
    const isChain = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ is: isChain }),
      }),
    })
    const hireUpdateEq = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({ eq: hireUpdateEq }),
    })
    await checkinHire('h1')
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'hire_items')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'hires')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/db/hires.test.ts -v`
Expected: FAIL — cannot find module `@/lib/db/hires`

- [ ] **Step 3: Implement `lib/db/hires.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Hire, HireItem, CreateHireData } from '@/lib/types'

const HIRE_SELECT = '*, client:clients(*)'
const HIRE_DETAIL_SELECT = '*, client:clients(*), hire_items(*, item:items(*))'

export async function getHires(): Promise<Hire[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hires')
    .select(HIRE_DETAIL_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Hire[]
}

export async function getHire(id: string): Promise<Hire | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hires')
    .select(HIRE_DETAIL_SELECT)
    .eq('id', id)
    .single()
  if (error) return null
  return data as Hire
}

export async function getHiresByClient(clientId: string): Promise<Hire[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hires')
    .select(HIRE_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Hire[]
}

export async function createHire(data: CreateHireData): Promise<Hire> {
  const supabase = await createClient()
  const { data: hire, error } = await supabase
    .from('hires')
    .insert(data)
    .select(HIRE_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return hire as Hire
}

export async function updateHire(
  id: string,
  data: Partial<Omit<CreateHireData, 'created_by_id'>>
): Promise<Hire> {
  const supabase = await createClient()
  const { data: hire, error } = await supabase
    .from('hires')
    .update(data)
    .eq('id', id)
    .select(HIRE_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return hire as Hire
}

export async function addHireItems(hireId: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return
  const supabase = await createClient()
  const rows = itemIds.map((item_id) => ({ hire_id: hireId, item_id }))
  const { error } = await supabase
    .from('hire_items')
    .upsert(rows, { onConflict: 'hire_id,item_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

export async function removeHireItem(hireId: string, itemId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('hire_items')
    .delete()
    .eq('hire_id', hireId)
    .eq('item_id', itemId)
  if (error) throw new Error(error.message)
}

export async function checkoutHire(hireId: string): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error: itemsError } = await supabase
    .from('hire_items')
    .update({ checked_out_at: now })
    .eq('hire_id', hireId)
  if (itemsError) throw new Error(itemsError.message)
  const { error } = await supabase
    .from('hires')
    .update({ status: 'active' })
    .eq('id', hireId)
  if (error) throw new Error(error.message)
}

export async function checkinHireItem(
  hireId: string,
  itemId: string,
  condition?: string
): Promise<void> {
  const supabase = await createClient()
  const update: Record<string, string> = { checked_in_at: new Date().toISOString() }
  if (condition) update.condition_in = condition
  const { error } = await supabase
    .from('hire_items')
    .update(update)
    .eq('hire_id', hireId)
    .eq('item_id', itemId)
  if (error) throw new Error(error.message)
}

export async function checkinHire(hireId: string): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error: itemsError } = await supabase
    .from('hire_items')
    .update({ checked_in_at: now })
    .eq('hire_id', hireId)
    .is('checked_in_at', null)
  if (itemsError) throw new Error(itemsError.message)
  const { error } = await supabase
    .from('hires')
    .update({ status: 'returned' })
    .eq('id', hireId)
  if (error) throw new Error(error.message)
}

export async function getActiveHireItemsByItemIds(itemIds: string[]): Promise<HireItem[]> {
  if (itemIds.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hire_items')
    .select('*, hire:hires!inner(*)')
    .in('item_id', itemIds)
    .not('checked_out_at', 'is', null)
    .is('checked_in_at', null)
    .eq('hire.status', 'active')
  if (error) throw new Error(error.message)
  return data as unknown as HireItem[]
}
```

Note on `checkoutHire`/`checkinHire` mock shape: the test for checkout expects `.update().eq()` resolving directly; checkin's first update chains `.eq().is()`. Match the implementation order exactly (hire_items first, then hires).

Note: `getActiveHireItemsByItemIds` returns `HireItem` rows with a `hire` property joined — extend the `HireItem` type inline usage with a cast where consumed, or add `hire?: Hire` to the `HireItem` type in `lib/types.ts` (do this — add `hire?: Hire` to `HireItem` now).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/db/hires.test.ts -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `npx jest`
Expected: all suites pass

- [ ] **Step 6: Commit**

```bash
git add lib/db/hires.ts lib/types.ts __tests__/lib/db/hires.test.ts
git commit -m "feat: add hire DB helpers with checkout/checkin lifecycle"
```

---

### Task 4: Client API routes

**Files:**
- Create: `app/api/clients/route.ts`
- Create: `app/api/clients/[id]/route.ts`

**Interfaces:**
- Consumes: `createClient_`, `updateClient`, `deleteClient` from `lib/db/clients.ts` (Task 2).
- Produces: `POST /api/clients` → Client JSON; `PATCH /api/clients/[id]` → Client JSON; `DELETE /api/clients/[id]` → 204, or 409 `{ message: 'Client has hires and cannot be deleted' }`.

- [ ] **Step 1: Create `app/api/clients/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { createClient_ } from '@/lib/db/clients'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 })
  }
  try {
    const client = await createClient_({
      name: body.name,
      contact_name: body.contact_name || undefined,
      email: body.email || undefined,
      phone: body.phone || undefined,
      address: body.address || undefined,
      notes: body.notes || undefined,
    })
    return NextResponse.json(client)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/clients/[id]/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { updateClient, deleteClient } from '@/lib/db/clients'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const client = await updateClient(id, {
      name: body.name,
      contact_name: body.contact_name ?? undefined,
      email: body.email ?? undefined,
      phone: body.phone ?? undefined,
      address: body.address ?? undefined,
      notes: body.notes ?? undefined,
    })
    return NextResponse.json(client)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await deleteClient(id)
    return new Response(null, { status: 204 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    if (message === 'CLIENT_HAS_HIRES') {
      return NextResponse.json(
        { message: 'Client has hires and cannot be deleted' },
        { status: 409 }
      )
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (or only pre-existing ones — check `git stash && npx tsc --noEmit` baseline first if any appear).

- [ ] **Step 4: Commit**

```bash
git add app/api/clients
git commit -m "feat: add client API routes"
```

---

### Task 5: Hire API routes

**Files:**
- Create: `app/api/hires/route.ts`
- Create: `app/api/hires/[id]/route.ts`
- Create: `app/api/hires/[id]/checkout/route.ts`
- Create: `app/api/hires/[id]/checkin/route.ts`
- Create: `app/api/hires/[id]/items/route.ts`
- Create: `app/api/hires/[id]/items/[itemId]/route.ts`
- Create: `app/api/hires/[id]/items/[itemId]/checkin/route.ts`

**Interfaces:**
- Consumes: all functions from `lib/db/hires.ts` (Task 3).
- Produces the API surface the UI pages (Tasks 8–9) call:
  - `POST /api/hires` body `{ title, client_id, start_date?, end_date?, notes? }` → Hire JSON
  - `PATCH /api/hires/[id]` → Hire JSON
  - `POST /api/hires/[id]/checkout` → `{ ok: true }` (409 if hire not draft)
  - `POST /api/hires/[id]/checkin` → `{ ok: true }` (409 if hire not active)
  - `POST /api/hires/[id]/items` body `{ itemIds: string[] }` → `{ ok: true }` (409 if hire not draft)
  - `DELETE /api/hires/[id]/items/[itemId]` → 204 (409 if hire not draft)
  - `POST /api/hires/[id]/items/[itemId]/checkin` body `{ condition? }` → `{ ok: true }` (409 if hire not active)

- [ ] **Step 1: Create `app/api/hires/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { createHire } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.title || !body.client_id) {
    return NextResponse.json({ message: 'Title and client are required' }, { status: 400 })
  }
  try {
    const hire = await createHire({
      title: body.title,
      client_id: body.client_id,
      start_date: body.start_date || undefined,
      end_date: body.end_date || undefined,
      notes: body.notes || undefined,
      created_by_id: user.id,
    })
    return NextResponse.json(hire)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/hires/[id]/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { updateHire } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const hire = await updateHire(id, {
      title: body.title,
      client_id: body.client_id,
      start_date: body.start_date || undefined,
      end_date: body.end_date || undefined,
      notes: body.notes ?? undefined,
    })
    return NextResponse.json(hire)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create the status-guard helper and transition routes**

All transition routes share a status guard. Put it in `lib/db/hires.ts` — append:

```typescript
export async function getHireStatus(hireId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hires')
    .select('status')
    .eq('id', hireId)
    .single()
  if (error) return null
  return data.status
}
```

Create `app/api/hires/[id]/checkout/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { checkoutHire, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getHireStatus(id)
    if (status !== 'draft') {
      return NextResponse.json({ message: 'Only draft hires can be checked out' }, { status: 409 })
    }
    await checkoutHire(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

Create `app/api/hires/[id]/checkin/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { checkinHire, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getHireStatus(id)
    if (status !== 'active') {
      return NextResponse.json({ message: 'Only active hires can be returned' }, { status: 409 })
    }
    await checkinHire(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create the item-management routes**

Create `app/api/hires/[id]/items/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { addHireItems, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!Array.isArray(body.itemIds) || body.itemIds.length === 0) {
    return NextResponse.json({ message: 'itemIds must be a non-empty array' }, { status: 400 })
  }
  try {
    const status = await getHireStatus(id)
    if (status !== 'draft') {
      return NextResponse.json({ message: 'Items can only be added to draft hires' }, { status: 409 })
    }
    await addHireItems(id, body.itemIds)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

Create `app/api/hires/[id]/items/[itemId]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { removeHireItem, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string; itemId: string }> }

export async function DELETE(request: Request, { params }: Ctx) {
  const { id, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getHireStatus(id)
    if (status !== 'draft') {
      return NextResponse.json({ message: 'Items can only be removed from draft hires' }, { status: 409 })
    }
    await removeHireItem(id, itemId)
    return new Response(null, { status: 204 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

Create `app/api/hires/[id]/items/[itemId]/checkin/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { checkinHireItem, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string; itemId: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  try {
    const status = await getHireStatus(id)
    if (status !== 'active') {
      return NextResponse.json({ message: 'Items can only be checked in on active hires' }, { status: 409 })
    }
    await checkinHireItem(id, itemId, body.condition || undefined)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/hires lib/db/hires.ts
git commit -m "feat: add hire API routes with status guards"
```

---

### Task 6: PDF generation script

**Files:**
- Create: `scripts/generate-hire-pdf.py`
- Create: `scripts/pdf-assets/` (fonts + logo copied from brand skill)

**Interfaces:**
- Consumes: JSON on stdin (shape below).
- Produces: PDF bytes on stdout. Exit code 0 on success; error text on stderr and non-zero exit on failure. Task 7's API route relies on exactly this contract.

Input JSON shape (written by Task 7):

```json
{
  "ref": "LAT-001",
  "title": "Nike Shoot – July 2026",
  "status": "draft",
  "client": { "name": "Nike", "contact_name": "Jane Doe", "email": "jane@nike.com", "phone": "07700 900000", "address": "1 Swoosh Way\nLondon" },
  "start_date": "2026-07-10",
  "end_date": "2026-07-14",
  "checked_out_at": null,
  "items": [
    { "name": "DJI Inspire 3", "serial_number": "SN123", "category": "Drones", "checked_in": false }
  ]
}
```

- [ ] **Step 1: Copy brand assets into the repo**

The skill assets live outside the repo and won't exist on Vercel. Copy them in:

```bash
mkdir -p scripts/pdf-assets/fonts
SKILL="/Users/jdownes/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/6153d82b-d4d3-4f15-bd77-8ebff2de6248/a98a14bc-646a-44a3-ba29-6ba07e492d08/skills/latitude-brand-docs/assets"
cp "$SKILL/fonts/ttf/Metropolis-Regular.ttf" "$SKILL/fonts/ttf/Metropolis-Bold.ttf" "$SKILL/fonts/ttf/Metropolis-Medium.ttf" "$SKILL/fonts/ttf/Metropolis-ExtraLight.ttf" scripts/pdf-assets/fonts/
cp "$SKILL/logos/logo_white_full_on_black.png" scripts/pdf-assets/
```

Verify: `ls scripts/pdf-assets/fonts/` shows 4 TTFs; `ls scripts/pdf-assets/` shows the logo PNG.

- [ ] **Step 2: Ensure ReportLab is installed locally**

Run: `python3 -c "import reportlab; print(reportlab.__version__)" || pip3 install reportlab --break-system-packages`

- [ ] **Step 3: Write `scripts/generate-hire-pdf.py`**

```python
#!/usr/bin/env python3
"""Generate a branded Latitude Equipment hire packing slip PDF.

Reads hire JSON on stdin, writes PDF bytes on stdout.
"""
import json
import os
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdf-assets")
FONTS = os.path.join(ASSETS, "fonts")
LOGO_FULL = os.path.join(ASSETS, "logo_white_full_on_black.png")

for name, fname in {
    "Metropolis": "Metropolis-Regular.ttf",
    "Metropolis-Bold": "Metropolis-Bold.ttf",
    "Metropolis-Medium": "Metropolis-Medium.ttf",
    "Metropolis-ExtraLight": "Metropolis-ExtraLight.ttf",
}.items():
    pdfmetrics.registerFont(TTFont(name, os.path.join(FONTS, fname)))

BRAND_RED = colors.HexColor("#ED2643")
BLACK = colors.HexColor("#000000")
WHITE = colors.white
LIGHT_GREY = colors.HexColor("#F2F2F2")
MID_GREY = colors.HexColor("#888888")
RULE_GREY = colors.HexColor("#DDDDDD")

PAGE_W, PAGE_H = A4
MARGIN_L = MARGIN_R = 45
MARGIN_B = 50
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R  # 505pt

HEADER_H = 80
LOGO_H = 60
LOGO_W = LOGO_H * (1600 / 570)
SLIM_BAR_H = 38
FIRST_TOP = HEADER_H + 24

STYLES = {
    "DocTitle": ParagraphStyle("DocTitle", fontName="Metropolis-Bold",
        fontSize=20, textColor=BLACK, spaceAfter=3, leading=24),
    "DocSubtitle": ParagraphStyle("DocSubtitle", fontName="Metropolis-ExtraLight",
        fontSize=12, textColor=MID_GREY, spaceAfter=14, leading=15),
    "H1": ParagraphStyle("H1", fontName="Metropolis-Bold", fontSize=8.5,
        textColor=WHITE, backColor=BLACK, spaceBefore=16, spaceAfter=6,
        leading=13, borderPadding=(5, 6, 5, 6)),
    "Body": ParagraphStyle("Body", fontName="Metropolis", fontSize=9.5,
        textColor=BLACK, spaceAfter=6, leading=14),
    "InfoLabel": ParagraphStyle("InfoLabel", fontName="Metropolis-Bold",
        fontSize=8, textColor=MID_GREY, leading=11),
    "InfoValue": ParagraphStyle("InfoValue", fontName="Metropolis",
        fontSize=8.5, textColor=BLACK, leading=11),
    "Cell": ParagraphStyle("Cell", fontName="Metropolis", fontSize=8.5,
        textColor=BLACK, leading=11),
    "CellHead": ParagraphStyle("CellHead", fontName="Metropolis-Bold",
        fontSize=8.5, textColor=WHITE, leading=11),
    "SigLabel": ParagraphStyle("SigLabel", fontName="Metropolis-Bold",
        fontSize=8, textColor=MID_GREY, leading=14),
}


def draw_footer(canvas, doc):
    canvas.saveState()
    y = MARGIN_B - 22
    canvas.setStrokeColor(BRAND_RED)
    canvas.setLineWidth(1)
    canvas.line(MARGIN_L, y + 14, PAGE_W - MARGIN_R, y + 14)
    canvas.setFont("Metropolis-ExtraLight", 7.5)
    canvas.setFillColor(MID_GREY)
    canvas.drawString(MARGIN_L, y, "Latitude Equipment  |  latitudeequipment.com")
    canvas.drawRightString(PAGE_W - MARGIN_R, y, f"Page {doc.page}")
    canvas.restoreState()


def first_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLACK)
    canvas.rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
    canvas.setFillColor(BRAND_RED)
    canvas.rect(0, PAGE_H - 3, PAGE_W, 3, fill=1, stroke=0)
    logo_y = PAGE_H - HEADER_H + (HEADER_H - LOGO_H) / 2
    canvas.drawImage(LOGO_FULL, MARGIN_L, logo_y, width=LOGO_W, height=LOGO_H,
                     preserveAspectRatio=True, mask="auto")
    draw_footer(canvas, doc)
    canvas.restoreState()


def later_pages(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLACK)
    canvas.rect(0, PAGE_H - SLIM_BAR_H, PAGE_W, SLIM_BAR_H, fill=1, stroke=0)
    canvas.setFillColor(BRAND_RED)
    canvas.rect(0, PAGE_H - 3, PAGE_W, 3, fill=1, stroke=0)
    draw_footer(canvas, doc)
    canvas.restoreState()


def fmt_date(iso):
    if not iso:
        return ""
    from datetime import date, datetime
    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        d = datetime.strptime(iso[:10], "%Y-%m-%d")
    return d.strftime("%d %B %Y")


def build_story(hire):
    story = []
    is_draft = hire["status"] == "draft"

    subtitle = "EQUIPMENT HIRE — DRAFT" if is_draft else "EQUIPMENT HIRE"
    story.append(Paragraph(hire["title"], STYLES["DocTitle"]))
    story.append(Paragraph(subtitle, STYLES["DocSubtitle"]))

    client = hire.get("client") or {}
    dates = " – ".join(filter(None, [fmt_date(hire.get("start_date")), fmt_date(hire.get("end_date"))]))
    info_rows = [
        ("Hire Ref", hire["ref"]),
        ("Client", client.get("name", "")),
    ]
    if client.get("contact_name"):
        info_rows.append(("Contact", client["contact_name"]))
    if client.get("email"):
        info_rows.append(("Email", client["email"]))
    if client.get("phone"):
        info_rows.append(("Phone", client["phone"]))
    if dates:
        info_rows.append(("Hire Dates", dates))
    if hire.get("checked_out_at"):
        info_rows.append(("Checked Out", fmt_date(hire["checked_out_at"])))
    if client.get("address"):
        info_rows.append(("Address", client["address"].replace("\n", "<br/>")))

    info_data = [
        [Paragraph(label, STYLES["InfoLabel"]), Paragraph(value, STYLES["InfoValue"])]
        for label, value in info_rows
    ]
    info = Table(info_data, colWidths=[110, CONTENT_W - 110])
    info.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, LIGHT_GREY]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.25, RULE_GREY),
        ("LINEABOVE", (0, 0), (-1, 0), 1.5, BRAND_RED),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, RULE_GREY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(info)

    story.append(Paragraph("EQUIPMENT", STYLES["H1"]))
    head = [Paragraph(h, STYLES["CellHead"]) for h in
            ["Item", "Serial No.", "Category", "Out ✓", "In ✓"]]
    rows = [head]
    for it in hire["items"]:
        in_mark = "✓" if it.get("checked_in") else ""
        rows.append([
            Paragraph(it.get("name", ""), STYLES["Cell"]),
            Paragraph(it.get("serial_number") or "", STYLES["Cell"]),
            Paragraph(it.get("category") or "", STYLES["Cell"]),
            Paragraph("", STYLES["Cell"]),
            Paragraph(in_mark, STYLES["Cell"]),
        ])
    items_table = Table(rows, colWidths=[195, 110, 90, 55, 55], repeatRows=1)
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GREY]),
        ("GRID", (0, 0), (-1, -1), 0.25, RULE_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEABOVE", (0, 0), (-1, 0), 2, BRAND_RED),
        ("ALIGN", (3, 0), (4, -1), "CENTER"),
    ]))
    story.append(items_table)

    story.append(Spacer(1, 28))
    sig_cell = TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, RULE_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ])

    def sig_box(title):
        inner = Table(
            [[Paragraph(f"<b>{title}</b>", STYLES["SigLabel"])],
             [Paragraph("Name: ______________________________", STYLES["Body"])],
             [Paragraph("Signature: __________________________", STYLES["Body"])],
             [Paragraph("Date: ______________________________", STYLES["Body"])]],
            colWidths=[(CONTENT_W - 15) / 2 - 20],
        )
        inner.setStyle(TableStyle([
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        return inner

    sig = Table(
        [[sig_box("CHECKED OUT BY"), "", sig_box("RECEIVED BY (CLIENT)")]],
        colWidths=[(CONTENT_W - 15) / 2, 15, (CONTENT_W - 15) / 2],
    )
    sig.setStyle(sig_cell)
    story.append(sig)
    return story


def main():
    hire = json.load(sys.stdin)
    from io import BytesIO
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=FIRST_TOP, bottomMargin=MARGIN_B + 10)
    doc.build(build_story(hire), onFirstPage=first_page, onLaterPages=later_pages)
    sys.stdout.buffer.write(buf.getvalue())


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Test the script manually**

```bash
echo '{"ref":"LAT-001","title":"Test Shoot","status":"draft","client":{"name":"Nike","contact_name":"Jane","email":"j@n.com","phone":"07700","address":"1 Way\nLondon"},"start_date":"2026-07-10","end_date":"2026-07-14","checked_out_at":null,"items":[{"name":"DJI Inspire 3","serial_number":"SN1","category":"Drones","checked_in":false},{"name":"Battery","serial_number":null,"category":"Batteries and Chargers","checked_in":true}]}' | python3 scripts/generate-hire-pdf.py > /tmp/test-hire.pdf
file /tmp/test-hire.pdf
```

Expected: `PDF document, version 1.x`. Open `/tmp/test-hire.pdf` (`open /tmp/test-hire.pdf`) and visually check: black header with logo, red top rule, info block, items table with Out/In columns (second item has ✓ in In), signature boxes, footer.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-hire-pdf.py scripts/pdf-assets
git commit -m "feat: add branded hire packing slip PDF generator"
```

---

### Task 7: PDF API route

**Files:**
- Create: `app/api/hires/[id]/pdf/route.ts`

**Interfaces:**
- Consumes: `getHire` from `lib/db/hires.ts`; `scripts/generate-hire-pdf.py` stdin/stdout contract (Task 6).
- Produces: `GET /api/hires/[id]/pdf` → streamed PDF download named `<ref>-packing-slip.pdf`.

**IMPORTANT deployment caveat:** Vercel's Node serverless runtime has no Python. This route works in local dev and on any Node host with `python3` + reportlab. Flag this in the task report — the user may need `pip install reportlab` in the deploy environment or a follow-up serverless-python approach. Do not silently skip the task.

- [ ] **Step 1: Create `app/api/hires/[id]/pdf/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getHire } from '@/lib/db/hires'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const hire = await getHire(id)
  if (!hire) return NextResponse.json({ message: 'Hire not found' }, { status: 404 })

  const checkedOutAt = hire.hire_items?.find((hi) => hi.checked_out_at)?.checked_out_at ?? null

  const payload = {
    ref: hire.ref,
    title: hire.title,
    status: hire.status,
    client: hire.client
      ? {
          name: hire.client.name,
          contact_name: hire.client.contact_name,
          email: hire.client.email,
          phone: hire.client.phone,
          address: hire.client.address,
        }
      : null,
    start_date: hire.start_date,
    end_date: hire.end_date,
    checked_out_at: checkedOutAt,
    items: (hire.hire_items ?? []).map((hi) => ({
      name: hi.item?.name ?? 'Unknown item',
      serial_number: hi.item?.serial_number ?? null,
      category: hi.item?.category ?? null,
      checked_in: hi.checked_in_at != null,
    })),
  }

  const script = path.join(process.cwd(), 'scripts', 'generate-hire-pdf.py')

  const pdf = await new Promise<Buffer>((resolve, reject) => {
    const proc = spawn('python3', [script])
    const chunks: Buffer[] = []
    const errChunks: Buffer[] = []
    proc.stdout.on('data', (c) => chunks.push(c))
    proc.stderr.on('data', (c) => errChunks.push(c))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new Error(Buffer.concat(errChunks).toString() || `exit ${code}`))
    })
    proc.stdin.write(JSON.stringify(payload))
    proc.stdin.end()
  }).catch((e: Error) => e)

  if (pdf instanceof Error) {
    return NextResponse.json({ message: `PDF generation failed: ${pdf.message}` }, { status: 500 })
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${hire.ref}-packing-slip.pdf"`,
    },
  })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Smoke-test in dev (requires migration applied and a hire in the DB)**

If a hire exists: `npm run dev`, then `curl -sI http://localhost:3000/api/hires/<id>/pdf` while authenticated is awkward — instead verify via the browser once UI pages exist (Task 8). For now, compilation + Task 6's manual script test are sufficient. Note this in the task report.

- [ ] **Step 4: Commit**

```bash
git add "app/api/hires/[id]/pdf"
git commit -m "feat: add hire PDF API route"
```

---

### Task 8: Navigation

**Files:**
- Modify: `components/nav.tsx:40-43`
- Modify: `components/mobile-nav.tsx`

**Interfaces:**
- Produces: `/hires` reachable from desktop nav and mobile tab bar.

- [ ] **Step 1: Add Hires to the desktop nav**

In `components/nav.tsx`, between the Kits and Carnet links:

```tsx
<Link href="/equipment" className={linkClass('/equipment')}>Equipment</Link>
<Link href="/kits" className={linkClass('/kits')}>Kits</Link>
<Link href="/hires" className={linkClass('/hires')}>Hires</Link>
<Link href="/carnet" className={linkClass('/carnet')}>Carnet</Link>
<Link href="/settings" className={linkClass('/settings')}>Settings</Link>
```

- [ ] **Step 2: Add Hires tab to the mobile nav**

In `components/mobile-nav.tsx`, add an icon component after `KitsIcon` (clipboard-check, matches the existing 24×24 stroke style):

```tsx
function HiresIcon({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#888888'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}
```

Update the tabs array:

```tsx
const tabs = [
  { href: '/equipment', label: 'Equipment', Icon: EquipmentIcon },
  { href: '/kits', label: 'Kits', Icon: KitsIcon },
  { href: '/hires', label: 'Hires', Icon: HiresIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
]
```

- [ ] **Step 3: Verify visually**

Run `npm run dev`, load `/equipment` — desktop nav shows Equipment · Kits · Hires · Carnet · Settings; narrow the window below 1024px — bottom bar shows four tabs. `/hires` will 404 until Task 9; that's expected.

- [ ] **Step 4: Commit**

```bash
git add components/nav.tsx components/mobile-nav.tsx
git commit -m "feat: add Hires to desktop and mobile navigation"
```

---

### Task 9: Hire list and create pages

**Files:**
- Create: `app/hires/page.tsx`
- Create: `app/hires/_components/hire-card.tsx`
- Create: `app/hires/new/page.tsx`
- Create: `app/hires/new/_components/new-hire-form.tsx`

**Interfaces:**
- Consumes: `getHires` (Task 3), `getClients` (Task 2), `POST /api/hires` (Task 5).
- Produces: `/hires` (grouped list) and `/hires/new` (create form → redirects to `/hires/[id]`).

- [ ] **Step 1: Create `app/hires/_components/hire-card.tsx`**

```tsx
import Link from 'next/link'
import type { Hire } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  draft: 'text-brand-mid-grey bg-white/5 border-brand-rule-grey',
  active: 'text-brand-red bg-brand-red/10 border-brand-red/30',
  returned: 'text-brand-mid-grey/60 bg-transparent border-brand-rule-grey',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function HireCard({ hire }: { hire: Hire }) {
  const itemCount = hire.hire_items?.length ?? 0
  const dates = [formatDate(hire.start_date), formatDate(hire.end_date)].filter(Boolean).join(' – ')
  return (
    <Link
      href={`/hires/${hire.id}`}
      className="block border border-brand-rule-grey rounded-lg p-4 hover:border-white transition-colors bg-brand-dark-surface"
    >
      <div className="flex items-start justify-between mb-1">
        <h2 className="font-medium text-white">{hire.title}</h2>
        <span className={`text-xs border rounded-full px-2 py-0.5 ml-3 flex-shrink-0 capitalize ${STATUS_STYLES[hire.status]}`}>
          {hire.status}
        </span>
      </div>
      <p className="text-sm text-brand-mid-grey">
        {hire.ref}{hire.client ? ` · ${hire.client.name}` : ''}
      </p>
      <p className="text-xs text-brand-mid-grey/60 mt-2">
        {dates ? `${dates} · ` : ''}{itemCount} {itemCount === 1 ? 'item' : 'items'}
      </p>
    </Link>
  )
}
```

- [ ] **Step 2: Create `app/hires/page.tsx`**

```tsx
import Link from 'next/link'
import { getHires } from '@/lib/db/hires'
import { HireCard } from './_components/hire-card'
import type { Hire, HireStatus } from '@/lib/types'

const GROUP_ORDER: { status: HireStatus; label: string }[] = [
  { status: 'active', label: 'Active' },
  { status: 'draft', label: 'Draft' },
  { status: 'returned', label: 'Returned' },
]

export default async function HiresPage() {
  const hires = await getHires()
  const groups = GROUP_ORDER.map(({ status, label }) => ({
    label,
    hires: hires.filter((h: Hire) => h.status === status),
  })).filter((g) => g.hires.length > 0)

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-white">Hires</h1>
        <div className="flex gap-3">
          <Link
            href="/hires/clients"
            className="text-white text-sm border border-brand-rule-grey hover:border-white rounded px-4 py-2.5 text-center transition-colors lg:py-2"
          >
            Clients
          </Link>
          <Link
            href="/hires/new"
            className="bg-brand-red text-white text-sm font-medium px-4 py-2.5 rounded hover:opacity-90 text-center lg:py-2"
          >
            New hire
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">
          No hires yet. Create one with the New hire button above.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">
                {group.label}
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.hires.map((hire) => (
                  <HireCard key={hire.id} hire={hire} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/hires/new/_components/new-hire-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/types'

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
const labelClass = 'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

export function NewHireForm({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/hires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        client_id: clientId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        notes: notes || undefined,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(false)
      return
    }
    const hire = await res.json()
    router.push(`/hires/${hire.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className={labelClass}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus className={inputClass} placeholder="e.g. Nike Shoot – July 2026" />
      </div>
      <div>
        <label className={labelClass}>Client</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className={inputClass}>
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-xs text-brand-mid-grey mt-1.5">
          Client not listed? <a href="/hires/clients/new" className="text-white hover:underline">Add a client</a> first.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </div>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <button type="submit" disabled={loading} className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50">
        {loading ? 'Creating…' : 'Create hire'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Create `app/hires/new/page.tsx`**

```tsx
import Link from 'next/link'
import { getClients } from '@/lib/db/clients'
import { NewHireForm } from './_components/new-hire-form'

export default async function NewHirePage() {
  const clients = await getClients()
  return (
    <div>
      <div className="mb-6">
        <Link href="/hires" className="text-sm text-brand-mid-grey hover:text-white">← Hires</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">New hire</h1>
      <NewHireForm clients={clients} />
    </div>
  )
}
```

- [ ] **Step 5: Verify in dev**

`npm run dev`, visit `/hires` — empty state shows. Visit `/hires/new` — form renders; the client dropdown is empty until Task 11 adds client pages, so create the first client via SQL or leave full flow verification until Task 11. Compile check: `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add app/hires
git commit -m "feat: add hire list and create pages"
```

---

### Task 10: Hire detail and edit pages

**Files:**
- Create: `app/hires/[id]/page.tsx`
- Create: `app/hires/[id]/_components/hire-actions.tsx`
- Create: `app/hires/[id]/_components/hire-items-list.tsx`
- Create: `app/hires/[id]/_components/add-items-panel.tsx`
- Create: `app/hires/[id]/edit/page.tsx`
- Create: `app/hires/[id]/edit/_components/edit-hire-form.tsx`

**Interfaces:**
- Consumes: `getHire` (Task 3), `getItems`, `getKits` (existing), and all Task 5 API routes.
- Produces: the hire workflow hub described in the spec's "Hire detail" section.

- [ ] **Step 1: Create `app/hires/[id]/_components/hire-actions.tsx`**

Checkout / return-all / PDF buttons (client component):

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HireStatus } from '@/lib/types'

type Props = { hireId: string; status: HireStatus; itemCount: number }

export function HireActions({ hireId, status, itemCount }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function post(path: string, action: string) {
    setLoading(action)
    setError(null)
    const res = await fetch(path, { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(null)
      return
    }
    router.refresh()
    setLoading(null)
  }

  const primaryBtn = 'bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50'
  const secondaryBtn = 'text-white text-sm border border-brand-rule-grey hover:border-white rounded px-4 py-2 transition-colors'

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <a href={`/api/hires/${hireId}/pdf`} className={secondaryBtn}>
          {status === 'draft' ? 'Preview PDF' : 'Download PDF'}
        </a>
        {status === 'draft' && (
          <button
            onClick={() => post(`/api/hires/${hireId}/checkout`, 'checkout')}
            disabled={loading !== null || itemCount === 0}
            className={primaryBtn}
            title={itemCount === 0 ? 'Add items before checking out' : undefined}
          >
            {loading === 'checkout' ? 'Checking out…' : 'Check out →'}
          </button>
        )}
        {status === 'active' && (
          <button
            onClick={() => post(`/api/hires/${hireId}/checkin`, 'return')}
            disabled={loading !== null}
            className={primaryBtn}
          >
            {loading === 'return' ? 'Returning…' : 'Return all'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-brand-red mt-2">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/hires/[id]/_components/hire-items-list.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HireItem, HireStatus } from '@/lib/types'

type Props = { hireId: string; hireItems: HireItem[]; status: HireStatus }

function formatDateTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function HireItemsList({ hireId, hireItems, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function call(path: string, method: string, itemId: string) {
    setBusy(itemId)
    setError(null)
    const res = await fetch(path, { method })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
    }
    router.refresh()
    setBusy(null)
  }

  if (hireItems.length === 0) {
    return (
      <p className="text-sm text-brand-mid-grey">
        No items on this hire yet. Add items or a kit below.
      </p>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-brand-rule-grey border border-brand-rule-grey rounded-lg bg-brand-dark-surface">
        {hireItems.map((hi) => (
          <li key={hi.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{hi.item?.name ?? 'Unknown item'}</p>
              <p className="text-xs text-brand-mid-grey truncate">
                {[hi.item?.serial_number, hi.item?.category].filter(Boolean).join(' · ') || '—'}
              </p>
              {status !== 'draft' && (
                <p className="text-xs text-brand-mid-grey/60 mt-0.5">
                  {hi.checked_in_at
                    ? `Returned ${formatDateTime(hi.checked_in_at)}`
                    : hi.checked_out_at
                      ? `Out since ${formatDateTime(hi.checked_out_at)}`
                      : ''}
                </p>
              )}
            </div>
            {status === 'draft' && (
              <button
                onClick={() => call(`/api/hires/${hireId}/items/${hi.item_id}`, 'DELETE', hi.item_id)}
                disabled={busy !== null}
                className="text-xs text-brand-mid-grey hover:text-brand-red transition-colors flex-shrink-0 disabled:opacity-50"
              >
                Remove
              </button>
            )}
            {status === 'active' && !hi.checked_in_at && (
              <button
                onClick={() => call(`/api/hires/${hireId}/items/${hi.item_id}/checkin`, 'POST', hi.item_id)}
                disabled={busy !== null}
                className="text-xs text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                {busy === hi.item_id ? 'Checking in…' : 'Check in'}
              </button>
            )}
            {status === 'active' && hi.checked_in_at && (
              <span className="text-xs text-brand-mid-grey flex-shrink-0">Returned</span>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-brand-red mt-2">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/hires/[id]/_components/add-items-panel.tsx`**

Search + add individual items or whole kits (draft only):

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Item, Kit } from '@/lib/types'

type Props = {
  hireId: string
  items: Item[]         // all non-deleted items
  kits: Kit[]           // all kits
  existingItemIds: string[]
}

export function AddItemsPanel({ hireId, items, kits, existingItemIds }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = useMemo(() => new Set(existingItemIds), [existingItemIds])

  const q = search.trim().toLowerCase()
  const matchedItems = q
    ? items.filter(
        (i) =>
          !existing.has(i.id) &&
          (i.name.toLowerCase().includes(q) || i.serial_number?.toLowerCase().includes(q))
      ).slice(0, 10)
    : []
  const matchedKits = q
    ? kits.filter((k) => k.name.toLowerCase().includes(q)).slice(0, 5)
    : []

  async function add(itemIds: string[]) {
    if (itemIds.length === 0) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/hires/${hireId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
    } else {
      setSearch('')
    }
    router.refresh()
    setBusy(false)
  }

  function addKit(kitId: string) {
    const kitItemIds = items.filter((i) => i.kit_id === kitId && !existing.has(i.id)).map((i) => i.id)
    if (kitItemIds.length === 0) {
      setError('All items in this kit are already on the hire (or the kit is empty)')
      return
    }
    add(kitItemIds)
  }

  const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items or kits to add…"
        className={inputClass}
      />
      {error && <p className="text-sm text-brand-red mt-2">{error}</p>}
      {q && (matchedKits.length > 0 || matchedItems.length > 0) && (
        <ul className="mt-2 divide-y divide-brand-rule-grey border border-brand-rule-grey rounded-lg bg-brand-dark-surface">
          {matchedKits.map((kit) => (
            <li key={kit.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{kit.name}</p>
                <p className="text-xs text-brand-mid-grey">Kit — adds all items</p>
              </div>
              <button
                onClick={() => addKit(kit.id)}
                disabled={busy}
                className="text-xs text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                Add kit
              </button>
            </li>
          ))}
          {matchedItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{item.name}</p>
                <p className="text-xs text-brand-mid-grey truncate">
                  {[item.serial_number, item.category].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <button
                onClick={() => add([item.id])}
                disabled={busy}
                className="text-xs text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && matchedKits.length === 0 && matchedItems.length === 0 && (
        <p className="text-sm text-brand-mid-grey mt-2">No matching items or kits.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `app/hires/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getHire } from '@/lib/db/hires'
import { getItems } from '@/lib/db/items'
import { getKits } from '@/lib/db/kits'
import { HireActions } from './_components/hire-actions'
import { HireItemsList } from './_components/hire-items-list'
import { AddItemsPanel } from './_components/add-items-panel'

type Props = { params: Promise<{ id: string }> }

const STATUS_STYLES: Record<string, string> = {
  draft: 'text-brand-mid-grey bg-white/5 border-brand-rule-grey',
  active: 'text-brand-red bg-brand-red/10 border-brand-red/30',
  returned: 'text-brand-mid-grey/60 bg-transparent border-brand-rule-grey',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function HireDetailPage({ params }: Props) {
  const { id } = await params
  const hire = await getHire(id)
  if (!hire) return notFound()

  const isDraft = hire.status === 'draft'
  const hireItems = hire.hire_items ?? []

  const [items, kits] = isDraft
    ? await Promise.all([getItems(), getKits()])
    : [[], []]

  const dates = [formatDate(hire.start_date), formatDate(hire.end_date)].filter(Boolean).join(' – ')
  const labelClass = 'text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-0.5'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/hires" className="text-sm text-brand-mid-grey hover:text-white">← Hires</Link>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">{hire.title}</h1>
        {isDraft && (
          <Link
            href={`/hires/${hire.id}/edit`}
            className="text-sm text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 ml-4"
          >
            Edit
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 mb-8">
        <span className="text-sm text-brand-mid-grey">{hire.ref}</span>
        <span className={`text-xs border rounded-full px-2 py-0.5 capitalize ${STATUS_STYLES[hire.status]}`}>
          {hire.status}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
        <div>
          <dt className={labelClass}>Client</dt>
          <dd className="text-sm font-medium text-white">
            {hire.client ? (
              <Link href={`/hires/clients/${hire.client.id}`} className="hover:underline">
                {hire.client.name}
              </Link>
            ) : '—'}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Dates</dt>
          <dd className="text-sm font-medium text-white">{dates || '—'}</dd>
        </div>
        {hire.client?.contact_name && (
          <div>
            <dt className={labelClass}>Contact</dt>
            <dd className="text-sm font-medium text-white">{hire.client.contact_name}</dd>
          </div>
        )}
        {hire.notes && (
          <div className="col-span-2">
            <dt className={labelClass}>Notes</dt>
            <dd className="text-sm text-white whitespace-pre-wrap">{hire.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mb-8">
        <HireActions hireId={hire.id} status={hire.status} itemCount={hireItems.length} />
      </div>

      <div className="mb-8">
        <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">
          Items ({hireItems.length})
        </p>
        <HireItemsList hireId={hire.id} hireItems={hireItems} status={hire.status} />
      </div>

      {isDraft && (
        <div className="mb-8">
          <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">
            Add items
          </p>
          <AddItemsPanel
            hireId={hire.id}
            items={items}
            kits={kits}
            existingItemIds={hireItems.map((hi) => hi.item_id)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create the edit page**

Create `app/hires/[id]/edit/_components/edit-hire-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, Hire } from '@/lib/types'

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
const labelClass = 'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

export function EditHireForm({ hire, clients }: { hire: Hire; clients: Client[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(hire.title)
  const [clientId, setClientId] = useState(hire.client_id)
  const [startDate, setStartDate] = useState(hire.start_date ?? '')
  const [endDate, setEndDate] = useState(hire.end_date ?? '')
  const [notes, setNotes] = useState(hire.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/hires/${hire.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        client_id: clientId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        notes: notes || null,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(false)
      return
    }
    router.push(`/hires/${hire.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className={labelClass}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Client</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className={inputClass}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </div>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <button type="submit" disabled={loading} className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50">
        {loading ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
```

Create `app/hires/[id]/edit/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getHire } from '@/lib/db/hires'
import { getClients } from '@/lib/db/clients'
import { EditHireForm } from './_components/edit-hire-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditHirePage({ params }: Props) {
  const { id } = await params
  const [hire, clients] = await Promise.all([getHire(id), getClients()])
  if (!hire) return notFound()
  if (hire.status !== 'draft') redirect(`/hires/${id}`)

  return (
    <div>
      <div className="mb-6">
        <Link href={`/hires/${id}`} className="text-sm text-brand-mid-grey hover:text-white">← {hire.ref}</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Edit hire</h1>
      <EditHireForm hire={hire} clients={clients} />
    </div>
  )
}
```

- [ ] **Step 6: Verify the full draft flow in dev**

Requires a client row (insert one via SQL if Task 11 isn't done yet). In dev: create a hire, add an item and a kit, remove an item, preview PDF, check out, check in one item, return all. Verify the status pill and locked item list at each stage. Run `npx tsc --noEmit`.

- [ ] **Step 7: Commit**

```bash
git add "app/hires/[id]"
git commit -m "feat: add hire detail and edit pages with full lifecycle"
```

---

### Task 11: Client pages

**Files:**
- Create: `app/hires/clients/page.tsx`
- Create: `app/hires/clients/new/page.tsx`
- Create: `app/hires/clients/_components/client-form.tsx` (shared by new + edit)
- Create: `app/hires/clients/[id]/page.tsx`
- Create: `app/hires/clients/[id]/_components/delete-client-button.tsx`
- Create: `app/hires/clients/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `getClients`, `getClient` (Task 2), `getHiresByClient` (Task 3), client API routes (Task 4), `HireCard` (Task 9).
- Produces: client list / create / detail-with-history / edit pages.

- [ ] **Step 1: Create the shared form `app/hires/clients/_components/client-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/types'

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
const labelClass = 'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter()
  const [name, setName] = useState(client?.name ?? '')
  const [contactName, setContactName] = useState(client?.contact_name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const payload = {
      name,
      contact_name: contactName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      notes: notes || undefined,
    }
    const res = client
      ? await fetch(`/api/clients/${client.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(false)
      return
    }
    const saved = await res.json()
    router.push(`/hires/clients/${saved.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className={labelClass}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={inputClass} placeholder="Company or individual's name" />
      </div>
      <div>
        <label className={labelClass}>Contact name</label>
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="Leave blank for individuals" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Address</label>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </div>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <button type="submit" disabled={loading} className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50">
        {loading ? 'Saving…' : client ? 'Save changes' : 'Add client'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/hires/clients/page.tsx`**

```tsx
import Link from 'next/link'
import { getClients } from '@/lib/db/clients'

export default async function ClientsPage() {
  const clients = await getClients()
  return (
    <div>
      <div className="mb-6">
        <Link href="/hires" className="text-sm text-brand-mid-grey hover:text-white">← Hires</Link>
      </div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-white">Clients</h1>
        <Link
          href="/hires/clients/new"
          className="bg-brand-red text-white text-sm font-medium px-4 py-2.5 rounded hover:opacity-90 text-center lg:py-2"
        >
          Add client
        </Link>
      </div>
      {clients.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">
          No clients yet. Add one with the button above.
        </p>
      ) : (
        <ul className="divide-y divide-brand-rule-grey border border-brand-rule-grey rounded-lg bg-brand-dark-surface">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/hires/clients/${client.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{client.name}</p>
                  <p className="text-xs text-brand-mid-grey truncate">
                    {[client.contact_name, client.email].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/hires/clients/new/page.tsx`**

```tsx
import Link from 'next/link'
import { ClientForm } from '../_components/client-form'

export default function NewClientPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/hires/clients" className="text-sm text-brand-mid-grey hover:text-white">← Clients</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Add client</h1>
      <ClientForm />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/hires/clients/[id]/_components/delete-client-button.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(false)
      setConfirming(false)
      return
    }
    router.push('/hires/clients')
    router.refresh()
  }

  return (
    <div>
      {confirming ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand-mid-grey">Delete this client?</span>
          <button onClick={handleDelete} disabled={loading} className="text-sm text-brand-red hover:underline disabled:opacity-50">
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button onClick={() => setConfirming(false)} className="text-sm text-brand-mid-grey hover:text-white">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="text-sm text-brand-mid-grey hover:text-brand-red transition-colors">
          Delete client
        </button>
      )}
      {error && <p className="text-sm text-brand-red mt-2">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Create `app/hires/clients/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getClient } from '@/lib/db/clients'
import { getHiresByClient } from '@/lib/db/hires'
import { HireCard } from '../../_components/hire-card'
import { DeleteClientButton } from './_components/delete-client-button'

type Props = { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const [client, hires] = await Promise.all([getClient(id), getHiresByClient(id)])
  if (!client) return notFound()

  const labelClass = 'text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-0.5'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/hires/clients" className="text-sm text-brand-mid-grey hover:text-white">← Clients</Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">{client.name}</h1>
        <Link
          href={`/hires/clients/${client.id}/edit`}
          className="text-sm text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 ml-4"
        >
          Edit
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
        {client.contact_name && (
          <div>
            <dt className={labelClass}>Contact</dt>
            <dd className="text-sm font-medium text-white">{client.contact_name}</dd>
          </div>
        )}
        {client.email && (
          <div>
            <dt className={labelClass}>Email</dt>
            <dd className="text-sm font-medium text-white">{client.email}</dd>
          </div>
        )}
        {client.phone && (
          <div>
            <dt className={labelClass}>Phone</dt>
            <dd className="text-sm font-medium text-white">{client.phone}</dd>
          </div>
        )}
        {client.address && (
          <div className="col-span-2">
            <dt className={labelClass}>Address</dt>
            <dd className="text-sm text-white whitespace-pre-wrap">{client.address}</dd>
          </div>
        )}
        {client.notes && (
          <div className="col-span-2">
            <dt className={labelClass}>Notes</dt>
            <dd className="text-sm text-white whitespace-pre-wrap">{client.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mb-10">
        <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">
          Hire history ({hires.length})
        </p>
        {hires.length === 0 ? (
          <p className="text-sm text-brand-mid-grey">No hires for this client yet.</p>
        ) : (
          <div className="grid gap-3">
            {hires.map((hire) => (
              <HireCard key={hire.id} hire={hire} />
            ))}
          </div>
        )}
      </div>

      <DeleteClientButton clientId={client.id} />
    </div>
  )
}
```

Note: `HireCard` shows `hire.client.name` — hires fetched by `getHiresByClient` include the client join, so this renders the client's own name in its history list. That's acceptable; do not modify HireCard.

- [ ] **Step 6: Create `app/hires/clients/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getClient } from '@/lib/db/clients'
import { ClientForm } from '../../_components/client-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) return notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/hires/clients/${id}`} className="text-sm text-brand-mid-grey hover:text-white">← {client.name}</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Edit client</h1>
      <ClientForm client={client} />
    </div>
  )
}
```

- [ ] **Step 7: Verify in dev**

Create a client, edit it, view detail. Try deleting a client with a hire — expect the 409 message shown inline. Delete a client without hires — expect redirect to the list. Run `npx tsc --noEmit`.

- [ ] **Step 8: Commit**

```bash
git add app/hires/clients
git commit -m "feat: add client management pages"
```

---

### Task 12: "On hire" display on equipment pages

**Files:**
- Modify: `app/equipment/page.tsx`
- Modify: `app/equipment/_components/item-table-wrapper.tsx`
- Modify: `components/equipment/item-table.tsx`
- Modify: `app/equipment/[id]/page.tsx`

**Interfaces:**
- Consumes: `getActiveHireItemsByItemIds` from `lib/db/hires.ts` (Task 3) — returns `HireItem[]` with `hire?: Hire` joined.
- Produces: "On hire" chip in equipment list; "On hire — <title> · <ref>" line on the item detail page.

- [ ] **Step 1: Fetch active hire items in `app/equipment/page.tsx`**

```tsx
import Link from 'next/link'
import { getItems } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { getActiveHireItemsByItemIds } from '@/lib/db/hires'
import { ItemTableWrapper } from './_components/item-table-wrapper'

type Props = {
  searchParams: Promise<{ search?: string; holder?: string }>
}

export default async function EquipmentPage({ searchParams }: Props) {
  const { search, holder } = await searchParams

  const [items, profiles] = await Promise.all([
    getItems({ search, holderId: holder }),
    getProfiles(),
  ])
  const activeHireItems = await getActiveHireItemsByItemIds(items.map((i) => i.id))
  const onHireItemIds = activeHireItems.map((hi) => hi.item_id)

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-xl font-semibold text-white">Equipment</h1>
        <Link
          href="/equipment/new"
          className="bg-brand-black text-white text-sm font-medium px-4 py-2.5 rounded hover:opacity-80 text-center lg:py-2"
        >
          Add item
        </Link>
      </div>
      <ItemTableWrapper
        items={items}
        profiles={profiles}
        onHireItemIds={onHireItemIds}
        initialSearch={search ?? ''}
        initialHolder={holder ?? ''}
      />
    </div>
  )
}
```

- [ ] **Step 2: Thread `onHireItemIds` through `item-table-wrapper.tsx`**

Add `onHireItemIds: string[]` to the wrapper's `Props` type and pass it straight through to `<ItemTable onHireItemIds={onHireItemIds} ... />`.

- [ ] **Step 3: Render the chip in `components/equipment/item-table.tsx`**

Add to `Props`:

```tsx
onHireItemIds: string[]
```

Inside the component, before the return:

```tsx
const onHire = new Set(onHireItemIds)
```

Where each item's name renders (both the mobile card and the desktop table row — read the existing file to find both render sites), append after the name element:

```tsx
{onHire.has(item.id) && (
  <span className="text-[10px] text-brand-red bg-brand-red/10 border border-brand-red/30 rounded-full px-1.5 py-0.5 ml-2 align-middle whitespace-nowrap">
    On hire
  </span>
)}
```

Read `components/equipment/item-table.tsx` in full first — it has both mobile card and desktop table layouts below line 60; put the chip next to the item name in each.

- [ ] **Step 4: Add the hire line to `app/equipment/[id]/page.tsx`**

Add import and fetch:

```tsx
import { getActiveHireItemsByItemIds } from '@/lib/db/hires'
```

After the existing data fetch (`item` is confirmed non-null):

```tsx
const [activeHireItem] = await getActiveHireItemsByItemIds([item.id])
```

Render directly below the h1/edit-button row (before the current-holder section):

```tsx
{activeHireItem?.hire && (
  <p className="text-sm mb-4">
    <span className="text-brand-red font-medium">On hire</span>
    <span className="text-brand-mid-grey"> — </span>
    <Link href={`/hires/${activeHireItem.hire_id}`} className="text-white hover:underline">
      {activeHireItem.hire.title} · {activeHireItem.hire.ref}
    </Link>
  </p>
)}
```

- [ ] **Step 5: Verify in dev**

With an active hire in the DB: equipment list shows the "On hire" chip on that hire's items (mobile and desktop widths); the item detail page shows the "On hire — <title> · <ref>" line linking to the hire. Run `npx jest` and `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add app/equipment components/equipment/item-table.tsx
git commit -m "feat: show on-hire status on equipment list and item detail"
```

---

## Final Verification

- [ ] `npx jest` — full suite passes
- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run build` — production build succeeds
- [ ] Manual end-to-end: add client → new hire → add kit + loose item → preview PDF → check out → verify "On hire" chips → check in one item → return all → download final PDF (checked-in items show ✓ in the In column)
- [ ] Reminder for the user: the migration SQL must be applied to production Supabase, and the deployment environment needs `python3` + `reportlab` for PDF generation (Vercel serverless does not include Python — flag this explicitly in the final report)
