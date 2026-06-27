# Dark Theme, Kit Item Management & Carnet Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dark visual theme, allow loose items to be added to kits and transferred between kits, and provide a carnet export page that generates an `.xlsx` spreadsheet.

**Architecture:** Three independent feature tracks. Dark theme is a token + className sweep across all components. Kit item management adds a DB helper, updates the PATCH API route, and adds UI to the kit detail page and item edit form. Carnet export adds a DB helper, a server-side xlsx route, and a new `/carnet` page.

**Tech Stack:** Next.js 16 App Router, Supabase, Tailwind CSS v4, `xlsx` (SheetJS) for spreadsheet generation.

## Global Constraints

- Tailwind v4: brand tokens defined in `app/globals.css` `@theme inline` block AND `tailwind.config.ts` — both must be updated when adding tokens
- Brand tokens only — no hardcoded Tailwind gray-*/red-*/white-* colour classes
- `'use client'` on all interactive components; Server Components for all data-fetching pages
- Next.js 16: `params` in dynamic routes typed as `Promise<{id: string}>` and awaited
- TypeScript strict mode — run `npx tsc --noEmit` after each task
- `@/` path alias resolves to project root

---

### Task 1: Dark Theme — Tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`

**Interfaces:**
- Produces: new Tailwind classes `bg-brand-dark-surface`, `bg-brand-input`, and updated `border-brand-rule-grey` (now `#333333`)

- [ ] **Step 1: Update `app/globals.css`**

Replace the entire file content:

