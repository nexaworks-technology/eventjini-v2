-- A provider webhook can mark a delivery failed after the send; the broadcast's
-- overall status must follow (sent / partial_failed / failed).

create or replace function public.apply_email_event(
  p_provider_message_id text,
  p_event text,
  p_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.email_deliveries%rowtype;
  v_target public.email_delivery_status;
begin
  v_target := case p_event
    when 'email.delivered' then 'delivered'
    when 'email.bounced' then 'bounced'
    when 'email.complained' then 'complained'
    when 'email.failed' then 'failed'
    else null end;
  if v_target is null then
    return jsonb_build_object('updated', false, 'reason', 'ignored_event');
  end if;

  select * into d from public.email_deliveries
  where provider_message_id = p_provider_message_id for update;
  if not found then
    return jsonb_build_object('updated', false, 'reason', 'unknown_message');
  end if;
  if d.status = v_target then
    return jsonb_build_object('updated', false, 'reason', 'duplicate');
  end if;

  if v_target = 'delivered' and d.status <> 'sent' then
    return jsonb_build_object('updated', false, 'reason', 'out_of_order');
  end if;
  if v_target <> 'delivered' and d.status not in ('sent', 'delivered') then
    return jsonb_build_object('updated', false, 'reason', 'out_of_order');
  end if;

  update public.email_deliveries
  set status = v_target,
      delivered_at = case when v_target = 'delivered' then coalesce(p_at, now()) else delivered_at end,
      bounced_at = case when v_target = 'bounced' then coalesce(p_at, now()) else bounced_at end,
      last_error = case when v_target in ('bounced', 'complained', 'failed')
                        then 'Provider reported: ' || p_event else last_error end
  where id = d.id;

  if d.broadcast_id is not null then
    perform public.refresh_broadcast_status(d.broadcast_id);
  end if;
  if v_target = 'failed' and d.automation_run_id is not null then
    update public.automation_runs
    set status = 'failed', executed_at = now(), result = 'Provider reported: ' || p_event
    where id = d.automation_run_id;
  end if;

  return jsonb_build_object('updated', true);
end;
$$;

revoke all on function public.apply_email_event(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_email_event(text, text, timestamptz) to service_role;

-- Repair broadcasts whose status went stale before this fix.
select public.refresh_broadcast_status(id) from public.event_broadcasts;
