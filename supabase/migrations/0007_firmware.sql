-- Per-unit installed firmware (optional; only meaningful for tracked categories).
alter table items add column firmware_version text;

-- Per-model latest firmware the manufacturer offers. One row per model,
-- matched to items by items.name. source_url + last_checked_at are unused by
-- the manual MVP but are the exact fields Phase-2 automation will write to.
create table firmware_targets (
  id uuid default gen_random_uuid() primary key,
  model text not null unique,
  manufacturer text,
  latest_version text,
  source_url text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table firmware_targets enable row level security;

create policy "auth_all_firmware_targets" on firmware_targets for all to authenticated
  using (true) with check (true);
