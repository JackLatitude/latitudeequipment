-- One-off data correction for the DJI Transmission TX group.
--
-- Before 0012 there was no way to choose a unit's number, so two units added
-- on 30 Aug were named "DJI Transmission TX #1" and "DJI Transmission TX #3"
-- to record the number by hand. That put each in its own name group, where
-- both were auto-assigned unit_number 1, and left the real group with 1 and 3
-- missing. A third unit carries a trailing space in its name, which puts it in
-- a different group again and sorts it away from its siblings in the UI.
--
-- The six correctly-named units already hold 2, 4, 5, 6, 7 and 8 — exactly the
-- numbers they should keep. So this does not renumber anything: it moves the
-- two hand-labelled units into the free slots their names already claim, and
-- trims the stray space. Result is a contiguous 1-8 with no unit's number
-- changing meaning. Rows are addressed by serial number, so this touches
-- precisely three units and nothing else.

-- The numbering trigger reacts to name changes, and these statements change
-- name and unit_number together. For the "#1" unit the target number equals
-- the number it already has, which is exactly the case the trigger reads as
-- "caller didn't choose one" — it would reassign and undo the fix.
alter table items disable trigger items_assign_unit_number;

-- "DJI Transmission TX #1" -> the real group, keeping the number 1 it claims.
update items
set name = 'DJI Transmission TX', unit_number = 1
where serial_number = '7LPDL830111772';

-- "DJI Transmission TX #3" -> the real group, taking the free number 3.
update items
set name = 'DJI Transmission TX', unit_number = 3
where serial_number = '4VH3MB1004S1T3';

-- Trailing space in the name; number 6 is already correct and is left alone.
update items
set name = 'DJI Transmission TX'
where serial_number = '7LPDL83011D2C9';

alter table items enable trigger items_assign_unit_number;
