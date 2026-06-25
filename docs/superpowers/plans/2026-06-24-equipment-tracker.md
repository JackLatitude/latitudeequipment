# Latitude Equipment Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based equipment tracking app for three business partners to manage company kit, including serial numbers, assignment to partners, kits (batches), and full assignment history.

**Architecture:** Next.js 14 App Router with TypeScript for the full-stack framework; Supabase for Postgres database, Row Level Security, and Auth; all mutations via Next.js Server Actions; reads via async Server Components. Deployed to Vercel.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (`@supabase/ssr`), Jest, React Testing Library, Supabase CLI.

## Global Constraints

- Node.js ≥ 20
- Next.js 14 App Router only — no Pages Router
- TypeScript strict mode on
- All DB mutations via Server Actions (no client-side Supabase calls for writes)
- Reads in Server Components via server Supabase client
- Tailwind CSS only — no other CSS or component libraries
- All routes except `/login` and `/auth/*` require authentication
- RLS enabled on all tables; all authenticated users have equal read/write access
- Soft-delete items (set `deleted_at`); never hard-delete item records
- Kits always have a `current_holder_id` — never null

### Brand Constraints (Latitude Equipment)

All UI must use the Latitude Equipment brand identity:

**Colours** (use as Tailwind `brand-*` custom tokens):
| Token | Hex | Usage |
|---|---|---|
| `brand-red` | `#ED2643` | Primary action buttons, active nav indicator, accents |
| `brand-black` | `#000000` | Nav bar background, headings, primary text |
| `brand-white` | `#FFFFFF` | Page background, reversed text |
| `brand-light-grey` | `#F2F2F2` | Alternating table rows, subtle backgrounds |
| `brand-mid-grey` | `#888888` | Labels, secondary text, placeholders |
| `brand-rule-grey` | `#DDDDDD` | Table borders, dividers, input borders |

**Typography** — Metropolis font family (TTF files in brand assets):
| CSS weight | Font file | Usage |
|---|---|---|
| 700 (bold) | `Metropolis-Bold.ttf` | Headings, table headers, nav labels |
| 500 (medium) | `Metropolis-Medium.ttf` | Subheadings, emphasis |
| 400 (regular) | `Metropolis-Regular.ttf` | Body text, inputs |
| 200 (extra-light) | `Metropolis-ExtraLight.ttf` | Footer, captions, secondary UI |

Font files source: `/Users/jdownes/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/6153d82b-d4d3-4f15-bd77-8ebff2de6248/a98a14bc-646a-44a3-ba29-6ba07e492d08/skills/latitude-brand-docs/assets/fonts/ttf/`

**Logos** (copy from brand assets into `public/logos/`):
- `logo_equipment_dark.png` — full logo (black bg, 1400×499px) — used in Nav header bar
- `logo_wordmark_dark.png` — wordmark only (black bg, 1400×377px) — reserved for future use
- `icon.png` — icon mark (black bg, 400×490px) — used as browser favicon

Logo files source: `/Users/jdownes/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/6153d82b-d4d3-4f15-bd77-8ebff2de6248/a98a14bc-646a-44a3-ba29-6ba07e492d08/skills/latitude-brand-docs/assets/logos/`

**Nav design:**
- Full-width black (`brand-black`) top bar, 64px tall
- 3px `brand-red` rule at very top of bar
- `logo_equipment_dark.png` left-aligned in bar, 44px tall (rendered width ≈ 123px)
- Nav links right of logo, white text, `brand-red` underline on active link
- Sign-out button and current user name at far right, white text

---

## File Map

```
latitude-equipment/
├── public/
│   ├── fonts/                            # Metropolis TTF files (copied from brand assets)
│   │   ├── Metropolis-Regular.ttf
│   │   ├── Metropolis-Bold.ttf
│   │   ├── Metropolis-Medium.ttf
│   │   └── Metropolis-ExtraLight.ttf
│   └── logos/                            # Brand logos (copied from brand assets)
│       ├── logo_equipment_dark.png       # Full logo — used in Nav
│       └── icon.png                      # Icon — used as favicon
├── app/
│   ├── layout.tsx                        # Root layout: wraps all pages, includes <Nav>
│   ├── page.tsx                          # Redirects to /equipment
│   ├── login/
│   │   └── page.tsx                      # Email/password login form
│   ├── auth/
│   │   └── callback/route.ts             # Supabase auth callback handler
│   ├── equipment/
│   │   ├── page.tsx                      # Equipment list: search, filter, table
│   │   ├── new/page.tsx                  # Add new item form
│   │   └── [id]/page.tsx                 # Item detail: fields, assign control, history
│   ├── kits/
│   │   ├── page.tsx                      # Kits list: cards with holder + item count
│   │   ├── new/page.tsx                  # Add new kit form
│   │   └── [id]/page.tsx                 # Kit detail: items, kit-level assign control
│   └── settings/
│       └── page.tsx                      # Invite user, change display name/password
├── components/
│   ├── nav.tsx                           # Top nav with links + current user
│   ├── equipment/
│   │   ├── item-table.tsx                # Table of items with search/filter
│   │   └── assign-control.tsx            # "Assign to" dropdown + Take It button
│   ├── kits/
│   │   ├── kit-card.tsx                  # Single kit summary card
│   │   └── kit-assign-control.tsx        # Kit-level assign control
│   └── ui/
│       ├── confirm-dialog.tsx            # Generic "are you sure?" modal
│       └── field.tsx                     # Label + input wrapper for forms
├── lib/
│   ├── types.ts                          # Shared domain types (Item, Kit, Profile, etc.)
│   ├── supabase/
│   │   ├── client.ts                     # createBrowserClient() for Client Components
│   │   ├── server.ts                     # createServerClient() for Server Components
│   │   └── admin.ts                      # Service role client for invite API
│   └── db/
│       ├── items.ts                      # getItems, getItem, createItem, updateItem, deleteItem
│       ├── kits.ts                       # getKits, getKit, createKit, updateKit, deleteKit, duplicateKit
│       ├── assignments.ts                # assignItem, assignKit, getItemHistory
│       └── users.ts                      # getProfiles, getProfile, updateProfile, inviteUser
├── middleware.ts                         # Redirect unauthenticated users to /login
├── supabase/
│   └── migrations/
│       └── 0001_initial.sql              # Full schema: tables, RLS, profile trigger
├── __tests__/
│   └── lib/db/
│       ├── items.test.ts
│       ├── kits.test.ts
│       ├── assignments.test.ts
│       └── users.test.ts
├── jest.config.ts
├── jest.setup.ts
├── .env.local.example
└── package.json
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `jest.config.ts`, `jest.setup.ts`, `.env.local.example`

**Interfaces:**
- Produces: runnable `npm run dev`, passing `npm test`

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest latitude-equipment \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd latitude-equipment
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install --save-dev jest jest-environment-jsdom @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event ts-jest \
  @types/jest supabase
```

