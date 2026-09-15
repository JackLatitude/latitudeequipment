-- Unit numbers become user-settable, and the automatic default fills gaps.
--
-- Two problems with 0008/0009's scheme showed up in real use. First, the
-- number was auto-only — no form field wrote it — so a unit could never be
-- given a chosen number. Second, the default was max(unit_number) + 1 over
-- *all* rows in the name group, soft-deleted ones included, so deleting or
-- renaming a unit burned its number permanently and the next unit jumped to
-- 9, 10 while 1 and 3 sat free forever.

-- Lowest positive number not currently used by a live unit of this model.
-- Soft-deleted rows are ignored: those units are off the shelf, so holding
-- their numbers hostage serves nobody.
create or replace function next_unit_number(p_name text)
returns integer language sql stable as $$
  select coalesce(min(n), 1)
  from generate_series(1, (
    select coalesce(max(unit_number), 0) + 1
    from items
    where lower(trim(name)) = lower(trim(p_name))
      and deleted_at is null
  )) as n
  where not exists (
    select 1 from items
    where lower(trim(name)) = lower(trim(p_name))
      and deleted_at is null
      and unit_number = n
  );
$$;

-- Auto-assignment now only fills in a number the caller left blank. An
-- explicit number always wins, including when the item is renamed in the
-- same write — 0008's rule of "renaming re-assigns" would otherwise silently
-- overwrite a number someone had just typed in.
create or replace function assign_item_unit_number()
returns trigger as $$
begin
  -- Paired items share one number, set by pair_items(). Never touch it.
  if new.paired_item_id is not null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.unit_number is null then
      new.unit_number := next_unit_number(new.name);
    end if;
    return new;
  end if;

  -- Renamed into a different model group, and the caller didn't set a number
  -- themselves: give it the lowest free number in its new group.
  if lower(trim(new.name)) is distinct from lower(trim(old.name))
     and new.unit_number is not distinct from old.unit_number then
    new.unit_number := next_unit_number(new.name);
  end if;
  return new;
end;
$$ language plpgsql;

-- No unique index on (name group, unit_number): pair_items() deliberately
-- gives two live rows the same number. Collisions are rejected in the API
-- layer instead, which can make that exception and explain itself to the user.
