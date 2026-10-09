-- Performance indexes. Until now the schema had none beyond primary keys and
-- unique constraints, and Postgres does not index foreign keys on its own, so
-- every kit / holder / history / hire lookup was a sequential scan. Nothing
-- here changes behaviour; all statements are idempotent.

-- Live items by kit (kit detail page, kit item counts, add_items_to_kit).
create index if not exists items_kit_id_live_idx
  on items (kit_id) where deleted_at is null;

-- Live items in list order (equipment list, loose items, getItems ordering).
create index if not exists items_live_name_unit_idx
  on items (name, unit_number) where deleted_at is null;

-- Holder filter on the equipment list, and FK checks when a profile changes.
create index if not exists items_current_holder_id_idx on items (current_holder_id);

-- FK used by pairing (pair_items / unpair_item).
create index if not exists items_paired_item_id_idx
  on items (paired_item_id) where paired_item_id is not null;

-- Equipment search is `name ILIKE '%q%' OR serial_number ILIKE '%q%'`, and the
-- scanner does case-insensitive serial lookups. A btree can't serve a leading
-- wildcard; trigram GIN indexes can serve both.
-- Schema-qualified: the migration runner's search_path doesn't include
-- `extensions`, so a bare gin_trgm_ops isn't found.
create extension if not exists pg_trgm with schema extensions;
create index if not exists items_name_trgm_idx
  on items using gin (name extensions.gin_trgm_ops) where deleted_at is null;
create index if not exists items_serial_trgm_idx
  on items using gin (serial_number extensions.gin_trgm_ops) where deleted_at is null;

-- Item detail page: history for one item, newest first.
create index if not exists assignment_history_item_assigned_at_idx
  on assignment_history (item_id, assigned_at desc);

-- hire_items(hire_id, item_id) is already covered by the unique constraint;
-- lookups by item alone (on-hire badges, item deletes) need their own index.
create index if not exists hire_items_item_id_idx on hire_items (item_id);

-- "What's out right now" — checked out, not yet back.
create index if not exists hire_items_outstanding_idx
  on hire_items (item_id)
  where checked_out_at is not null and checked_in_at is null;

-- Client detail page (hire history) and the delete-client guard.
create index if not exists hires_client_id_created_at_idx
  on hires (client_id, created_at desc);

-- Hires list / dashboard filter by status, newest first.
create index if not exists hires_status_created_at_idx
  on hires (status, created_at desc);

-- Remaining FKs to profiles, so profile updates/deletes don't scan.
create index if not exists kits_current_holder_id_idx on kits (current_holder_id);
create index if not exists hires_latitude_contact_id_idx on hires (latitude_contact_id);
create index if not exists hires_created_by_id_idx on hires (created_by_id);
create index if not exists assignment_history_assigned_to_id_idx on assignment_history (assigned_to_id);
create index if not exists assignment_history_assigned_by_id_idx on assignment_history (assigned_by_id);
