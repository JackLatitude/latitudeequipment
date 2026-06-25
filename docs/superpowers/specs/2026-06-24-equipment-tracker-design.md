# Latitude Equipment Tracker — Design Spec

**Date:** 2026-06-24  
**Status:** Approved

---

## Overview

A web-based equipment tracking application for Latitude Equipment. Three business partners use it to track all company-owned kit: what exists, who currently has it, and the history of who had what and when. Equipment can be grouped into named "kits" that can be checked out as a batch or item by item.

---

## Users

Three partners, each with an individual email/password account. No public signup — partners are invited by email from within the app. All three have equal permissions. One partner (the account creator) holds the admin role solely for the purpose of inviting users.

Authentication is provided by Supabase Auth. Supabase Row Level Security ensures all data is scoped to the organisation.

---

## Data Model

### Items
Each piece of equipment is a single record:

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | text | e.g. "DJI Inspire 3 — Unit 1" |
| serial_number | text | Optional but recommended |
| category | text | Optional, e.g. "Drone", "Battery", "Lens" |
| notes | text | Optional freetext |
| kit_id | UUID | Nullable FK to Kits — item belongs to at most one kit |
| current_holder_id | UUID | Nullable FK to Users — null means unassigned/in storage |
| value | numeric | Optional — purchase/insured value in GBP, for carnet export |
| country_of_origin | text | Optional — e.g. "China", for carnet export |
| weight_kg | numeric | Optional — weight in kg, for carnet export |
| created_at | timestamp | |

### Kits
A named collection of items. A kit always has a holder — it cannot be unassigned. When a kit is created it must be assigned to one of the three partners immediately.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | text | e.g. "Inspire 3 Travel Kit" |
| description | text | Optional |
| current_holder_id | UUID | Non-nullable FK to Users — a kit always belongs to someone |
| created_at | timestamp | |

### Assignment History
Immutable log of every assignment event:

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| item_id | UUID | FK to Items |
| assigned_to_id | UUID | FK to Users — new holder (null = returned to storage) |
| assigned_by_id | UUID | FK to Users — who performed the assignment |
| assigned_at | timestamp | |
| note | text | Optional context |

Kit-level assignments write one history record per item in the kit.

---

## Features

### Equipment View
- Full list of all items, paginated or scrollable
- Search by name or serial number
- Filter by current holder (any partner, or "unassigned")
- Filter by status (checked out / available)
- Each row shows: name, serial number, kit (if any), current holder
- Click row → Item Detail
- "Add Item" button — any user can add new equipment at any time
- "Delete" action on each item — any user can remove equipment that has been sold or retired; deletion is soft (record retained for history) or with a confirmation prompt

### Item Detail
- All item fields (name, serial, category, notes, kit membership)
- Current holder and status
- **Assign to** control — a dropdown of all three partners plus "Unassigned (in storage)" for standalone items; any user can assign any item to any partner
- "Take it" shortcut button — assigns the item to the current user in one click
- Full assignment history (chronological, most recent first)

### Kits View
- List of all kits, each showing current holder and item count
- Click kit → Kit Detail
- "Add Kit" button — any user can create a new kit; must assign an initial holder on creation
- "Duplicate Kit" action — creates a new kit with the same name (suffixed "— Copy") and new item records copied from the original (same names, categories, notes, and carnet fields) but with serial numbers left blank, ready to be filled in for the newly acquired equipment; the duplicate kit is immediately assigned to the user who duplicated it; the original kit and its items are unaffected

### Kit Detail
- Kit name, description, current holder
- List of all items in the kit, each showing individual current holder
- **Assign kit to** control — dropdown of all three partners; assigns the kit and all its items to the selected partner in one action, overwriting any existing holders; a kit always has a holder, there is no "unassigned" state
- "Take it" shortcut button — assigns the entire kit to the current user in one click
- Individual items within the kit can also be assigned independently from this view or from the Equipment view

### Settings
- Invite a new partner by email (admin only)
- Change own display name
- Change own password

---

## Authentication & Access

- Email/password via Supabase Auth
- Invite-only registration — no public signup route
- All three partners have identical read/write permissions across all equipment and kits
- Admin role (account creator) is limited to: sending invites, revoking access if needed in future
- Supabase RLS policies enforce organisation-level data isolation

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Deployment | Vercel |
| Cost | Free tier throughout — £0 at 3 users |

---

## Out of Scope (v1)

- Mobile native app
- GPS or real-time location tracking
- Push notifications / email alerts on assignment events
- Approval workflows
- Multi-organisation support
- Equipment maintenance scheduling or service records

## Planned Future Features

### Carnet Export
Export a spreadsheet of equipment for ATA Carnet applications. Each row represents one item and includes: name, serial number, value (GBP), country of origin, weight (kg). The fields `value`, `country_of_origin`, and `weight_kg` are included in the Items data model from v1 so data can be captured ahead of this feature being built.
