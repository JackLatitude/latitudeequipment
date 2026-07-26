-- Per-name-group unit numbers (e.g. "Sony FX6 #3") so items sharing a name
-- can be told apart at a glance, not just by serial number. Assigned once
-- at creation and never recalculated when siblings are deleted/renamed —
-- a physical label written on the unit should never silently go stale.
alter table items add column unit_number integer;

-- Backfill: number existing items within each name group in creation order.
with numbered as (
  select id, row_number() over (
    partition by lower(trim(name))
    order by created_at, id
  ) as rn
  from items
)
update items set unit_number = numbered.rn
from numbered
where items.id = numbered.id;

-- Going forward: assign the next number in the item's name group on insert,
-- and re-assign into the new group if an item is renamed to a different
-- name. Never touches any other item's number (no group-wide renumbering).
create or replace function assign_item_unit_number()
returns trigger as $$
begin
  if tg_op = 'INSERT' or lower(trim(new.name)) is distinct from lower(trim(old.name)) then
    select coalesce(max(unit_number), 0) + 1
      into new.unit_number
      from items
      where lower(trim(name)) = lower(trim(new.name));
  end if;
  return new;
end;
$$ language plpgsql;

create trigger items_assign_unit_number
before insert or update of name on items
for each row execute function assign_item_unit_number();
