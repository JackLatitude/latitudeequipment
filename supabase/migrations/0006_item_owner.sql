-- Owner: the permanent owner of an item — the company (default) or an
-- individual partner. Distinct from current_holder_id, which tracks the
-- item's changing location/holder. The not-null default makes every
-- existing row correct with no backfill.
alter table items
  add column owner text not null default 'Latitude Equipment';
