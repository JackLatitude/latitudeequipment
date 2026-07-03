# Hire Management — Design Spec

**Date:** 2026-07-03
**Status:** Approved

---

## Goal

Add hire management to the Latitude Equipment tracker: create hires for clients, build item lists from existing inventory (kits and loose items), track check-in/check-out at item level, and generate a branded A4 packing slip PDF.

---

## Scope

Three new sub-systems, tightly integrated with the existing equipment tracker:

1. **Client management** — lightweight CRM, lives within `/hires`
2. **Hire management** — lifecycle from draft → active → returned
3. **PDF generation** — branded packing slip via Python + ReportLab

Hire management does NOT include pricing, invoicing, or payment tracking.

---

## Data Model

### `clients` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | Company name or individual's full name |
| `contact_name` | text | Named contact at a company; null for individuals |
| `email` | text | |
| `phone` | text | |
| `address` | text | Multi-line, used on PDF info block |
| `notes` | text | |
| `created_at` | timestamptz | |

### `hires` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `ref` | text UNIQUE NOT NULL | Auto-generated on insert via Postgres function: `LAT-` + zero-padded count of existing hires + 1, e.g. `LAT-001`, `LAT-002` |
| `title` | text NOT NULL | e.g. "Nike Shoot – July 2026" |
| `client_id` | uuid FK → clients | |
| `start_date` | date | |
| `end_date` | date | |
| `status` | text | `draft` \| `active` \| `returned` |
| `notes` | text | |
| `created_by_id` | uuid FK → profiles | |
| `created_at` | timestamptz | |

### `hire_items` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `hire_id` | uuid FK → hires | |
| `item_id` | uuid FK → items | |
| `checked_out_at` | timestamptz | null until checked out |
| `checked_in_at` | timestamptz | null until returned |
| `condition_out` | text | Optional note at checkout |
| `condition_in` | text | Optional note on return |

No separate `hire_kits` table. Adding a kit to a hire inserts all of its current items into `hire_items` individually. This keeps check-in/out at item level without extra complexity.

---

## Hire Status Flow

```
draft ──→ active ──→ returned
```

- **`draft`** — hire is being built. Items can be added and removed. PDF is a preview.
- **`active`** — checked out. All items get `checked_out_at` set. Items show "On hire" across the app. Item list is locked (no add/remove).
- **`returned`** — hire closed. All items have `checked_in_at` set. Read-only.

Transition triggers:
- `draft → active`: user clicks "Check out" on the hire detail page. All `hire_items` get `checked_out_at = now()`.
- `active → returned`: "Return all" sets `checked_in_at = now()` on all outstanding items. Individual item check-in is also available before the hire closes.

---

## Item Display Changes

### Equipment list
Items on an active hire get a small `"On hire"` chip next to their name in both the mobile card and desktop table row.

### Item detail page
When an item has an active `hire_items` record, show a line near the top:
> **On hire** — Nike Shoot · LAT-001 (link to `/hires/[id]`)

This sits alongside the existing current holder display, not replacing it.

---

## Pages & Navigation

### Navigation
Add **Hires** as a fourth entry:
- Desktop nav: `Equipment · Kits · Hires · Settings`
- Mobile bottom tab bar: Equipment · Kits · Hires · Settings (four tabs)

### Route map

```
/hires                        Hire list
/hires/new                    Create hire
/hires/[id]                   Hire detail (main workflow hub)
/hires/[id]/edit              Edit hire metadata
/hires/clients                Client list
/hires/clients/new            Add client
/hires/clients/[id]           Client detail + hire history
/hires/clients/[id]/edit      Edit client
```

### Hire list (`/hires`)
Grouped by status: Active → Draft → Returned. Each card shows: title, ref, client name, dates, item count.

### Hire detail (`/hires/[id]`)
The single screen for the full hire lifecycle.

**Draft state:**
- Hire metadata (title, client, dates)
- Add items section: search inventory, add individual items or whole kits (all kit items are added)
- Items list: shows name, serial, category; items can be removed
- "Preview PDF" button — generates and downloads the document
- "Check out →" button — transitions to active, locks item list

**Active state:**
- Hire metadata (read-only)
- Items list with `checked_out_at` timestamp shown; each item has a "Check in" button
- "Return all" button — checks in all outstanding items and closes the hire
- "Download PDF" button — final version with check-out dates populated

**Returned state:**
- Full summary, all timestamps shown
- "Download PDF" — final record

---

## API Routes

```
POST   /api/hires                              Create hire
PATCH  /api/hires/[id]                        Update metadata
POST   /api/hires/[id]/checkout               Transition draft → active
POST   /api/hires/[id]/items                  Add item(s) to hire
DELETE /api/hires/[id]/items/[itemId]         Remove item from hire (draft only)
POST   /api/hires/[id]/items/[itemId]/checkin Check individual item in
POST   /api/hires/[id]/checkin                Return all + close hire
GET    /api/hires/[id]/pdf                    Generate and stream PDF

POST   /api/clients                           Create client
PATCH  /api/clients/[id]                      Update client
DELETE /api/clients/[id]                      Delete client — returns 409 if client has any hires
```

---

## PDF Document

Generated server-side with Python + ReportLab, following the `latitude-brand-docs` skill pattern. Served from `/api/hires/[id]/pdf`, downloaded directly — no file storage.

### Structure (A4)

**Header bar** — `logo_white_full_on_black.png`, brand-red top rule (3pt), same as existing brand document templates.

**Info block** — two-column label/value table, red rule above first row:
- Hire Ref · Title · Client · Contact · Email · Phone · Hire Dates

**Items table** — columns: `Item | Serial No. | Category | Out ✓ | In ✓`
- Out ✓ and In ✓ are empty pen-mark boxes
- Alternating light-grey rows, red rule above header row
- Cells use `Paragraph` objects for text wrapping

**Signature block** — two side-by-side boxes:
- Left: "Checked out by" — Name / Signature / Date
- Right: "Received by (Client)" — Name / Signature / Date

**Footer** — `Latitude Equipment | latitudeequipment.com`, red rule above, page number right-aligned.

### Draft vs. final
- **Draft (preview):** info block shows planned dates; Out/In date columns blank.
- **Active/Returned (final):** `checked_out_at` date shown in info block; checked-in items have the In ✓ box ticked (a ✓ character).

---

## Integration with Existing System

- The existing `assignments` / `current_holder` system is unchanged. Hires are a separate layer.
- Item detail page gains a hire status line (read from `hire_items` join).
- Equipment list gains an "On hire" chip (read from active `hire_items`).
- The `latitude-brand-docs` Python pipeline is reused for PDF generation; the script lives at `scripts/generate-hire-pdf.py`.

---

## Out of Scope

- Pricing, invoicing, or payment tracking
- Client portal / external access
- Email sending
- Damage reporting beyond free-text condition notes
- Hire templates or repeated hires
