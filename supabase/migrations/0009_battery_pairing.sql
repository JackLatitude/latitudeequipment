-- Battery pairing (TB51 Battery only, for now): two items that always move
-- and check out together, and share one identification number rather than
-- each getting its own. Mutual link, kept in sync by pair_items()/
-- unpair_item() rather than a trigger, since pairing is a rare explicit
-- action, not a side effect of an unrelated write.
alter table items add column paired_item_id uuid references items(id);

-- A paired item's number is set once by pairing and must not drift back to
-- the auto-increment sequence if it's later renamed.
create or replace function assign_item_unit_number()
returns trigger as $$
begin
  if new.paired_item_id is not null then
    return new;
  end if;
  if tg_op = 'INSERT' or lower(trim(new.name)) is distinct from lower(trim(old.name)) then
    select coalesce(max(unit_number), 0) + 1
      into new.unit_number
      from items
      where lower(trim(name)) = lower(trim(new.name));
  end if;
  return new;
end;
$$ language plpgsql;

-- Pairs both items to each other and gives them the same identification
-- number (the lower of the two, so existing numbering elsewhere is undisturbed).
create or replace function pair_items(p_item_a uuid, p_item_b uuid)
returns void language plpgsql as $$
declare
  v_number integer;
begin
  if p_item_a = p_item_b then
    raise exception 'Cannot pair an item with itself';
  end if;

  select least(a.unit_number, b.unit_number) into v_number
  from items a, items b
  where a.id = p_item_a and b.id = p_item_b;

  update items set paired_item_id = p_item_b, unit_number = v_number where id = p_item_a;
  update items set paired_item_id = p_item_a, unit_number = v_number where id = p_item_b;
end;
$$;

-- Breaks a pairing. The shared number is left on both items — pairing is a
-- one-time setup for permanently-paired equipment, not something reshuffled
-- often, so there's no "correct" number to fall back to on unpair.
create or replace function unpair_item(p_item_id uuid)
returns void language plpgsql as $$
declare
  v_partner uuid;
begin
  select paired_item_id into v_partner from items where id = p_item_id;
  if v_partner is not null then
    update items set paired_item_id = null where id = v_partner;
  end if;
  update items set paired_item_id = null where id = p_item_id;
end;
$$;
