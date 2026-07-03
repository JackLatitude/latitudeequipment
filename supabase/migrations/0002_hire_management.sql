-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

-- Hires
create table hires (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  title text not null,
  client_id uuid not null references clients(id),
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'returned')),
  notes text,
  created_by_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Hire items (one row per physical item on a hire)
create table hire_items (
  id uuid primary key default gen_random_uuid(),
  hire_id uuid not null references hires(id) on delete cascade,
  item_id uuid not null references items(id),
  checked_out_at timestamptz,
  checked_in_at timestamptz,
  condition_out text,
  condition_in text,
  unique (hire_id, item_id)
);

-- Auto-generate LAT-NNN ref on insert
create or replace function generate_hire_ref()
returns trigger as $$
declare
  next_num int;
begin
  select coalesce(max((substring(ref from 5))::int), 0) + 1
    into next_num
    from hires
    where ref ~ '^LAT-[0-9]+$';
  new.ref := 'LAT-' || lpad(next_num::text, 3, '0');
  return new;
end;
$$ language plpgsql;

create trigger hires_set_ref
  before insert on hires
  for each row
  when (new.ref is null or new.ref = '')
  execute function generate_hire_ref();

-- RLS: match existing tables (authenticated users full access)
alter table clients enable row level security;
alter table hires enable row level security;
alter table hire_items enable row level security;

create policy "Authenticated full access" on clients
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on hires
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on hire_items
  for all to authenticated using (true) with check (true);
