-- Migration 0010 added a p_hire_id parameter to add_items_to_kit, but
-- `create or replace function` only replaces a function when the parameter
-- list matches exactly — a different signature creates a second overload
-- instead. Drop the superseded 3-argument version so only the 4-argument
-- one (with p_hire_id default null) remains.
drop function if exists add_items_to_kit(uuid, uuid[], uuid);