- [ ] **Step 3: Copy brand assets into project**

```bash
BRAND_FONTS="/Users/jdownes/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/6153d82b-d4d3-4f15-bd77-8ebff2de6248/a98a14bc-646a-44a3-ba29-6ba07e492d08/skills/latitude-brand-docs/assets/fonts/ttf"
BRAND_LOGOS="/Users/jdownes/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/6153d82b-d4d3-4f15-bd77-8ebff2de6248/a98a14bc-646a-44a3-ba29-6ba07e492d08/skills/latitude-brand-docs/assets/logos"

mkdir -p public/fonts public/logos

cp "$BRAND_FONTS/Metropolis-Regular.ttf" public/fonts/
cp "$BRAND_FONTS/Metropolis-Bold.ttf" public/fonts/
cp "$BRAND_FONTS/Metropolis-Medium.ttf" public/fonts/
cp "$BRAND_FONTS/Metropolis-ExtraLight.ttf" public/fonts/
cp "$BRAND_LOGOS/logo_equipment_dark.png" public/logos/
cp "$BRAND_LOGOS/icon.png" public/logos/
```

Expected: 6 files copied with no errors.

- [ ] **Step 4: Configure Tailwind with brand colours and Metropolis font**

Replace `tailwind.config.ts`:

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
        'brand-red':        '#ED2643',
        'brand-black':      '#000000',
        'brand-white':      '#FFFFFF',
        'brand-light-grey': '#F2F2F2',
        'brand-mid-grey':   '#888888',
        'brand-rule-grey':  '#DDDDDD',
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

- [ ] **Step 5: Register Metropolis font faces in global CSS**

Add to the top of `app/globals.css` (before the existing `@tailwind` directives):

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
```

- [ ] **Step 7: Configure Jest**

Replace the contents of `jest.config.ts`:

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Create environment variables template**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 9: Initialise Supabase CLI**

```bash
npx supabase init
```

This creates `supabase/` directory with `config.toml`.

- [ ] **Step 10: Create a Supabase project**

Go to https://supabase.com, create a new project called `latitude-equipment`. Copy the Project URL, anon key, and service role key (from Project Settings → API). Create `.env.local` from the example and paste in those values.

- [ ] **Step 11: Verify setup**

```bash
npm run dev
```

Expected: Next.js default page loads at http://localhost:3000 with no errors. Body text should render in Metropolis.

```bash
npm test -- --passWithNoTests
```

Expected: `Test Suites: 0 passed`

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "chore: initial Next.js project with brand assets, Tailwind config, and Jest"
```

---

## Task 2: Database Schema & Migrations

**Files:**
- Create: `supabase/migrations/0001_initial.sql`

**Interfaces:**
- Produces: Tables `profiles`, `kits`, `items`, `assignment_history` in Supabase with RLS enabled

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_initial.sql`:

```sql
-- Profiles: mirrors auth.users, stores display names
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Kits: always has a holder
create table kits (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  current_holder_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Items: standalone or belonging to a kit
create table items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  serial_number text,
  category text,
  notes text,
  kit_id uuid references kits(id) on delete set null,
  current_holder_id uuid references profiles(id) on delete set null,
  value numeric,
  country_of_origin text,
  weight_kg numeric,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Assignment history: immutable log
create table assignment_history (
  id uuid default gen_random_uuid() primary key,
  item_id uuid not null references items(id),
  assigned_to_id uuid references profiles(id) on delete set null,
  assigned_by_id uuid not null references profiles(id),
  assigned_at timestamptz not null default now(),
  note text
);

-- RLS: all authenticated users have full access
alter table profiles enable row level security;
alter table kits enable row level security;
alter table items enable row level security;
alter table assignment_history enable row level security;

create policy "auth_all_profiles" on profiles for all to authenticated
  using (true) with check (true);

create policy "auth_all_kits" on kits for all to authenticated
  using (true) with check (true);

create policy "auth_all_items" on items for all to authenticated
  using (true) with check (true);

create policy "auth_select_history" on assignment_history for select to authenticated
  using (true);

create policy "auth_insert_history" on assignment_history for insert to authenticated
  with check (true);

-- Trigger: auto-create profile when a user accepts an invite
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

- [ ] **Step 2: Push migration to Supabase**

```bash
npx supabase db push --db-url "postgresql://postgres:[YOUR-DB-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

Your DB password and project ref are in Supabase dashboard → Project Settings → Database.

Expected: `Applying migration 0001_initial.sql... done`

- [ ] **Step 3: Verify in Supabase dashboard**

Open Supabase → Table Editor. Confirm these tables exist: `profiles`, `kits`, `items`, `assignment_history`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_initial.sql
git commit -m "feat: initial database schema with RLS and profile trigger"
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`

**Interfaces:**
- Produces:
  - `createClient()` from `lib/supabase/client.ts` → `SupabaseClient` (browser)
  - `createClient()` from `lib/supabase/server.ts` → `Promise<SupabaseClient>` (server)
  - `createAdminClient()` from `lib/supabase/admin.ts` → `SupabaseClient` (service role)

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookies can't be set, ignore
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create admin client**

Create `lib/supabase/admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/
git commit -m "feat: Supabase browser, server, and admin clients"
```

---

## Task 4: Auth Middleware & Route Protection

**Files:**
- Create: `middleware.ts`, `app/auth/callback/route.ts`

**Interfaces:**
- Produces: unauthenticated requests to any non-`/login`, non-`/auth` route → redirect to `/login`

- [ ] **Step 1: Write the middleware**

Create `middleware.ts` at project root:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Write the auth callback route**

Create `app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/equipment'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts app/auth/callback/route.ts
git commit -m "feat: auth middleware and callback route"
```

---

## Task 5: Login Page

**Files:**
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/client.ts`
- Produces: authenticated Supabase session → redirects to `/equipment`

- [ ] **Step 1: Write the login page**

Create `app/login/page.tsx`:

```typescript
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-light-grey">
      {/* Brand header bar — matches the Nav */}
      <div className="w-full bg-brand-black border-t-[3px] border-brand-red flex items-center px-8 h-16 fixed top-0 left-0">
        <Image src="/logos/logo_equipment_dark.png" alt="Latitude Equipment" width={123} height={44} priority />
      </div>
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm p-8 mt-16">
        <h1 className="text-xl font-bold text-brand-black mb-6">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-brand-rule-grey rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-brand-rule-grey rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
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

- [ ] **Step 2: Verify login works end-to-end**

Run `npm run dev`. Visit http://localhost:3000 — you should be redirected to `/login`. Create a user manually in Supabase dashboard → Authentication → Users → Invite User. Use those credentials to sign in. You should be redirected to `/equipment` (which will 404 for now — that's fine).

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: login page with email/password auth"
```

---

## Task 6: Shared Types & DB Helper Functions

**Files:**
- Create: `lib/types.ts`, `lib/db/items.ts`, `lib/db/kits.ts`, `lib/db/assignments.ts`, `lib/db/users.ts`
- Create: `__tests__/lib/db/items.test.ts`, `__tests__/lib/db/kits.test.ts`, `__tests__/lib/db/assignments.test.ts`

**Interfaces:**
- Produces all DB functions consumed by Server Actions and Server Components in later tasks:
  - `getItems(filters?)` → `Promise<Item[]>`
  - `getItem(id)` → `Promise<Item | null>`
  - `createItem(data)` → `Promise<Item>`
  - `updateItem(id, data)` → `Promise<Item>`
  - `deleteItem(id)` → `Promise<void>` (soft delete)
  - `getKits()` → `Promise<Kit[]>`
  - `getKit(id)` → `Promise<Kit | null>`
  - `createKit(data)` → `Promise<Kit>`
  - `updateKit(id, data)` → `Promise<Kit>`
  - `deleteKit(id)` → `Promise<void>`
  - `duplicateKit(id, duplicatedById)` → `Promise<Kit>`
  - `assignItem(itemId, assignedToId | null, assignedById)` → `Promise<void>`
  - `assignKit(kitId, assignedToId, assignedById)` → `Promise<void>`
  - `getItemHistory(itemId)` → `Promise<AssignmentHistory[]>`
  - `getProfiles()` → `Promise<Profile[]>`
  - `getProfile(id)` → `Promise<Profile | null>`
  - `updateProfile(id, data)` → `Promise<Profile>`
  - `inviteUser(email)` → `Promise<void>`

- [ ] **Step 1: Write shared types**

Create `lib/types.ts`:

```typescript
export type Profile = {
  id: string
  display_name: string
  is_admin: boolean
  created_at: string
}

export type Kit = {
  id: string
  name: string
  description: string | null
  current_holder_id: string
  current_holder?: Profile
  created_at: string
}

export type Item = {
  id: string
  name: string
  serial_number: string | null
  category: string | null
  notes: string | null
  kit_id: string | null
  kit?: Kit
  current_holder_id: string | null
  current_holder?: Profile
  value: number | null
  country_of_origin: string | null
  weight_kg: number | null
  deleted_at: string | null
  created_at: string
}

export type AssignmentHistory = {
  id: string
  item_id: string
  assigned_to_id: string | null
  assigned_to?: Profile | null
  assigned_by_id: string
  assigned_by?: Profile
  assigned_at: string
  note: string | null
}

export type ItemFilters = {
  holderId?: string | 'unassigned'
  search?: string
}

export type CreateItemData = {
  name: string
  serial_number?: string
  category?: string
  notes?: string
  kit_id?: string
  current_holder_id?: string
  value?: number
  country_of_origin?: string
  weight_kg?: number
}

export type CreateKitData = {
  name: string
  description?: string
  current_holder_id: string
}
```

- [ ] **Step 2: Write the items DB helper — test first**

Create `__tests__/lib/db/items.test.ts`:

```typescript
import { getItems, getItem, createItem, deleteItem } from '@/lib/db/items'

const mockSelect = jest.fn()
const mockFrom = jest.fn(() => ({ select: mockSelect }))
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getItems', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns items from supabase', async () => {
    const fakeItems = [{ id: '1', name: 'Drone', deleted_at: null }]
    mockSelect.mockReturnValue({
      is: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: fakeItems, error: null }),
      }),
    })
    const result = await getItems()
    expect(result).toEqual(fakeItems)
  })

  it('throws on supabase error', async () => {
    mockSelect.mockReturnValue({
      is: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    })
    await expect(getItems()).rejects.toThrow('DB error')
  })
})

