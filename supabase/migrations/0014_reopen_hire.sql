-- Reopening a returned hire (2026-09-15)
--
-- The hire lifecycle was one-way: draft -> active -> returned. A hire checked
-- out and back in by mistake was frozen forever, because editing the details,
-- adding items and the Edit button are all gated on status = 'draft'. The only
-- recovery was to delete the hire and rebuild it by hand.
--
-- reopen_hire puts a returned hire back into draft in a single transaction:
-- the checkout/check-in stamps are cleared so the items read as never
-- despatched, which is what getActiveHireItemsByItemIds and the availability
-- views rely on. Mirrors the checkout_hire / checkin_hire pattern from 0004.
create or replace function reopen_hire(p_hire_id uuid)
returns void language plpgsql as $$
begin
  update hire_items
    set checked_out_at = null,
        checked_in_at = null,
        condition_in = null
    where hire_id = p_hire_id;
  update hires set status = 'draft' where id = p_hire_id;
end;
$$;
