-- The Latitude team member managing this hire (distinct from created_by_id).
alter table hires
  add column latitude_contact_id uuid references profiles(id);