```css
@font-face {
  font-family: 'Metropolis';
  src: url('/fonts/Metropolis-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Metropolis';
  src: url('/fonts/Metropolis-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Metropolis';
  src: url('/fonts/Metropolis-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Metropolis';
  src: url('/fonts/Metropolis-ExtraLight.ttf') format('truetype');
  font-weight: 200;
  font-style: normal;
  font-display: swap;
}

@import "tailwindcss";

:root {
  --background: #0a0a0a;
  --foreground: #ffffff;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-brand-red: #ED2643;
  --color-brand-black: #000000;
  --color-brand-white: #FFFFFF;
  --color-brand-light-grey: #F2F2F2;
  --color-brand-mid-grey: #888888;
  --color-brand-rule-grey: #333333;
  --color-brand-dark-surface: #1a1a1a;
  --color-brand-input: #111111;
  --font-sans: 'Metropolis', system-ui, sans-serif;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Metropolis', Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 2: Update `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-red':          '#ED2643',
        'brand-black':        '#000000',
        'brand-white':        '#FFFFFF',
        'brand-light-grey':   '#F2F2F2',
        'brand-mid-grey':     '#888888',
        'brand-rule-grey':    '#333333',
        'brand-dark-surface': '#1a1a1a',
        'brand-input':        '#111111',
      },
      fontFamily: {
        sans: ['Metropolis', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/jdownes/Documents/latitude-equipment && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css tailwind.config.ts
git commit -m "feat: dark theme tokens — brand-dark-surface, brand-input, darkened rule-grey"
```

---

### Task 2: Dark Theme — UI Components

**Files:**
- Modify: `components/ui/field.tsx`
- Modify: `components/ui/confirm-dialog.tsx`
- Modify: `components/equipment/item-table.tsx`
- Modify: `components/equipment/assign-control.tsx`
- Modify: `components/kits/kit-card.tsx`
- Modify: `components/kits/kit-assign-control.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/equipment/page.tsx`
- Modify: `app/equipment/new/page.tsx`
- Modify: `app/equipment/[id]/page.tsx`
- Modify: `app/equipment/[id]/edit/_components/edit-item-form.tsx`
- Modify: `app/kits/page.tsx`
- Modify: `app/kits/[id]/page.tsx`
- Modify: `app/kits/new/page.tsx`
- Modify: `app/kits/[id]/edit/_components/edit-kit-form.tsx`
- Modify: `app/kits/[id]/_components/kit-actions.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/settings/_components/settings-form.tsx`

**Dark theme replacement rules (apply to every file below):**
- `text-brand-black` → `text-white` (primary text on dark background)
- `hover:text-brand-black` → `hover:text-white`
- `bg-white` → `bg-brand-dark-surface`
- `bg-brand-light-grey` → `bg-brand-dark-surface`
- `hover:bg-brand-light-grey` → `hover:bg-brand-dark-surface`
- All `inputClass` strings: add `bg-brand-input text-white` before `focus:outline-none`

**Interfaces:**
- Consumes: `bg-brand-dark-surface`, `bg-brand-input` tokens from Task 1

- [ ] **Step 1: Update `components/ui/field.tsx`**

```tsx
type Props = { label: string; required?: boolean; children: React.ReactNode }

export function Field({ label, required, children }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-1">
        {label}{required && <span className="text-brand-red ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Update `components/ui/confirm-dialog.tsx`**

```tsx
'use client'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-brand-black/60 flex items-center justify-center z-50">
      <div className="bg-brand-dark-surface rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 border border-brand-rule-grey">
        <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
        <p className="text-sm text-brand-mid-grey mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="text-sm font-medium text-white border border-brand-rule-grey rounded px-4 py-2 hover:bg-brand-dark-surface"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-sm font-medium text-white bg-brand-red rounded px-4 py-2 hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `components/equipment/item-table.tsx`**

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
  const inputClass = 'border border-brand-rule-grey rounded px-3 py-2 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="search"
          placeholder="Search by name or serial…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} w-72`}
        />
        <select
          value={holderId}
          onChange={(e) => onHolderChange(e.target.value)}
          className={inputClass}
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
        <table className="w-full text-sm border-collapse">
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
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update `components/equipment/assign-control.tsx`**

Read the current file first, then apply: `text-brand-black` → `text-white`, `border-brand-rule-grey` stays, `bg-brand-black` stays for button, add `bg-brand-input text-white` to the `<select>`.

```tsx
'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'

type Props = {
  itemId: string
  currentHolderId: string | null
  kitId: string | null
  profiles: Profile[]
  currentUserId: string
  onAssign: (itemId: string, assignedToId: string | null) => Promise<void>
}

export function AssignControl({ itemId, currentHolderId, kitId, profiles, currentUserId, onAssign }: Props) {
  const [selected, setSelected] = useState(currentHolderId ?? '')
  const [loading, setLoading] = useState(false)

  async function handleAssign() {
    setLoading(true)
    try {
      await onAssign(itemId, selected || null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
        className="border border-brand-rule-grey rounded px-2 py-1 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        {kitId === null && <option value="">Unassigned</option>}
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {selected !== (currentHolderId ?? '') && (
        <button
          onClick={handleAssign}
          disabled={loading}
          className="text-xs bg-brand-black text-white px-2 py-1 rounded hover:opacity-80 disabled:opacity-50 border border-brand-rule-grey"
        >
          {loading ? '…' : 'Save'}
        </button>
      )}
      {currentHolderId !== currentUserId && (
        <button
          onClick={() => { setSelected(currentUserId); }}
          disabled={loading}
          className="text-xs text-brand-mid-grey hover:text-white"
        >
          Take it
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Update `components/kits/kit-card.tsx`**

```tsx
import Link from 'next/link'
import type { Kit } from '@/lib/types'

type Props = { kit: Kit; itemCount: number }

export function KitCard({ kit, itemCount }: Props) {
  return (
    <Link
      href={`/kits/${kit.id}`}
      className="block border border-brand-rule-grey rounded-lg p-4 hover:border-white transition-colors bg-brand-dark-surface"
    >
      <h2 className="font-medium text-white mb-1">{kit.name}</h2>
      {kit.description && (
        <p className="text-sm text-brand-mid-grey mb-3">{kit.description}</p>
      )}
      <div className="flex items-center justify-between text-sm text-brand-mid-grey">
        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        <span>{kit.current_holder?.display_name}</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 6: Update `components/kits/kit-assign-control.tsx`**

Read the current file first. Apply: add `bg-brand-input text-white` to the `<select>`. Button already uses `bg-brand-black text-brand-white` — change `text-brand-white` to `text-white`. Add `try/finally` around `onAssign` to fix the stuck-loading bug from Task 12.

```tsx
'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'

type Props = {
  kitId: string
  currentHolderId: string
  profiles: Profile[]
  currentUserId: string
  onAssign: (kitId: string, assignedToId: string) => Promise<void>
}

export function KitAssignControl({ kitId, currentHolderId, profiles, currentUserId, onAssign }: Props) {
  const [selected, setSelected] = useState(currentHolderId)
  const [loading, setLoading] = useState(false)

  async function handleAssign() {
    setLoading(true)
    try {
      await onAssign(kitId, selected)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
        className="border border-brand-rule-grey rounded px-2 py-1 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {selected !== currentHolderId && (
        <button
          onClick={handleAssign}
          disabled={loading}
          className="text-sm font-medium bg-brand-black text-white px-3 py-2 rounded hover:opacity-80 disabled:opacity-50 border border-brand-rule-grey"
        >
          {loading ? '…' : 'Assign'}
        </button>
      )}
      {currentHolderId !== currentUserId && (
        <button
          onClick={() => setSelected(currentUserId)}
          disabled={loading}
          className="text-sm text-brand-mid-grey hover:text-white"
        >
          Take it
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Update `app/login/page.tsx`**

Changes: `bg-brand-light-grey` → `bg-brand-black`, `bg-white` → `bg-brand-dark-surface`, `text-brand-black` → `text-white`, add `bg-brand-input text-white` to inputs.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/equipment')
      router.refresh()
    }
  }

  const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-black">
      <div className="w-full bg-brand-black border-t-[3px] border-brand-red flex items-center px-8 h-16 fixed top-0 left-0">
        <Image src="/logos/logo_equipment_dark.png" alt="Latitude Equipment" width={123} height={44} priority />
      </div>
      <div className="w-full max-w-sm bg-brand-dark-surface rounded-lg border border-brand-rule-grey p-8 mt-16">
        <h1 className="text-xl font-bold text-white mb-6">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
          </div>
          {error && <p className="text-sm text-brand-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red text-white rounded px-3 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Update remaining page files**

For each of the following files, read it first and apply the dark theme replacement rules:
- `text-brand-black` → `text-white`
- `hover:text-brand-black` → `hover:text-white`
- `bg-brand-light-grey` → `bg-brand-dark-surface`
- `hover:bg-brand-light-grey` → `hover:bg-brand-dark-surface`
- `bg-white` → `bg-brand-dark-surface`
- All `inputClass` constants: add `bg-brand-input text-white` before `focus:outline-none`

Files to update:
- `app/equipment/page.tsx` — heading `text-brand-black` → `text-white`
- `app/equipment/new/page.tsx` — heading, back link, inputClass, cancel link
- `app/equipment/[id]/page.tsx` — heading, all `text-brand-black` labels and values
- `app/equipment/[id]/edit/_components/edit-item-form.tsx` — inputClass, cancel link
- `app/kits/page.tsx` — heading
- `app/kits/[id]/page.tsx` — heading, table links, section headings
- `app/kits/new/page.tsx` — heading, back link, inputClass, cancel link
- `app/kits/[id]/edit/_components/edit-kit-form.tsx` — heading, inputClass, cancel link
- `app/kits/[id]/_components/kit-actions.tsx` — button border/hover classes
- `app/settings/page.tsx` — heading
- `app/settings/_components/settings-form.tsx` — section headings, inputClass, btnClass stays (already dark)

- [ ] **Step 9: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: dark theme — UI component sweep"
```

---

### Task 3: Kit Item Management — DB & API

**Files:**
- Modify: `lib/db/items.ts` — add `getLooseItems()`
- Modify: `app/api/items/[id]/route.ts` — handle `kit_id` in PATCH with auto-assign holder
- Test: `__tests__/lib/db/items.test.ts`

**Interfaces:**
- Produces: `getLooseItems(): Promise<Item[]>` — items where `kit_id IS NULL` and `deleted_at IS NULL`, ordered by name
- Produces: PATCH `/api/items/[id]` now accepts `kit_id` (string | null); when `kit_id` is a non-null string, fetches kit, sets item `current_holder_id` to kit's `current_holder_id`, and writes assignment history

**Consumes:**
- `assignItem(itemId, holderId, userId, note)` from `@/lib/db/assignments`
- `getKit(kitId)` from `@/lib/db/kits`

- [ ] **Step 1: Write failing test for `getLooseItems`**

Add to `__tests__/lib/db/items.test.ts`:

```typescript
describe('getLooseItems', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns only items with null kit_id', async () => {
    const fakeItems = [{ id: '1', name: 'Drone', kit_id: null, deleted_at: null }]
    mockSelect.mockReturnValue({
      is: jest.fn((col: string) => {
        if (col === 'kit_id') return {
          is: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: fakeItems, error: null }),
          }),
        }
        return { is: jest.fn().mockReturnValue({ order: jest.fn().mockResolvedValue({ data: fakeItems, error: null }) }) }
      }),
    })
    // Simpler mock — the function chains .is('deleted_at', null).is('kit_id', null).order('name')
    mockSelect.mockReturnValue({
      is: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: fakeItems, error: null }),
        }),
      }),
    })
    const { getLooseItems } = await import('@/lib/db/items')
    const result = await getLooseItems()
    expect(result).toEqual(fakeItems)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest __tests__/lib/db/items.test.ts --testNamePattern="getLooseItems" 2>&1 | tail -10
```

Expected: FAIL — `getLooseItems` not exported.

- [ ] **Step 3: Add `getLooseItems` to `lib/db/items.ts`**

Add after `getItem`:

```typescript
export async function getLooseItems(): Promise<Item[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .is('deleted_at', null)
    .is('kit_id', null)
    .order('name')
  if (error) throw new Error(error.message)
  return data as Item[]
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest __tests__/lib/db/items.test.ts 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 5: Update `app/api/items/[id]/route.ts`**

The PATCH handler must now:
1. Accept `kit_id` in the request body (string or `null`)
2. When `kit_id` changes to a non-null value: fetch the kit, call `assignItem` to set holder to match kit's holder
3. When `kit_id` is `null`: update `kit_id` only, no holder change

```typescript
import { createClient } from '@/lib/supabase/server'
import { updateItem } from '@/lib/db/items'
import { getKit } from '@/lib/db/kits'
import { assignItem } from '@/lib/db/assignments'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  try {
    // Handle kit assignment: when kit_id is provided and non-null, sync holder
    if (body.kit_id !== undefined) {
      if (body.kit_id) {
        const kit = await getKit(body.kit_id)
        if (!kit) return NextResponse.json({ message: 'Kit not found' }, { status: 404 })
        // Update kit_id first, then assign item to kit's holder
        await updateItem(id, { kit_id: body.kit_id })
        await assignItem(id, kit.current_holder_id, user.id, `Added to kit: ${kit.name}`)
      } else {
        // Removing from kit — just clear kit_id, leave holder unchanged
        await updateItem(id, { kit_id: null })
      }
      // Re-fetch and return updated item
      const { getItem } = await import('@/lib/db/items')
      const updated = await getItem(id)
      return NextResponse.json(updated)
    }

    // Standard field update (no kit_id change)
    const item = await updateItem(id, {
      name: body.name,
      serial_number: body.serial_number || undefined,
      category: body.category || undefined,
      notes: body.notes || undefined,
      value: body.value ? parseFloat(body.value) : undefined,
      country_of_origin: body.country_of_origin || undefined,
      weight_kg: body.weight_kg ? parseFloat(body.weight_kg) : undefined,
    })
    return NextResponse.json(item)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/db/items.ts app/api/items/\[id\]/route.ts __tests__/lib/db/items.test.ts
git commit -m "feat: add getLooseItems helper; PATCH /api/items/[id] syncs holder when kit_id changes"
```

---

### Task 4: Kit Item Management — UI

**Files:**
- Create: `app/kits/[id]/_components/add-item-control.tsx`
- Modify: `app/kits/[id]/page.tsx`
- Modify: `app/equipment/[id]/edit/page.tsx`
- Modify: `app/equipment/[id]/edit/_components/edit-item-form.tsx`

**Interfaces:**
- Consumes: `getLooseItems()` from `@/lib/db/items`, `getKits()` from `@/lib/db/kits`
- `AddItemControl` props: `{ kitId: string; looseItems: Item[]; onAdd: (itemId: string) => Promise<void> }`
- `EditItemForm` gains prop `kits: Kit[]`

- [ ] **Step 1: Create `app/kits/[id]/_components/add-item-control.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { Item } from '@/lib/types'

type Props = {
  kitId: string
  looseItems: Item[]
  onAdd: (itemId: string) => Promise<void>
}

export function AddItemControl({ looseItems, onAdd }: Props) {
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)

  if (looseItems.length === 0) return null

  async function handleAdd() {
    if (!selected) return
    setLoading(true)
    try {
      await onAdd(selected)
      setSelected('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
        className="border border-brand-rule-grey rounded px-2 py-1.5 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red flex-1 max-w-xs"
      >
        <option value="">Select a loose item…</option>
        {looseItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}{item.serial_number ? ` (${item.serial_number})` : ''}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={loading || !selected}
        className="text-sm font-medium bg-brand-black text-white px-3 py-1.5 rounded border border-brand-rule-grey hover:opacity-80 disabled:opacity-40"
      >
        {loading ? 'Adding…' : 'Add to kit'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update `app/kits/[id]/page.tsx`**

Add `getLooseItems` import and fetch, `handleAddItem` server action, and `AddItemControl` in the UI above the items table:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getKit } from '@/lib/db/kits'
import { getItems, getLooseItems } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { assignKit, assignItem } from '@/lib/db/assignments'
import { createClient } from '@/lib/supabase/server'
import { KitAssignControl } from '@/components/kits/kit-assign-control'
import { AssignControl } from '@/components/equipment/assign-control'
import { KitActions } from './_components/kit-actions'
import { AddItemControl } from './_components/add-item-control'

type Props = { params: Promise<{ id: string }> }

export default async function KitDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [kit, allItems, profiles, looseItems] = await Promise.all([
    getKit(id),
    getItems(),
    getProfiles(),
    getLooseItems(),
  ])

  if (!kit) return notFound()
  const kitItems = allItems.filter((item) => item.kit_id === kit.id)

  async function handleAssignKit(kitId: string, assignedToId: string) {
    'use server'
    await assignKit(kitId, assignedToId, user!.id)
    revalidatePath(`/kits/${kitId}`)
    revalidatePath('/kits')
    revalidatePath('/equipment')
  }

  async function handleAssignItem(itemId: string, assignedToId: string | null) {
    'use server'
    await assignItem(itemId, assignedToId, user!.id)
    revalidatePath(`/kits/${id}`)
    revalidatePath('/equipment')
  }

  async function handleAddItem(itemId: string) {
    'use server'
    await assignItem(itemId, kit!.current_holder_id, user!.id, `Added to kit: ${kit!.name}`)
    // Update kit_id on the item via direct DB update
    const { createClient: makeClient } = await import('@/lib/supabase/server')
    const db = await makeClient()
    await db.from('items').update({ kit_id: kit!.id }).eq('id', itemId)
    revalidatePath(`/kits/${id}`)
    revalidatePath('/equipment')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/kits" className="text-sm text-brand-mid-grey hover:text-white">
          ← Kits
        </Link>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-xl font-semibold text-white">{kit.name}</h1>
        <Link
          href={`/kits/${kit.id}/edit`}
          className="text-sm text-brand-mid-grey border border-brand-rule-grey rounded px-3 py-1.5 hover:text-white"
        >
          Edit
        </Link>
      </div>

      {kit.description && (
        <p className="text-sm text-brand-mid-grey mb-6">{kit.description}</p>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-medium text-white mb-2">Kit holder</h2>
        <KitAssignControl
          kitId={kit.id}
          currentHolderId={kit.current_holder_id}
          profiles={profiles}
          currentUserId={user.id}
          onAssign={handleAssignKit}
        />
        <p className="text-xs text-brand-mid-grey mt-1">
          Assigning the kit reassigns all items within it.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-white mb-3">
          Items ({kitItems.length})
        </h2>

        {looseItems.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-brand-mid-grey mb-2">Add a loose item to this kit:</p>
            <AddItemControl kitId={kit.id} looseItems={looseItems} onAdd={handleAddItem} />
          </div>
        )}

        {kitItems.length === 0 ? (
          <p className="text-sm text-brand-mid-grey">No items in this kit.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-rule-grey text-left text-brand-mid-grey">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Serial</th>
                <th className="pb-2 font-medium">Holder</th>
              </tr>
            </thead>
            <tbody>
              {kitItems.map((item) => (
                <tr key={item.id} className="border-b border-brand-rule-grey">
                  <td className="py-2.5 pr-4">
                    <Link href={`/equipment/${item.id}`} className="font-medium text-white hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-brand-mid-grey">{item.serial_number ?? '—'}</td>
                  <td className="py-2.5">
                    <AssignControl
                      itemId={item.id}
                      currentHolderId={item.current_holder_id}
                      kitId={item.kit_id}
                      profiles={profiles}
                      currentUserId={user.id}
                      onAssign={handleAssignItem}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8">
        <KitActions kitId={kit.id} />
      </div>
    </div>
  )
}
```

Note: The `handleAddItem` server action above calls `assignItem` first (sets holder + writes history), then directly updates `kit_id`. This is correct because `assignItem` only sets `current_holder_id` — we also need `kit_id` updated separately. The `updateItem` helper from `lib/db/items` would also work but importing in a server action requires the dynamic import pattern shown above, OR you can move the update into a new `lib/db/items` helper function `addItemToKit(itemId, kitId)` that does both. Either approach is acceptable — the above is self-contained.

- [ ] **Step 3: Update `app/equipment/[id]/edit/page.tsx`**

Read the current file and add `getKits()` to the parallel fetch, then pass `kits` to `EditItemForm`:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getItem } from '@/lib/db/items'
import { getKits } from '@/lib/db/kits'
import { createClient } from '@/lib/supabase/server'
import { EditItemForm } from './_components/edit-item-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditItemPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [item, kits] = await Promise.all([getItem(id), getKits()])
  if (!item) return notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href={`/equipment/${id}`} className="text-sm text-brand-mid-grey hover:text-white">
          ← Back
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-white mb-6">Edit item</h1>
      <EditItemForm item={item} kits={kits} />
    </div>
  )
}
```

- [ ] **Step 4: Update `app/equipment/[id]/edit/_components/edit-item-form.tsx`**

Add `kits` prop and Kit field that PATCHes `kit_id`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Field } from '@/components/ui/field'
import type { Item, Kit } from '@/lib/types'

type Props = { item: Item; kits: Kit[] }

export function EditItemForm({ item, kits }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const raw = Object.fromEntries(new FormData(form))

    // kit_id is handled separately because it triggers holder sync
    const kitId = raw.kit_id as string | undefined
    const hasKitChange = kitId !== undefined && kitId !== (item.kit_id ?? '')

    if (hasKitChange) {
      const kitRes = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kit_id: kitId || null }),
      })
      if (!kitRes.ok) {
        const { message } = await kitRes.json()
        setError(message)
        setLoading(false)
        return
      }
    }

    // Update remaining fields
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: raw.name,
        serial_number: raw.serial_number,
        category: raw.category,
        notes: raw.notes,
        value: raw.value,
        country_of_origin: raw.country_of_origin,
        weight_kg: raw.weight_kg,
      }),
    })

    if (res.ok) {
      router.push(`/equipment/${item.id}`)
    } else {
      const { message } = await res.json()
      setError(message)
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border border-brand-rule-grey rounded px-3 py-2 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" required>
        <input name="name" required defaultValue={item.name} className={inputClass} />
      </Field>
      <Field label="Serial number">
        <input name="serial_number" defaultValue={item.serial_number ?? ''} className={inputClass} />
      </Field>
      <Field label="Category">
        <input name="category" defaultValue={item.category ?? ''} placeholder="e.g. Drone, Battery, Lens" className={inputClass} />
      </Field>
      <Field label="Kit">
        <select name="kit_id" defaultValue={item.kit_id ?? ''} className={inputClass}>
          <option value="">None (loose item)</option>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Value (£)">
        <input name="value" type="number" step="0.01" min="0" defaultValue={item.value ?? ''} className={inputClass} />
      </Field>
      <Field label="Country of origin">
        <input name="country_of_origin" defaultValue={item.country_of_origin ?? ''} placeholder="e.g. China" className={inputClass} />
      </Field>
      <Field label="Weight (kg)">
        <input name="weight_kg" type="number" step="0.01" min="0" defaultValue={item.weight_kg ?? ''} className={inputClass} />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={3} defaultValue={item.notes ?? ''} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-black text-white text-sm font-medium px-4 py-2 rounded border border-brand-rule-grey hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href={`/equipment/${item.id}`}
          className="text-sm font-medium text-brand-mid-grey px-4 py-2 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/kits/\[id\]/_components/add-item-control.tsx \
        app/kits/\[id\]/page.tsx \
        "app/equipment/[id]/edit/page.tsx" \
        "app/equipment/[id]/edit/_components/edit-item-form.tsx"
git commit -m "feat: add loose items to kits from kit detail page; kit field on item edit"
```

---

### Task 5: Carnet — DB Helper & Export API

**Files:**
- Modify: `lib/db/items.ts` — add `getItemsByIds`
- Create: `app/api/carnet/export/route.ts`
- Test: `__tests__/lib/db/items.test.ts`

**Interfaces:**
- Produces: `getItemsByIds(ids: string[]): Promise<Item[]>`
- Produces: `POST /api/carnet/export` — body `{ itemIds: string[] }`, returns `.xlsx` file download

- [ ] **Step 1: Install xlsx**

```bash
npm install xlsx
```

- [ ] **Step 2: Write failing test for `getItemsByIds`**

Add to `__tests__/lib/db/items.test.ts`:

```typescript
describe('getItemsByIds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns items matching the given ids', async () => {
    const fakeItems = [{ id: 'abc', name: 'Drone', deleted_at: null }]
    mockSelect.mockReturnValue({
      in: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: fakeItems, error: null }),
        }),
      }),
    })
    const { getItemsByIds } = await import('@/lib/db/items')
    const result = await getItemsByIds(['abc'])
    expect(result).toEqual(fakeItems)
  })

  it('returns empty array for empty ids input', async () => {
    const { getItemsByIds } = await import('@/lib/db/items')
    const result = await getItemsByIds([])
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx jest __tests__/lib/db/items.test.ts --testNamePattern="getItemsByIds" 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 4: Add `getItemsByIds` to `lib/db/items.ts`**

```typescript
export async function getItemsByIds(ids: string[]): Promise<Item[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .in('id', ids)
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  return data as Item[]
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx jest __tests__/lib/db/items.test.ts 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 6: Create `app/api/carnet/export/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getItemsByIds } from '@/lib/db/items'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const itemIds: string[] = body.itemIds ?? []

  if (itemIds.length === 0) {
    return NextResponse.json({ message: 'No items selected' }, { status: 400 })
  }

  try {
    const items = await getItemsByIds(itemIds)

    const rows = items.map((item) => ({
      'Name': item.name,
      'Serial Number': item.serial_number ?? '',
      'Value (£)': item.value ?? '',
      'Country of Origin': item.country_of_origin ?? '',
      'Weight (kg)': item.weight_kg ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Carnet')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="carnet-export.xlsx"',
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/db/items.ts app/api/carnet/export/route.ts __tests__/lib/db/items.test.ts package.json package-lock.json
git commit -m "feat: getItemsByIds helper and carnet xlsx export API"
```

---

### Task 6: Carnet — Page & Nav

**Files:**
- Create: `app/carnet/page.tsx`
- Create: `app/carnet/_components/carnet-selector.tsx`
- Modify: `components/nav.tsx`

**Interfaces:**
- Consumes: `getItems()` from `@/lib/db/items`, `getKits()` from `@/lib/db/kits`
- `CarnetSelector` props: `{ items: Item[]; kits: Kit[] }`

- [ ] **Step 1: Create `app/carnet/page.tsx`**

```tsx
import { getItems } from '@/lib/db/items'
import { getKits } from '@/lib/db/kits'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CarnetSelector } from './_components/carnet-selector'

export default async function CarnetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [items, kits] = await Promise.all([getItems(), getKits()])

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Carnet Export</h1>
        <p className="text-sm text-brand-mid-grey mt-1">
          Select the items you want to include, then export as a spreadsheet.
        </p>
      </div>
      <CarnetSelector items={items} kits={kits} />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/carnet/_components/carnet-selector.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { Item, Kit } from '@/lib/types'

type Props = { items: Item[]; kits: Kit[] }

export function CarnetSelector({ items, kits }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  // Group items: kit groups then loose items
  const itemsByKit = new Map<string, Item[]>()
  const looseItems: Item[] = []

  for (const item of items) {
    if (item.kit_id) {
      const group = itemsByKit.get(item.kit_id) ?? []
      group.push(item)
      itemsByKit.set(item.kit_id, group)
    } else {
      looseItems.push(item)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroup(ids: string[]) {
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  async function handleExport() {
    if (selected.size === 0) return
    setExporting(true)
    try {
      const res = await fetch('/api/carnet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selected) }),
      })
      if (!res.ok) {
        const { message } = await res.json()
        alert(`Export failed: ${message}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'carnet-export.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const inputClass = 'border border-brand-rule-grey rounded px-2 py-1 bg-brand-input text-white text-sm focus:outline-none'

  return (
    <div>
      {/* Sticky export bar */}
      <div className="sticky top-0 z-10 bg-brand-black/80 backdrop-blur border-b border-brand-rule-grey py-3 mb-6 flex items-center justify-between">
        <span className="text-sm text-brand-mid-grey">
          {selected.size === 0 ? 'No items selected' : `${selected.size} item${selected.size === 1 ? '' : 's'} selected`}
        </span>
        <button
          onClick={handleExport}
          disabled={selected.size === 0 || exporting}
          className="text-sm font-medium bg-brand-red text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-40"
        >
          {exporting ? 'Exporting…' : 'Export .xlsx'}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-brand-mid-grey">No equipment added yet.</p>
      )}

      {/* Kit groups */}
      {kits.map((kit) => {
        const kitItems = itemsByKit.get(kit.id) ?? []
        if (kitItems.length === 0) return null
        const kitIds = kitItems.map((i) => i.id)
        const allSelected = kitIds.every((id) => selected.has(id))
        const someSelected = kitIds.some((id) => selected.has(id))

        return (
          <div key={kit.id} className="mb-6">
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-brand-rule-grey">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={() => toggleGroup(kitIds)}
                className="accent-brand-red"
              />
              <span className="text-sm font-medium text-white">{kit.name}</span>
              <span className="text-xs text-brand-mid-grey">— {kit.current_holder?.display_name}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brand-mid-grey text-xs">
                  <th className="pb-1 w-8" />
                  <th className="pb-1 pr-4">Name</th>
                  <th className="pb-1 pr-4">Serial</th>
                  <th className="pb-1 pr-4">Value (£)</th>
                  <th className="pb-1 pr-4">Country</th>
                  <th className="pb-1">Weight (kg)</th>
                </tr>
              </thead>
              <tbody>
                {kitItems.map((item) => (
                  <tr key={item.id} className="border-b border-brand-rule-grey hover:bg-brand-dark-surface">
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="accent-brand-red"
                      />
                    </td>
                    <td className="py-2 pr-4 text-white">{item.name}</td>
                    <td className="py-2 pr-4 text-brand-mid-grey">{item.serial_number ?? '—'}</td>
                    <td className="py-2 pr-4 text-brand-mid-grey">{item.value ?? '—'}</td>
                    <td className="py-2 pr-4 text-brand-mid-grey">{item.country_of_origin ?? '—'}</td>
                    <td className="py-2 text-brand-mid-grey">{item.weight_kg ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {/* Loose items */}
      {looseItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2 pb-2 border-b border-brand-rule-grey">
            <input
              type="checkbox"
              checked={looseItems.every((i) => selected.has(i.id))}
              ref={(el) => {
                if (el) {
                  const some = looseItems.some((i) => selected.has(i.id))
                  const all = looseItems.every((i) => selected.has(i.id))
                  el.indeterminate = some && !all
                }
              }}
              onChange={() => toggleGroup(looseItems.map((i) => i.id))}
              className="accent-brand-red"
            />
            <span className="text-sm font-medium text-white">Loose items</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-mid-grey text-xs">
                <th className="pb-1 w-8" />
                <th className="pb-1 pr-4">Name</th>
                <th className="pb-1 pr-4">Serial</th>
                <th className="pb-1 pr-4">Value (£)</th>
                <th className="pb-1 pr-4">Country</th>
                <th className="pb-1">Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {looseItems.map((item) => (
                <tr key={item.id} className="border-b border-brand-rule-grey hover:bg-brand-dark-surface">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                      className="accent-brand-red"
                    />
                  </td>
                  <td className="py-2 pr-4 text-white">{item.name}</td>
                  <td className="py-2 pr-4 text-brand-mid-grey">{item.serial_number ?? '—'}</td>
                  <td className="py-2 pr-4 text-brand-mid-grey">{item.value ?? '—'}</td>
                  <td className="py-2 pr-4 text-brand-mid-grey">{item.country_of_origin ?? '—'}</td>
                  <td className="py-2 text-brand-mid-grey">{item.weight_kg ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add Carnet link to `components/nav.tsx`**

Add `<Link href="/carnet" className={linkClass('/carnet')}>Carnet</Link>` between the Kits and Settings links:

```tsx
<Link href="/equipment" className={linkClass('/equipment')}>Equipment</Link>
<Link href="/kits" className={linkClass('/kits')}>Kits</Link>
<Link href="/carnet" className={linkClass('/carnet')}>Carnet</Link>
<Link href="/settings" className={linkClass('/settings')}>Settings</Link>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/carnet/page.tsx app/carnet/_components/carnet-selector.tsx components/nav.tsx
git commit -m "feat: carnet export page with item selection and xlsx download"
```

---

## Self-Review Checklist

- [x] Dark theme: tokens defined in both globals.css and tailwind.config.ts
- [x] Dark theme: all `text-brand-black` → `text-white`, all `bg-white`/`bg-brand-light-grey` → `bg-brand-dark-surface`, all inputs get `bg-brand-input text-white`
- [x] Dark theme: login page updated
- [x] `getLooseItems()`: returns items where `kit_id IS NULL AND deleted_at IS NULL`
- [x] PATCH `/api/items/[id]`: when `kit_id` is non-null, fetches kit and calls `assignItem` to sync holder + write history
- [x] `AddItemControl`: hidden when no loose items; on add, sets `kit_id` AND syncs holder via `assignItem`
- [x] Item edit form: Kit field added; kit change sends `kit_id` PATCH before other fields
- [x] `getItemsByIds`: returns empty array for empty input (no DB call)
- [x] Carnet export: items grouped by kit then loose items; group "select all" checkbox; sticky export bar
- [x] Carnet API: auth guard, builds xlsx buffer, returns with correct Content-Type and Content-Disposition
- [x] Carnet nav link added between Kits and Settings
