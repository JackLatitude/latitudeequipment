-- Profiles: mirrors auth.users, stores display names
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Kits: always has a holder
create table kits (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  current_holder_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Items: standalone or belonging to a kit
create table items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  serial_number text,
  category text,
  notes text,
  kit_id uuid references kits(id) on delete set null,
  current_holder_id uuid references profiles(id) on delete set null,
  value numeric,
  country_of_origin text,
  weight_kg numeric,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Assignment history: immutable log
create table assignment_history (
  id uuid default gen_random_uuid() primary key,
  item_id uuid not null references items(id),
  assigned_to_id uuid references profiles(id) on delete set null,
  assigned_by_id uuid not null references profiles(id),
  assigned_at timestamptz not null default now(),
  note text
);

-- RLS: all authenticated users have full access
alter table profiles enable row level security;
alter table kits enable row level security;
alter table items enable row level security;
alter table assignment_history enable row level security;

create policy "auth_all_profiles" on profiles for all to authenticated
  using (true) with check (true);

create policy "auth_all_kits" on kits for all to authenticated
  using (true) with check (true);

create policy "auth_all_items" on items for all to authenticated
  using (true) with check (true);

create policy "auth_select_history" on assignment_history for select to authenticated
  using (true);

create policy "auth_insert_history" on assignment_history for insert to authenticated
  with check (true);

-- Trigger: auto-create profile when a user accepts an invite
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