describe('deleteItem', () => {
  it('sets deleted_at rather than hard-deleting', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })
    mockFrom.mockReturnValue({ update: mockUpdate })
    await deleteItem('item-1')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    )
  })
})
```

- [ ] **Step 3: Run test — verify it fails**

```bash
npm test -- __tests__/lib/db/items.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/items'`

- [ ] **Step 4: Implement items DB helper**

Create `lib/db/items.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Item, ItemFilters, CreateItemData } from '@/lib/types'

export async function getItems(filters?: ItemFilters): Promise<Item[]> {
  const supabase = await createClient()
  let query = supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .is('deleted_at', null)
    .order('name')

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`)
  }

  if (filters?.holderId === 'unassigned') {
    query = query.is('current_holder_id', null)
  } else if (filters?.holderId) {
    query = query.eq('current_holder_id', filters.holderId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Item[]
}

export async function getItem(id: string): Promise<Item | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return null
  return data as Item
}

export async function createItem(data: CreateItemData): Promise<Item> {
  const supabase = await createClient()
  const { data: item, error } = await supabase
    .from('items')
    .insert(data)
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .single()
  if (error) throw new Error(error.message)
  return item as Item
}

export async function updateItem(id: string, data: Partial<CreateItemData>): Promise<Item> {
  const supabase = await createClient()
  const { data: item, error } = await supabase
    .from('items')
    .update(data)
    .eq('id', id)
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .single()
  if (error) throw new Error(error.message)
  return item as Item
}

export async function deleteItem(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npm test -- __tests__/lib/db/items.test.ts
```

Expected: PASS

- [ ] **Step 6: Write the kits DB helper — test first**

Create `__tests__/lib/db/kits.test.ts`:

```typescript
import { getKits, duplicateKit } from '@/lib/db/kits'

const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getKits', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns kits ordered by name', async () => {
    const fakeKits = [{ id: '1', name: 'Inspire Kit' }]
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: fakeKits, error: null }),
      }),
    })
    const result = await getKits()
    expect(result).toEqual(fakeKits)
  })
})

describe('duplicateKit', () => {
  it('creates new kit and new item records (not references)', async () => {
    const fakeKit = {
      id: 'kit-1',
      name: 'Inspire Kit',
      description: 'Main kit',
      current_holder_id: 'user-1',
    }
    const fakeItems = [
      { name: 'Drone', serial_number: 'SN1', category: 'Drone', notes: null, value: 5000, country_of_origin: 'China', weight_kg: 4.2 },
    ]

    // getKit call
    const getKitChain = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: fakeKit, error: null }) }) }) }
    // getItems in kit call
    const getItemsChain = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ is: jest.fn().mockResolvedValue({ data: fakeItems, error: null }) }) }) }
    // createKit call
    const createKitChain = { insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { ...fakeKit, id: 'kit-2', name: 'Inspire Kit — Copy' }, error: null }) }) }) }
    // createItems call
    const createItemsChain = { insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [], error: null }) }) }

    mockFrom
      .mockReturnValueOnce(getKitChain)
      .mockReturnValueOnce(getItemsChain)
      .mockReturnValueOnce(createKitChain)
      .mockReturnValueOnce(createItemsChain)

    await duplicateKit('kit-1', 'user-2')

    expect(createItemsChain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ serial_number: null, name: 'Drone' }),
      ])
    )
  })
})
```

- [ ] **Step 7: Run test — verify it fails**

```bash
npm test -- __tests__/lib/db/kits.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/kits'`

