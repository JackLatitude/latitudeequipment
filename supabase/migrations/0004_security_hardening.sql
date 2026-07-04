-- Security hardening (2026-07-04 review)

-- 1. Profiles: replace the blanket "authenticated can do anything" policy.
--    Users may read all profiles but update only their own row, and may not
--    change is_admin (enforced by trigger so it also covers column updates).
drop policy "auth_all_profiles" on profiles;

create policy "profiles_select" on profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert/delete policies: profile rows are created by the
-- handle_new_user() security-definer trigger and removed by the
-- auth.users cascade, both of which bypass RLS.

create or replace function prevent_is_admin_change()
returns trigger language plpgsql security definer as $$
begin
  if new.is_admin is distinct from old.is_admin then
    -- auth.uid() is null in service-role / server contexts; allow those.
    if auth.uid() is not null
       and not exists (select 1 from profiles where id = auth.uid() and is_admin) then
      raise exception 'Only admins can change is_admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_admin on profiles;
create trigger profiles_protect_is_admin
  before update on profiles
  for each row execute function prevent_is_admin_change();

-- 2. Atomic hire transitions: single transaction instead of two client calls.
create or replace function checkout_hire(p_hire_id uuid)
returns void language plpgsql as $$
begin
  update hire_items set checked_out_at = now() where hire_id = p_hire_id;
  update hires set status = 'active' where id = p_hire_id;
end;
$$;

create or replace function checkin_hire(p_hire_id uuid)
returns void language plpgsql as $$
begin
  update hire_items set checked_in_at = now()
    where hire_id = p_hire_id and checked_in_at is null;
  update hires set status = 'returned' where id = p_hire_id;
end;
$$;

-- 3. Atomic kit assignment: kit holder + item holders + history in one tx.
create or replace function assign_kit(
  p_kit_id uuid,
  p_assigned_to uuid,
  p_assigned_by uuid
)
returns void language plpgsql as $$
begin
  update kits set current_holder_id = p_assigned_to where id = p_kit_id;
  update items set current_holder_id = p_assigned_to
    where kit_id = p_kit_id and deleted_at is null;
  insert into assignment_history (item_id, assigned_to_id, assigned_by_id, note)
    select id, p_assigned_to, p_assigned_by, 'Kit assignment'
    from items where kit_id = p_kit_id and deleted_at is null;
end;
$$;
