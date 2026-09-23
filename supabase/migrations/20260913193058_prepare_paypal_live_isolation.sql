begin;
alter table private.paypal_operations drop constraint paypal_operations_environment_check;
alter table private.paypal_operations add constraint paypal_operations_environment_check check (environment in ('sandbox','live'));
alter table private.paypal_operations add constraint paypal_operations_usd_check check (price->>'currency' is not distinct from 'USD');
alter table private.paypal_operations drop constraint paypal_operations_provider_subscription_id_key;
alter table private.paypal_operations drop constraint paypal_operations_provider_order_id_key;
create unique index paypal_subscription_provider_identity on private.paypal_operations(provider,environment,provider_subscription_id) where provider_subscription_id is not null;
create unique index paypal_order_provider_identity on private.paypal_operations(provider,environment,provider_order_id) where provider_order_id is not null;
alter table private.paypal_events add column provider text not null default 'paypal' check(provider='paypal'),
  add column environment text not null default 'sandbox' check(environment in ('sandbox','live'));
alter table private.paypal_events drop constraint paypal_events_pkey;
alter table private.paypal_events add primary key(provider,environment,event_id);
create or replace function private.paypal_operation(p_action text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_sub public.subscriptions;
  v_op private.paypal_operations;
  v_id uuid;
  v_resource text;
  v_status text;
  v_paid timestamptz;
  v_end timestamptz;
  v_seen timestamptz;
begin
  if p_data->>'environment' is null or p_data->>'environment' not in ('sandbox','live') then raise exception 'Missing PayPal environment'; end if;
  if p_action = 'lookup' then
    select * into v_op from private.paypal_operations
      where environment = p_data->>'environment' and (subscription_id = nullif(p_data->>'subscription_id','')::uuid
         or external_reference = nullif(p_data->>'reference','')::uuid
         or provider_subscription_id = p_data->>'resource_id'
         or provider_order_id = p_data->>'resource_id');
    return to_jsonb(v_op);
  end if;
  v_id := (p_data->>'subscription_id')::uuid;
  select * into v_sub from public.subscriptions where id = v_id for update;
  if not found then raise exception 'Unknown subscription'; end if;
  select * into v_op from private.paypal_operations where subscription_id = v_id for update;
  if v_op.subscription_id is not null and v_op.environment <> p_data->>'environment' then raise exception 'PayPal environment mismatch'; end if;
  if p_action = 'reserve' then
    if v_sub.professional_profile_id is distinct from (p_data->>'profile_id')::uuid
       or v_sub.status <> 'PENDING_PAYMENT'
       or v_sub.plan_snapshot is distinct from p_data->'snapshot'
       or v_sub.plan_snapshot->>'pricing_status' is distinct from 'PUBLISHED'
       or (v_sub.provider is not null and v_sub.provider <> 'paypal') then
      raise exception 'Checkout ownership, status or snapshot mismatch';
    end if;
    if v_op.subscription_id is null then
      if p_data->'price'->>'currency' is distinct from 'USD'
         or coalesce((p_data->'price'->>'amount')::numeric,0) <= 0 then raise exception 'Invalid price'; end if;
      if not ((v_sub.plan_snapshot->>'code' = 'PROFESSIONAL_MONTHLY' and v_sub.plan_snapshot->>'payment_model' = 'RECURRING')
        or (v_sub.plan_snapshot->>'code' = 'PROFESSIONAL_ANNUAL_UPFRONT' and v_sub.plan_snapshot->>'payment_model' = 'ONE_TIME' and v_sub.plan_snapshot->>'billing_interval' = 'YEAR')) then
        raise exception 'Unsupported plan';
      end if;
      update public.subscriptions set provider = 'paypal', updated_at = now() where id = v_id;
      insert into private.paypal_operations(subscription_id, payment_model, price, environment)
        values(v_id, v_sub.plan_snapshot->>'payment_model', p_data->'price', p_data->>'environment') returning * into v_op;
    end if;
    return to_jsonb(v_op);
  end if;
  if v_op.subscription_id is null or v_sub.provider is distinct from 'paypal' then raise exception 'Unknown PayPal operation'; end if;
  if p_action = 'attach' then
    v_resource := p_data->>'resource_id';
    if v_resource is null or v_resource !~ '^[A-Za-z0-9-]{1,80}$' then raise exception 'Invalid resource'; end if;
    if coalesce(v_op.provider_subscription_id,v_op.provider_order_id,v_resource) <> v_resource then raise exception 'Resource cannot change'; end if;
    update private.paypal_operations set
      provider_subscription_id = case when payment_model = 'RECURRING' then v_resource end,
      provider_order_id = case when payment_model = 'ONE_TIME' then v_resource end,
      updated_at = now() where subscription_id = v_id;
    return '{}'::jsonb;
  end if;
  if p_action <> 'event' then raise exception 'Unknown action'; end if;
  if coalesce(v_op.provider_subscription_id,v_op.provider_order_id) is distinct from p_data->>'resource_id' then raise exception 'Resource mismatch'; end if;
  v_seen := (p_data->>'verified_at')::timestamptz;
  if v_seen is null or v_seen > now() + interval '1 minute' then raise exception 'Invalid verification timestamp'; end if;
  insert into private.paypal_events(event_id,subscription_id,event_type,environment)
    values(p_data->>'event_id',v_id,p_data->>'event_type',p_data->>'environment') on conflict do nothing;
  if not found then return '{"duplicate":true}'::jsonb; end if;
  if v_op.verified_at is not null and v_seen <= v_op.verified_at then return '{"stale":true}'::jsonb; end if;
  v_status := p_data->>'status';
  if v_status not in ('PENDING_PAYMENT','ACTIVE','PAST_DUE','PAUSED','CANCELED','EXPIRED') then raise exception 'Invalid state'; end if;
  v_paid := nullif(p_data->>'paid_at','')::timestamptz;
  v_end := nullif(p_data->>'period_end','')::timestamptz;
  if v_status = 'ACTIVE' and (v_paid is null or v_end is null or v_end <= v_paid or v_end <= now()
    or p_data->>'currency' is distinct from v_op.price->>'currency'
    or (p_data->>'amount')::numeric is distinct from (v_op.price->>'amount')::numeric) then raise exception 'Unverified payment'; end if;
  -- Terminal contracts never revive from late approval/payment notifications.
  if v_sub.status not in ('CANCELED','EXPIRED') then
    update public.subscriptions set status = v_status,
      current_period_start = case when v_status = 'ACTIVE' then v_paid else current_period_start end,
      current_period_end = case when v_status = 'ACTIVE' then v_end else current_period_end end,
      last_payment_at = case when v_status = 'ACTIVE' then greatest(last_payment_at,v_paid) else last_payment_at end,
      next_payment_at = case when v_status = 'ACTIVE' and v_op.payment_model = 'RECURRING' then v_end else null end,
      updated_at = now() where id = v_id;
  end if;
  update private.paypal_operations set status = p_data->>'provider_status', verified_at = v_seen, updated_at = now() where subscription_id = v_id;
  return '{}'::jsonb;
end;
$$;
commit;