- [ ] **Step 8: Implement kits DB helper**

Create `lib/db/kits.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Kit, CreateKitData } from '@/lib/types'

export async function getKits(): Promise<Kit[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kits')
    .select('*, current_holder:profiles(*)')
    .order('name')
  if (error) throw new Error(error.message)
  return data as Kit[]
}

export async function getKit(id: string): Promise<Kit | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kits')
    .select('*, current_holder:profiles(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Kit
}

export async function createKit(data: CreateKitData): Promise<Kit> {
  const supabase = await createClient()
  const { data: kit, error } = await supabase
    .from('kits')
    .insert(data)
    .select('*, current_holder:profiles(*)')
    .single()
  if (error) throw new Error(error.message)
  return kit as Kit
}

export async function updateKit(id: string, data: Partial<CreateKitData>): Promise<Kit> {
  const supabase = await createClient()
  const { data: kit, error } = await supabase
    .from('kits')
    .update(data)
    .eq('id', id)
    .select('*, current_holder:profiles(*)')
    .single()
  if (error) throw new Error(error.message)
  return kit as Kit
}

export async function deleteKit(id: string): Promise<void> {
  const supabase = await createClient()
  // Detach all items from kit first
  await supabase.from('items').update({ kit_id: null }).eq('kit_id', id)
  const { error } = await supabase.from('kits').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function duplicateKit(kitId: string, duplicatedById: string): Promise<Kit> {
  const supabase = await createClient()

  // Fetch original kit
  const { data: original, error: kitError } = await supabase
    .from('kits')
    .select('*')
    .eq('id', kitId)
    .single()
  if (kitError) throw new Error(kitError.message)

  // Fetch items in original kit (non-deleted)
  const { data: originalItems, error: itemsError } = await supabase
    .from('items')
    .select('name, serial_number, category, notes, value, country_of_origin, weight_kg')
    .eq('kit_id', kitId)
    .is('deleted_at', null)
  if (itemsError) throw new Error(itemsError.message)

  // Create new kit assigned to the user who duplicated it
  const { data: newKit, error: newKitError } = await supabase
    .from('kits')
    .insert({
      name: `${original.name} — Copy`,
      description: original.description,
      current_holder_id: duplicatedById,
    })
    .select('*, current_holder:profiles(*)')
    .single()
  if (newKitError) throw new Error(newKitError.message)

  // Create new item records with serial_number cleared
  if (originalItems && originalItems.length > 0) {
    const newItems = originalItems.map((item) => ({
      ...item,
      serial_number: null,
      kit_id: newKit.id,
      current_holder_id: duplicatedById,
    }))
    const { error: newItemsError } = await supabase.from('items').insert(newItems)
    if (newItemsError) throw new Error(newItemsError.message)
  }

  return newKit as Kit
}
```

- [ ] **Step 9: Run test — verify it passes**

```bash
npm test -- __tests__/lib/db/kits.test.ts
```

Expected: PASS

- [ ] **Step 10: Write the assignments DB helper — test first**

Create `__tests__/lib/db/assignments.test.ts`:

```typescript
import { assignItem, assignKit, getItemHistory } from '@/lib/db/assignments'

const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('assignItem', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates item current_holder_id and inserts history record', async () => {
    const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockFrom
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ insert: mockInsert })

    await assignItem('item-1', 'user-2', 'user-1')

    expect(mockUpdate).toHaveBeenCalledWith({ current_holder_id: 'user-2' })
    expect(mockInsert).toHaveBeenCalledWith({
      item_id: 'item-1',
      assigned_to_id: 'user-2',
      assigned_by_id: 'user-1',
      note: null,
    })
  })

  it('accepts null for assigned_to_id (return to storage)', async () => {
    const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockFrom
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ insert: mockInsert })

    await assignItem('item-1', null, 'user-1')

    expect(mockUpdate).toHaveBeenCalledWith({ current_holder_id: null })
  })
})
```

- [ ] **Step 11: Run test — verify it fails**

```bash
npm test -- __tests__/lib/db/assignments.test.ts
```

Expected: FAIL

- [ ] **Step 12: Implement assignments DB helper**

Create `lib/db/assignments.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import type { AssignmentHistory } from '@/lib/types'

export async function assignItem(
  itemId: string,
  assignedToId: string | null,
  assignedById: string,
  note?: string
): Promise<void> {
  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from('items')
    .update({ current_holder_id: assignedToId })
    .eq('id', itemId)
  if (updateError) throw new Error(updateError.message)

  const { error: historyError } = await supabase
    .from('assignment_history')
    .insert({
      item_id: itemId,
      assigned_to_id: assignedToId,
      assigned_by_id: assignedById,
      note: note ?? null,
    })
  if (historyError) throw new Error(historyError.message)
}

export async function assignKit(
  kitId: string,
  assignedToId: string,
  assignedById: string
): Promise<void> {
  const supabase = await createClient()

  // Fetch all non-deleted items in this kit
  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id')
    .eq('kit_id', kitId)
    .is('deleted_at', null)
  if (fetchError) throw new Error(fetchError.message)

  // Update kit holder
  const { error: kitError } = await supabase
    .from('kits')
    .update({ current_holder_id: assignedToId })
    .eq('id', kitId)
  if (kitError) throw new Error(kitError.message)

  if (!items || items.length === 0) return

  // Update all items and write history records
  const { error: itemsError } = await supabase
    .from('items')
    .update({ current_holder_id: assignedToId })
    .eq('kit_id', kitId)
    .is('deleted_at', null)
  if (itemsError) throw new Error(itemsError.message)

  const historyRecords = items.map((item) => ({
    item_id: item.id,
    assigned_to_id: assignedToId,
    assigned_by_id: assignedById,
    note: `Kit assignment`,
  }))

  const { error: historyError } = await supabase
    .from('assignment_history')
    .insert(historyRecords)
  if (historyError) throw new Error(historyError.message)
}

export async function getItemHistory(itemId: string): Promise<AssignmentHistory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assignment_history')
    .select('*, assigned_to:profiles!assigned_to_id(*), assigned_by:profiles!assigned_by_id(*)')
    .eq('item_id', itemId)
    .order('assigned_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as AssignmentHistory[]
}
```

