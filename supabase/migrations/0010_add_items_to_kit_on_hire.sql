-- Extends add_items_to_kit so items added to a kit that's already out on an
-- active hire also join that hire, checked out immediately — the kit is
-- physically already in the field, so a new item added to it is too.
-- p_hire_id defaults to null so existing callers (kit not on hire) are
-- unaffected.
create or replace function add_items_to_kit(
  p_kit_id uuid,
  p_item_ids uuid[],
  p_assigned_by uuid,
  p_hire_id uuid default null
)
returns void language plpgsql as $$
declare
  v_holder uuid;
begin
  select current_holder_id into v_holder from kits where id = p_kit_id;
  if v_holder is null then
    raise exception 'Kit not found';
  end if;

  update items
    set kit_id = p_kit_id, current_holder_id = v_holder
    where id = any(p_item_ids) and deleted_at is null;

  insert into assignment_history (item_id, assigned_to_id, assigned_by_id, note)
    select id, v_holder, p_assigned_by, 'Added to kit'
    from items
    where id = any(p_item_ids) and deleted_at is null;

  if p_hire_id is not null then
    insert into hire_items (hire_id, item_id, checked_out_at)
      select p_hire_id, id, now()
      from items
      where id = any(p_item_ids) and deleted_at is null
    on conflict (hire_id, item_id) do update
      set checked_out_at = coalesce(hire_items.checked_out_at, excluded.checked_out_at);
  end if;
end;
$$;
