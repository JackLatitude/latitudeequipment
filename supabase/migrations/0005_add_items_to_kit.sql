-- Atomic bulk-add of loose items to a kit: sets kit_id + the kit's holder on
-- every item and writes one history row each, in a single transaction.
create or replace function add_items_to_kit(
  p_kit_id uuid,
  p_item_ids uuid[],
  p_assigned_by uuid
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
end;
$$;