- [ ] **Step 13: Run test — verify it passes**

```bash
npm test -- __tests__/lib/db/assignments.test.ts
```

Expected: PASS

- [ ] **Step 14: Implement users DB helper**

Create `lib/db/users.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/lib/types'

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('display_name')
  if (error) throw new Error(error.message)
  return data as Profile[]
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Profile
}

export async function updateProfile(id: string, data: { display_name?: string }): Promise<Profile> {
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return profile as Profile
}

export async function inviteUser(email: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  })
  if (error) throw new Error(error.message)
}
```

Add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local` and `.env.local.example`.

- [ ] **Step 15: Run all tests**

```bash
npm test
```

Expected: all pass

- [ ] **Step 16: Commit**

```bash
git add lib/ __tests__/
git commit -m "feat: shared types and DB helper functions"
```

---

## Task 7: Root Layout & Navigation

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`
- Create: `components/nav.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server`, `getProfile(id)` from `lib/db/users`
- Produces: authenticated shell with nav links visible on all protected pages

- [ ] **Step 1: Create the Nav component**

Create `components/nav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = { displayName: string }

export function Nav({ displayName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const linkClass = (href: string) =>
    `text-sm font-medium text-white px-3 py-1 transition-colors border-b-2 ${
      pathname.startsWith(href)
        ? 'border-brand-red'
        : 'border-transparent hover:border-white/40'
    }`

  return (
    // 3px brand-red rule sits above the black bar via the border-t
    <nav className="bg-brand-black border-t-[3px] border-brand-red px-6 flex items-center justify-between h-16">
      <div className="flex items-center gap-6">
        {/* logo_equipment_dark.png: 1400×499 — rendered 44px tall → width ≈ 123px */}
        <Image
          src="/logos/logo_equipment_dark.png"
          alt="Latitude Equipment"
          width={123}
          height={44}
          priority
        />
        <Link href="/equipment" className={linkClass('/equipment')}>Equipment</Link>
        <Link href="/kits" className={linkClass('/kits')}>Kits</Link>
        <Link href="/settings" className={linkClass('/settings')}>Settings</Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-light text-white/60">{displayName}</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Update the root layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/users'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Latitude Equipment',
  description: 'Equipment tracker for Latitude Equipment',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = user ? await getProfile(user.id) : null
  const isLoginPage = false // Nav is always shown; login page has its own full-screen layout

  return (
    <html lang="en">
      <body className={inter.className}>
        {profile && <Nav displayName={profile.display_name} />}
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Update root redirect**

Replace `app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/equipment')
}
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx components/nav.tsx
git commit -m "feat: root layout with nav and auth-aware display name"
```

---

## Task 8: Equipment List View

**Files:**
- Create: `app/equipment/page.tsx`, `components/equipment/item-table.tsx`

**Interfaces:**
- Consumes: `getItems(filters)` from `lib/db/items`, `getProfiles()` from `lib/db/users`
- Produces: searchable, filterable table of all equipment

- [ ] **Step 1: Create the ItemTable component**

Create `components/equipment/item-table.tsx`:

```typescript
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
  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="search"
          placeholder="Search by name or serial…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <select
          value={holderId}
          onChange={(e) => onHolderChange(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All holders</option>
          <option value="unassigned">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No equipment found.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Serial</th>
              <th className="pb-2 pr-4 font-medium">Kit</th>
              <th className="pb-2 font-medium">Holder</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 pr-4">
                  <Link href={`/equipment/${item.id}`} className="font-medium text-gray-900 hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-gray-500">{item.serial_number ?? '—'}</td>
                <td className="py-2.5 pr-4 text-gray-500">{item.kit?.name ?? '—'}</td>
                <td className="py-2.5 text-gray-500">
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

- [ ] **Step 2: Create the equipment list page**

Create `app/equipment/page.tsx`:

```typescript
import Link from 'next/link'
import { getItems } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { ItemTableWrapper } from './_components/item-table-wrapper'

type Props = {
  searchParams: { search?: string; holder?: string }
}

export default async function EquipmentPage({ searchParams }: Props) {
  const [items, profiles] = await Promise.all([
    getItems({ search: searchParams.search, holderId: searchParams.holder }),
    getProfiles(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Equipment</h1>
        <Link
          href="/equipment/new"
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700"
        >
          Add item
        </Link>
      </div>
      <ItemTableWrapper
        items={items}
        profiles={profiles}
        initialSearch={searchParams.search ?? ''}
        initialHolder={searchParams.holder ?? ''}
      />
    </div>
  )
}
```

The search/filter interaction needs URL state. Create `app/equipment/_components/item-table-wrapper.tsx`:

```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { ItemTable } from '@/components/equipment/item-table'
import type { Item, Profile } from '@/lib/types'

type Props = {
  items: Item[]
  profiles: Profile[]
  initialSearch: string
  initialHolder: string
}

export function ItemTableWrapper({ items, profiles, initialSearch, initialHolder }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/equipment?${params.toString()}`)
  }, [router, searchParams])

  return (
    <ItemTable
      items={items}
      profiles={profiles}
      search={initialSearch}
      holderId={initialHolder}
      onSearchChange={(v) => update('search', v)}
      onHolderChange={(v) => update('holder', v)}
    />
  )
}
```

- [ ] **Step 3: Verify in browser**

`npm run dev` → visit http://localhost:3000/equipment. Confirm the table renders (empty or with any manually added test data), search box and filter work.

- [ ] **Step 4: Commit**

```bash
git add app/equipment/ components/equipment/item-table.tsx
git commit -m "feat: equipment list view with search and holder filter"
```

---

## Task 9: Item Detail & Assignment

**Files:**
- Create: `app/equipment/[id]/page.tsx`, `components/equipment/assign-control.tsx`

**Interfaces:**
- Consumes: `getItem(id)`, `getProfiles()`, `getItemHistory(id)`, `assignItem()`
- Produces: item detail page with assign-to control and full history

- [ ] **Step 1: Create the AssignControl component**

Create `components/equipment/assign-control.tsx`:

```typescript
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
  const [loading, setLoading] = useState(false)

  async function handleAssign(assignedToId: string | null) {
    setLoading(true)
    await onAssign(itemId, assignedToId)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        disabled={loading}
        value={currentHolderId ?? ''}
        onChange={(e) => handleAssign(e.target.value || null)}
        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
      >
        {!kitId && <option value="">Unassigned (in storage)</option>}
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {currentHolderId !== currentUserId && (
        <button
          disabled={loading}
          onClick={() => handleAssign(currentUserId)}
          className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          Take it
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the item detail page**

Create `app/equipment/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getItem } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { getItemHistory, assignItem } from '@/lib/db/assignments'
import { createClient } from '@/lib/supabase/server'
import { AssignControl } from '@/components/equipment/assign-control'
import { revalidatePath } from 'next/cache'

type Props = { params: { id: string } }

export default async function ItemDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [item, profiles, history] = await Promise.all([
    getItem(params.id),
    getProfiles(),
    getItemHistory(params.id),
  ])

  if (!item) return notFound()

  async function handleAssign(itemId: string, assignedToId: string | null) {
    'use server'
    await assignItem(itemId, assignedToId, user!.id)
    revalidatePath(`/equipment/${itemId}`)
    revalidatePath('/equipment')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/equipment" className="text-sm text-gray-500 hover:text-gray-900">
          ← Equipment
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{item.name}</h1>
        <Link
          href={`/equipment/${item.id}/edit`}
          className="text-sm text-gray-500 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5"
        >
          Edit
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8 text-sm">
        {[
          ['Serial number', item.serial_number ?? '—'],
          ['Category', item.category ?? '—'],
          ['Kit', item.kit?.name ?? '—'],
          ['Value', item.value != null ? `£${item.value}` : '—'],
          ['Country of origin', item.country_of_origin ?? '—'],
          ['Weight', item.weight_kg != null ? `${item.weight_kg} kg` : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Current holder</h2>
        <AssignControl
          itemId={item.id}
          currentHolderId={item.current_holder_id}
          kitId={item.kit_id}
          profiles={profiles}
          currentUserId={user.id}
          onAssign={handleAssign}
        />
      </div>

      {item.notes && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-900 mb-1">Notes</h2>
          <p className="text-sm text-gray-600">{item.notes}</p>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-3">Assignment history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {h.assigned_to?.display_name ?? 'Unassigned'}
                </span>
                {' '}— assigned by {h.assigned_by?.display_name}{' '}
                <span className="text-gray-400">
                  {new Date(h.assigned_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Add a test item in Supabase Table Editor. Visit `/equipment/[that-item-id]`. Confirm detail fields show, assign control works (change holder via dropdown, "Take it" button), history populates after assignment.

- [ ] **Step 4: Commit**

```bash
git add app/equipment/\[id\]/ components/equipment/assign-control.tsx
git commit -m "feat: item detail page with assignment control and history"
```

---

## Task 10: Add & Delete Items

**Files:**
- Create: `app/equipment/new/page.tsx`, `app/equipment/[id]/edit/page.tsx`, `components/ui/field.tsx`, `components/ui/confirm-dialog.tsx`

**Interfaces:**
- Consumes: `createItem()`, `updateItem()`, `deleteItem()`, `getKits()`, `getProfiles()`
- Produces: form to add new item; edit page; delete with confirmation

- [ ] **Step 1: Create reusable Field component**

Create `components/ui/field.tsx`:

```typescript
type Props = {
  label: string
  children: React.ReactNode
  required?: boolean
}

export function Field({ label, children, required }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create ConfirmDialog component**

Create `components/ui/confirm-dialog.tsx`:

```typescript
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="text-sm font-medium text-gray-700 border border-gray-300 rounded px-4 py-2 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-sm font-medium text-white bg-red-600 rounded px-4 py-2 hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the new item form page**

Create `app/equipment/new/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Field } from '@/components/ui/field'

// This page uses a client-side form that posts to a server action via fetch.
// Simpler than a Server Component form for this use case.
export default function NewItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const item = await res.json()
      router.push(`/equipment/${item.id}`)
    } else {
      const { message } = await res.json()
      setError(message)
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/equipment" className="text-sm text-gray-500 hover:text-gray-900">← Equipment</Link>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Add item</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" required>
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Serial number">
          <input name="serial_number" className={inputClass} />
        </Field>
        <Field label="Category">
          <input name="category" placeholder="e.g. Drone, Battery, Lens" className={inputClass} />
        </Field>
        <Field label="Value (£)">
          <input name="value" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
        <Field label="Country of origin">
          <input name="country_of_origin" placeholder="e.g. China" className={inputClass} />
        </Field>
        <Field label="Weight (kg)">
          <input name="weight_kg" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea name="notes" rows={3} className={inputClass} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Add item'}
          </button>
          <Link href="/equipment" className="text-sm font-medium text-gray-500 px-4 py-2 hover:text-gray-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
```

Create the API route `app/api/items/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { createItem } from '@/lib/db/items'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const item = await createItem({
      name: body.name,
      serial_number: body.serial_number || undefined,
      category: body.category || undefined,
      notes: body.notes || undefined,
      value: body.value ? parseFloat(body.value) : undefined,
      country_of_origin: body.country_of_origin || undefined,
      weight_kg: body.weight_kg ? parseFloat(body.weight_kg) : undefined,
    })
    return NextResponse.json(item)
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Add delete button to item detail page**

Modify `app/equipment/[id]/page.tsx` to add a delete button. Add this import and server action, then add the button to the page:

```typescript
// Add to imports in app/equipment/[id]/page.tsx
import { deleteItem } from '@/lib/db/items'
import { redirect } from 'next/navigation'
import { DeleteItemButton } from './_components/delete-button'
```

Create `app/equipment/[id]/_components/delete-button.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Props = { itemId: string; onDelete: (itemId: string) => Promise<void> }

export function DeleteItemButton({ itemId, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleConfirm() {
    await onDelete(itemId)
    router.push('/equipment')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Delete item
      </button>
      <ConfirmDialog
        open={open}
        title="Delete item?"
        description="This item will be removed from the equipment list. This cannot be undone."
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
```

Add the server action and button to `app/equipment/[id]/page.tsx` (at the bottom of the JSX, below the history section):

```typescript
  async function handleDelete(itemId: string) {
    'use server'
    await deleteItem(itemId)
    redirect('/equipment')
  }

  // In JSX, below the history section:
  // <DeleteItemButton itemId={item.id} onDelete={handleDelete} />
```

- [ ] **Step 5: Verify in browser**

Add an item via the form, confirm it appears in the list and detail page. Delete it, confirm it disappears from the list.

- [ ] **Step 6: Commit**

```bash
git add app/equipment/new/ app/equipment/\[id\]/ app/api/items/ components/ui/
git commit -m "feat: add and delete items"
```

---

## Task 11: Kits List View

**Files:**
- Create: `app/kits/page.tsx`, `components/kits/kit-card.tsx`

**Interfaces:**
- Consumes: `getKits()`, `getItems()` (for item counts per kit)
- Produces: grid of kit cards showing name, holder, item count

- [ ] **Step 1: Create the KitCard component**

Create `components/kits/kit-card.tsx`:

```typescript
import Link from 'next/link'
import type { Kit } from '@/lib/types'

type Props = { kit: Kit; itemCount: number }

export function KitCard({ kit, itemCount }: Props) {
  return (
    <Link
      href={`/kits/${kit.id}`}
      className="block border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors"
    >
      <h2 className="font-medium text-gray-900 mb-1">{kit.name}</h2>
      {kit.description && (
        <p className="text-sm text-gray-500 mb-3">{kit.description}</p>
      )}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        <span>{kit.current_holder?.display_name}</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create the kits list page**

Create `app/kits/page.tsx`:

```typescript
import Link from 'next/link'
import { getKits } from '@/lib/db/kits'
import { getItems } from '@/lib/db/items'
import { KitCard } from '@/components/kits/kit-card'

export default async function KitsPage() {
  const [kits, allItems] = await Promise.all([
    getKits(),
    getItems(),
  ])

  const itemCountByKit = allItems.reduce<Record<string, number>>((acc, item) => {
    if (item.kit_id) acc[item.kit_id] = (acc[item.kit_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Kits</h1>
        <Link
          href="/kits/new"
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700"
        >
          Add kit
        </Link>
      </div>

      {kits.length === 0 ? (
        <p className="text-sm text-gray-500">No kits yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kits.map((kit) => (
            <KitCard key={kit.id} kit={kit} itemCount={itemCountByKit[kit.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/kits/page.tsx components/kits/kit-card.tsx
git commit -m "feat: kits list view"
```

---

## Task 12: Kit Detail & Kit Assignment

**Files:**
- Create: `app/kits/[id]/page.tsx`, `components/kits/kit-assign-control.tsx`

**Interfaces:**
- Consumes: `getKit(id)`, `getItems()`, `getProfiles()`, `assignKit()`
- Produces: kit detail with items table, kit-level assign control, "Take it" shortcut

- [ ] **Step 1: Create KitAssignControl**

Create `components/kits/kit-assign-control.tsx`:

```typescript
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
  const [loading, setLoading] = useState(false)

  async function handleAssign(assignedToId: string) {
    setLoading(true)
    await onAssign(kitId, assignedToId)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        disabled={loading}
        value={currentHolderId}
        onChange={(e) => handleAssign(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {currentHolderId !== currentUserId && (
        <button
          disabled={loading}
          onClick={() => handleAssign(currentUserId)}
          className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          Take it
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create kit detail page**

Create `app/kits/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getKit } from '@/lib/db/kits'
import { getItems } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { assignKit, assignItem } from '@/lib/db/assignments'
import { createClient } from '@/lib/supabase/server'
import { KitAssignControl } from '@/components/kits/kit-assign-control'
import { AssignControl } from '@/components/equipment/assign-control'

type Props = { params: { id: string } }

export default async function KitDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [kit, allItems, profiles] = await Promise.all([
    getKit(params.id),
    getItems(),
    getProfiles(),
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
    revalidatePath(`/kits/${params.id}`)
    revalidatePath('/equipment')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/kits" className="text-sm text-gray-500 hover:text-gray-900">← Kits</Link>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-xl font-semibold text-gray-900">{kit.name}</h1>
        <Link
          href={`/kits/${kit.id}/edit`}
          className="text-sm text-gray-500 border border-gray-300 rounded px-3 py-1.5 hover:text-gray-900"
        >
          Edit
        </Link>
      </div>

      {kit.description && (
        <p className="text-sm text-gray-500 mb-6">{kit.description}</p>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Kit holder</h2>
        <KitAssignControl
          kitId={kit.id}
          currentHolderId={kit.current_holder_id}
          profiles={profiles}
          currentUserId={user.id}
          onAssign={handleAssignKit}
        />
        <p className="text-xs text-gray-400 mt-1">
          Assigning the kit reassigns all items within it.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-3">
          Items ({kitItems.length})
        </h2>
        {kitItems.length === 0 ? (
          <p className="text-sm text-gray-500">No items in this kit.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Serial</th>
                <th className="pb-2 font-medium">Holder</th>
              </tr>
            </thead>
            <tbody>
              {kitItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">
                    <Link href={`/equipment/${item.id}`} className="font-medium text-gray-900 hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">{item.serial_number ?? '—'}</td>
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
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Create a kit in Supabase Table Editor, add an item to it. Visit `/kits/[id]`. Confirm kit-level assignment moves all items; individual item assignment within the kit works independently.

- [ ] **Step 4: Commit**

```bash
git add app/kits/\[id\]/ components/kits/kit-assign-control.tsx
git commit -m "feat: kit detail page with kit-level and item-level assignment"
```

---

## Task 13: Add, Delete & Duplicate Kits

**Files:**
- Create: `app/kits/new/page.tsx`, `app/api/kits/route.ts`, `app/kits/[id]/_components/kit-actions.tsx`

**Interfaces:**
- Consumes: `createKit()`, `deleteKit()`, `duplicateKit()`, `getProfiles()`
- Produces: form to add kit; delete with confirmation; duplicate button

- [ ] **Step 1: Create the API route for kits**

Create `app/api/kits/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { createKit, duplicateKit } from '@/lib/db/kits'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const kit = await createKit({
      name: body.name,
      description: body.description || undefined,
      current_holder_id: body.current_holder_id,
    })
    return NextResponse.json(kit)
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
```

Create `app/api/kits/[id]/duplicate/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { duplicateKit } from '@/lib/db/kits'
import { NextResponse } from 'next/server'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const kit = await duplicateKit(params.id, user.id)
    return NextResponse.json(kit)
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
```

Create `app/api/kits/[id]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { deleteKit } from '@/lib/db/kits'
import { NextResponse } from 'next/server'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await deleteKit(params.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create the new kit form page**

Create `app/kits/new/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Field } from '@/components/ui/field'
import type { Profile } from '@/lib/types'

export default function NewKitPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profiles').then((r) => r.json()).then(setProfiles)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const kit = await res.json()
      router.push(`/kits/${kit.id}`)
    } else {
      const { message } = await res.json()
      setError(message)
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/kits" className="text-sm text-gray-500 hover:text-gray-900">← Kits</Link>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Add kit</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Kit name" required>
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea name="description" rows={2} className={inputClass} />
        </Field>
        <Field label="Initial holder" required>
          <select name="current_holder_id" required className={inputClass}>
            <option value="">Select a partner…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </select>
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Add kit'}
          </button>
          <Link href="/kits" className="text-sm font-medium text-gray-500 px-4 py-2 hover:text-gray-900">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
```

Create the profiles API route `app/api/profiles/route.ts`:

```typescript
import { getProfiles } from '@/lib/db/users'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const profiles = await getProfiles()
  return NextResponse.json(profiles)
}
```

- [ ] **Step 3: Add delete and duplicate actions to kit detail page**

Create `app/kits/[id]/_components/kit-actions.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Props = { kitId: string }

export function KitActions({ kitId }: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/kits/${kitId}`, { method: 'DELETE' })
    router.push('/kits')
  }

  async function handleDuplicate() {
    setLoading(true)
    const res = await fetch(`/api/kits/${kitId}/duplicate`, { method: 'POST' })
    const kit = await res.json()
    router.push(`/kits/${kit.id}`)
  }

  return (
    <>
      <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleDuplicate}
          disabled={loading}
          className="text-sm font-medium text-gray-700 border border-gray-300 rounded px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
        >
          Duplicate kit
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          disabled={loading}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Delete kit
        </button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete kit?"
        description="The kit will be deleted. Items in it will remain but will no longer belong to a kit."
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
```

Import and render `<KitActions kitId={kit.id} />` at the bottom of `app/kits/[id]/page.tsx`.

- [ ] **Step 4: Verify in browser**

Create a kit via the form. Duplicate it — confirm new kit appears with blank serial numbers. Delete the duplicate.

- [ ] **Step 5: Commit**

```bash
git add app/kits/new/ app/kits/\[id\]/_components/ app/api/kits/ app/api/profiles/
git commit -m "feat: add, delete, and duplicate kits"
```

---

## Task 14: Settings & User Invite

**Files:**
- Create: `app/settings/page.tsx`, `app/api/invite/route.ts`

**Interfaces:**
- Consumes: `inviteUser()`, `updateProfile()`, `getProfile()`
- Produces: settings page with invite form (admin), display name edit, password change

- [ ] **Step 1: Create the invite API route**

Create `app/api/invite/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getProfile, inviteUser } from '@/lib/db/users'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const profile = await getProfile(user.id)
  if (!profile?.is_admin) {
    return NextResponse.json({ message: 'Admin only' }, { status: 403 })
  }

  const { email } = await request.json()
  try {
    await inviteUser(email)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create the settings page**

Create `app/settings/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/users'
import { notFound } from 'next/navigation'
import { SettingsForm } from './_components/settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const profile = await getProfile(user.id)
  if (!profile) return notFound()

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Settings</h1>
      <SettingsForm profile={profile} />
    </div>
  )
}
```

Create `app/settings/_components/settings-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Field } from '@/components/ui/field'
import type { Profile } from '@/lib/types'

type Props = { profile: Profile }

export function SettingsForm({ profile }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [inviteEmail, setInviteEmail] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [nameMsg, setNameMsg] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setNameMsg(null)
    const res = await fetch('/api/profiles/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName }),
    })
    setNameMsg(res.ok ? 'Saved.' : 'Something went wrong.')
    setSavingName(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    if (res.ok) {
      setInviteMsg(`Invite sent to ${inviteEmail}.`)
      setInviteEmail('')
    } else {
      const { message } = await res.json()
      setInviteMsg(message)
    }
    setInviting(false)
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-base font-medium text-gray-900 mb-4">Your profile</h2>
        <form onSubmit={handleSaveName} className="space-y-4">
          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </Field>
          {nameMsg && <p className="text-sm text-gray-600">{nameMsg}</p>}
          <button
            type="submit"
            disabled={savingName}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {savingName ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </section>

      {profile.is_admin && (
        <section>
          <h2 className="text-base font-medium text-gray-900 mb-4">Invite a partner</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <Field label="Email address">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            {inviteMsg && <p className="text-sm text-gray-600">{inviteMsg}</p>}
            <button
              type="submit"
              disabled={inviting}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
```

Create the update-profile API route `app/api/profiles/me/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/users'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const profile = await updateProfile(user.id, { display_name: body.display_name })
    return NextResponse.json(profile)
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Mark yourself as admin in Supabase**

Open Supabase → Table Editor → `profiles`. Find your row and set `is_admin = true`. The invite button will now appear in Settings.

- [ ] **Step 4: Verify in browser**

Visit `/settings`. Change your display name, save. If admin, enter a partner's email and send invite. They should receive a Supabase email; clicking it redirects to `/auth/callback` → `/equipment`.

- [ ] **Step 5: Commit**

```bash
git add app/settings/ app/api/invite/ app/api/profiles/me/
git commit -m "feat: settings page with display name edit and user invite"
```

---

## Task 15: Production Deployment

**Files:**
- No code changes — configuration and deployment steps only

**Interfaces:**
- Produces: live URL on Vercel accessible by all three partners

- [ ] **Step 1: Push to GitHub**

Create a new repository at github.com. Then:

```bash
git remote add origin https://github.com/<your-username>/latitude-equipment.git
git push -u origin main
```

- [ ] **Step 2: Create Vercel project**

Go to https://vercel.com → Add New Project → Import from GitHub → select `latitude-equipment`. Vercel auto-detects Next.js.

- [ ] **Step 3: Set environment variables in Vercel**

In the Vercel project → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL       = (your Supabase project URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY  = (your anon key)
SUPABASE_SERVICE_ROLE_KEY      = (your service role key)
NEXT_PUBLIC_SITE_URL           = https://your-app.vercel.app
```

Update `NEXT_PUBLIC_SITE_URL` in Supabase → Authentication → URL Configuration → Site URL to match your Vercel URL.

- [ ] **Step 4: Deploy**

Click Deploy in Vercel. Wait for build to complete.

Expected: green build, live URL.

- [ ] **Step 5: Smoke test**

Visit the live URL. Log in. Add one item. Assign it. Confirm the assignment history shows. Invite a partner. Have them accept the invite and log in.

- [ ] **Step 6: Final commit**

```bash
git add .env.local.example
git commit -m "chore: update env example with NEXT_PUBLIC_SITE_URL"
git push
```

---

## Self-Review Checklist

- [x] Equipment list with search + filter → Task 8
- [x] Item detail with all fields → Task 9
- [x] Assign item to any partner (incl. "Take it") → Task 9
- [x] Assign item to null (unassigned, standalone items only) → Task 9 — `AssignControl` omits "Unassigned" option when `kitId` is set
- [x] Assignment history per item → Task 9
- [x] Add item (all fields incl. carnet fields) → Task 10
- [x] Delete item (soft delete) → Task 10
- [x] Kits list → Task 11
- [x] Kit detail with item table → Task 12
- [x] Assign kit (transfers all items, overwrites holders) → Task 12
- [x] Individual item assignment from within kit → Task 12
- [x] Add kit with initial holder required → Task 13
- [x] Delete kit (detaches items, doesn't delete them) → Task 13
- [x] Duplicate kit (new item records, serial numbers blank) → Task 13
- [x] Settings: display name edit → Task 14
- [x] Settings: invite partner by email (admin only) → Task 14
- [x] Invite-only registration (no public signup) → Supabase Auth handles this; no signup route exists
- [x] RLS on all tables → Task 2
- [x] Carnet fields on item (value, country_of_origin, weight_kg) → Tasks 6 & 10
