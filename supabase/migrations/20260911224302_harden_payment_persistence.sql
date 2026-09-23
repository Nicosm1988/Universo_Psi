begin;

-- Forward-only correction. Historical provider records are retained; unknown
-- legacy accounts stay NULL and must be reconciled from provider evidence.
drop index public.subscriptions_provider_subscription_idx;
create unique index subscriptions_provider_subscription_idx
  on public.subscriptions(provider, provider_account, provider_subscription_id)
  where provider_subscription_id is not null;

alter table private.subscription_events
  add column provider_account text check (provider_account in ('personal', 'company')),
  add column provider_resource_id text;
update private.subscription_events e set provider_account = s.provider_account
from public.subscriptions s where s.id = e.subscription_id;
alter table private.subscription_events
  drop constraint subscription_events_provider_external_event_id_key;
create unique index subscription_events_provider_identity_idx
  on private.subscription_events(provider, provider_account, event_type, provider_resource_id, external_event_id)
  nulls not distinct;

alter table private.payment_customers
  add column id uuid not null default gen_random_uuid(),
  add column provider_account text check (provider_account in ('personal', 'company')),
  drop constraint payment_customers_pkey,
  drop constraint payment_customers_provider_external_customer_id_key,
  add primary key (id),
  add unique nulls not distinct (professional_profile_id, provider, provider_account),
  add unique nulls not distinct (provider, provider_account, external_customer_id);

create table private.subscription_payment_state (
  subscription_id uuid primary key references public.subscriptions(id) on delete restrict,
  checkout_reserved_at timestamptz,
  preapproval_updated_at timestamptz,
  payment_updated_at timestamptz
);
create table private.subscription_payment_receipts (
  provider text not null check (provider = 'MERCADO_PAGO'),
  provider_account text not null check (provider_account in ('personal', 'company')),
  provider_payment_id text not null,
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  status text not null,
  paid_at timestamptz,
  provider_updated_at timestamptz not null,
  primary key (provider, provider_account, provider_payment_id)
);
create index subscription_payment_receipts_subscription_idx
  on private.subscription_payment_receipts(subscription_id);

alter table private.subscription_payment_state enable row level security;
alter table private.subscription_payment_state force row level security;
alter table private.subscription_payment_receipts enable row level security;
alter table private.subscription_payment_receipts force row level security;
alter table private.plan_provider_mappings enable row level security;
alter table private.plan_provider_mappings force row level security;
revoke all on private.subscription_payment_state, private.subscription_payment_receipts,
  private.plan_provider_mappings, private.subscription_events, private.payment_customers
  from public, anon, authenticated;

create or replace function private.select_professional_plan(p_profile_id uuid, p_plan_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_subscription_id uuid;
  v_snapshot jsonb;
begin
  if (select auth.uid()) is null or not private.owns_professional_profile(p_profile_id) then
    raise exception 'Not authorized for this profile' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted' using errcode = '42501';
  end if;

  perform 1 from public.professional_profiles where id = p_profile_id for update;

  select * into v_plan from public.plans where code = upper(p_plan_code) and is_active;
  if not found then
    raise exception 'Unknown or inactive plan' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.subscriptions
    where professional_profile_id = p_profile_id and status in ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED')
  ) then
    raise exception 'Active subscriptions require the billing change workflow' using errcode = '22023';
  end if;

  v_snapshot := jsonb_build_object(
    'code', v_plan.code, 'name', v_plan.name, 'price_amount', v_plan.price_amount,
    'currency', v_plan.currency, 'billing_interval', v_plan.billing_interval,
    'pricing_status', v_plan.pricing_status,
    'payment_model', v_plan.payment_model, 'commitment_cycles', v_plan.commitment_cycles,
    'grace_period_days', v_plan.grace_period_days
  );

  select id into v_subscription_id
  from public.subscriptions
  where professional_profile_id = p_profile_id and status = 'PENDING_PAYMENT'
  for update;

  if v_subscription_id is null then
    insert into public.subscriptions (
      professional_profile_id, plan_id, status, lead_quota_snapshot,
      ranking_boost_snapshot, plan_snapshot, commitment_cycles
    ) values (
      p_profile_id, v_plan.id, 'PENDING_PAYMENT', v_plan.monthly_lead_quota,
      v_plan.ranking_boost_points, v_snapshot, v_plan.commitment_cycles
    ) returning id into v_subscription_id;
  else
    if exists (
      select 1 from public.subscriptions s
      where s.id = v_subscription_id and s.provider is not null
    ) then
      if exists (select 1 from public.subscriptions where id = v_subscription_id and plan_id = v_plan.id) then
        return v_subscription_id;
      end if;
      raise exception 'A reserved checkout cannot change plan' using errcode = '22023';
    end if;
    update public.subscriptions
    set plan_id = v_plan.id,
        lead_quota_snapshot = v_plan.monthly_lead_quota,
        ranking_boost_snapshot = v_plan.ranking_boost_points,
        plan_snapshot = v_snapshot,
        commitment_cycles = v_plan.commitment_cycles,
        updated_at = statement_timestamp()
    where id = v_subscription_id;
  end if;

  return v_subscription_id;
end;
$$;

revoke all on function private.select_professional_plan(uuid, text) from public, anon, authenticated;
grant execute on function private.select_professional_plan(uuid, text) to authenticated, service_role;

create or replace function public.select_professional_plan(p_profile_id uuid, p_plan_code text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.select_professional_plan(p_profile_id, p_plan_code); $$;

revoke all on function public.select_professional_plan(uuid, text) from public, anon;
grant execute on function public.select_professional_plan(uuid, text) to authenticated, service_role;

-- A permanent reservation prevents a second POST after an ambiguous timeout.
-- Reattempts recover the resource by external_reference; release requires an
-- operator to prove no resource exists. There is deliberately no timer expiry.
create function private.begin_subscription_checkout(
  p_subscription_id uuid, p_provider_account text, p_expected_plan_snapshot jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_sub public.subscriptions; v_claimed boolean;
begin
  if p_provider_account is null or p_provider_account not in ('personal', 'company') then
    raise exception 'Invalid provider account' using errcode = '22023';
  end if;
  select * into v_sub from public.subscriptions where id = p_subscription_id for update;
  if not found or v_sub.status <> 'PENDING_PAYMENT' then
    raise exception 'Subscription is not pending' using errcode = '22023';
  end if;
  if p_expected_plan_snapshot is null or v_sub.plan_snapshot <> p_expected_plan_snapshot
     or v_sub.plan_snapshot->>'pricing_status' is distinct from 'PUBLISHED'
     or coalesce((v_sub.plan_snapshot->>'price_amount')::numeric, 0) <= 0 then
    raise exception 'Checkout snapshot is not approved or has changed' using errcode = '22023';
  end if;
  if v_sub.provider_account is not null and v_sub.provider_account <> p_provider_account then
    raise exception 'Provider account cannot change' using errcode = '22023';
  end if;
  if v_sub.provider_subscription_id is not null then return false; end if;
  insert into private.subscription_payment_state(subscription_id, checkout_reserved_at)
  values (p_subscription_id, statement_timestamp())
  on conflict (subscription_id) do update set checkout_reserved_at = excluded.checkout_reserved_at
    where subscription_payment_state.checkout_reserved_at is null
  returning true into v_claimed;
  update public.subscriptions set provider = 'MERCADO_PAGO', provider_account = p_provider_account
  where id = p_subscription_id;
  return coalesce(v_claimed, false);
end;
$$;
create function public.begin_subscription_checkout(
  p_subscription_id uuid, p_provider_account text, p_expected_plan_snapshot jsonb
) returns boolean language sql security invoker set search_path = '' as $$
  select private.begin_subscription_checkout(p_subscription_id, p_provider_account, p_expected_plan_snapshot);
$$;

-- Old argument lists are removed so legacy callers fail closed. First deploy
-- the coordinated application with checkout disabled; apply this migration
-- within the same release window, then reconcile retriable webhook failures.
-- No historical event or financial row is deleted.
drop function public.attach_subscription_checkout(uuid,text,text,text);
drop function private.attach_subscription_checkout(uuid,text,text,text);
create function private.attach_subscription_checkout(
  p_subscription_id uuid, p_provider_account text, p_provider_subscription_id text,
  p_provider_plan_id text default null, p_expected_plan_snapshot jsonb default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_sub public.subscriptions;
begin
  select * into v_sub from public.subscriptions where id = p_subscription_id for update;
  if not found then raise exception 'Unknown subscription' using errcode = 'P0002'; end if;
  if p_expected_plan_snapshot is null or v_sub.plan_snapshot <> p_expected_plan_snapshot
     or v_sub.provider_account is distinct from p_provider_account
     or v_sub.provider is distinct from 'MERCADO_PAGO'
     or nullif(trim(p_provider_subscription_id), '') is null then
    raise exception 'Checkout identity or snapshot mismatch' using errcode = '22023';
  end if;
  if v_sub.provider_subscription_id is not null then
    if v_sub.provider_subscription_id = p_provider_subscription_id
       and v_sub.provider_plan_id is not distinct from p_provider_plan_id then return; end if;
    raise exception 'Checkout cannot be replaced' using errcode = '22023';
  end if;
  if v_sub.status <> 'PENDING_PAYMENT' then
    raise exception 'Subscription is not pending' using errcode = '22023';
  end if;
  if v_sub.plan_snapshot->>'payment_model' = 'ONE_TIME' and p_provider_subscription_id <> p_subscription_id::text then
    raise exception 'One-time checkout identity mismatch' using errcode = '22023';
  end if;
  update public.subscriptions set provider_subscription_id = p_provider_subscription_id,
    provider_plan_id = p_provider_plan_id where id = p_subscription_id;
end;
$$;
create function public.attach_subscription_checkout(
  p_subscription_id uuid, p_provider_account text, p_provider_subscription_id text,
  p_provider_plan_id text default null, p_expected_plan_snapshot jsonb default null
) returns void language sql security invoker set search_path = '' as $$
  select private.attach_subscription_checkout(p_subscription_id, p_provider_account,
    p_provider_subscription_id, p_provider_plan_id, p_expected_plan_snapshot);
$$;

-- Shared account/resource/snapshot guard. Runs under the subscription row lock
-- before touching the event ledger, so a webhook before attach stays retryable.
create function private.lock_payment_subscription(
  p_subscription_id uuid, p_provider_account text, p_provider_subscription_id text,
  p_amount numeric, p_currency text
) returns public.subscriptions language plpgsql security definer set search_path = '' as $$
declare v_sub public.subscriptions;
begin
  select * into v_sub from public.subscriptions where id = p_subscription_id for update;
  if not found or v_sub.provider_subscription_id is null then
    raise exception 'Subscription checkout not linked yet' using errcode = 'P0002';
  end if;
  if v_sub.provider is distinct from 'MERCADO_PAGO'
     or v_sub.provider_account is distinct from p_provider_account
     or v_sub.provider_subscription_id is distinct from p_provider_subscription_id
     or p_amount is null or p_amount <= 0
     or (v_sub.plan_snapshot->>'price_amount')::numeric is distinct from p_amount
     or v_sub.plan_snapshot->>'currency' is distinct from p_currency then
    raise exception 'Provider resource or commercial snapshot mismatch' using errcode = '22023';
  end if;
  return v_sub;
end;
$$;

drop function public.apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz);
drop function private.apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz);
create function private.apply_subscription_webhook_event(
  p_provider_subscription_id text, p_external_event_id text, p_event_type text, p_status text,
  p_period_start timestamptz, p_period_end timestamptz, p_next_payment_at timestamptz,
  p_payload jsonb, p_occurred_at timestamptz, p_provider_account text,
  p_subscription_id uuid, p_amount numeric, p_currency text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_sub public.subscriptions; v_inserted boolean; v_latest timestamptz;
begin
  v_sub := private.lock_payment_subscription(p_subscription_id, p_provider_account,
    p_provider_subscription_id, p_amount, p_currency);
  if p_event_type is distinct from 'subscription_preapproval'
     or v_sub.plan_snapshot->>'payment_model' is distinct from 'RECURRING'
     or p_period_start is not null or p_period_end is not null
     or nullif(p_external_event_id, '') is null or p_occurred_at is null
     or (p_status is not null and p_status not in ('PENDING_PAYMENT','ACTIVE','PAUSED','CANCELED')) then
    raise exception 'Invalid subscription event' using errcode = '22023';
  end if;
  insert into private.subscription_events(subscription_id, provider, provider_account,
    provider_resource_id, external_event_id, event_type, payload, occurred_at)
  values (v_sub.id, 'MERCADO_PAGO', p_provider_account, p_provider_subscription_id,
    p_external_event_id, p_event_type, p_payload, p_occurred_at)
  on conflict do nothing returning true into v_inserted;
  if v_inserted is not true then return false; end if;
  insert into private.subscription_payment_state(subscription_id) values (v_sub.id) on conflict do nothing;
  select preapproval_updated_at into v_latest from private.subscription_payment_state where subscription_id = v_sub.id;
  if v_latest is null or p_occurred_at > v_latest then
    -- Authorization alone is not evidence of payment. Terminal cancellation
    -- never revives from a delayed or even newer preapproval notification.
    update public.subscriptions set
      status = case when status in ('CANCELED','EXPIRED') then status
        when p_status in ('PAUSED','CANCELED') then p_status else status end,
      next_payment_at = coalesce(p_next_payment_at, next_payment_at)
    where id = v_sub.id;
    update private.subscription_payment_state set preapproval_updated_at = p_occurred_at where subscription_id = v_sub.id;
  end if;
  update private.subscription_events set processed_at = statement_timestamp()
  where subscription_id = v_sub.id and provider = 'MERCADO_PAGO' and provider_account = p_provider_account
    and event_type = p_event_type and provider_resource_id = p_provider_subscription_id and external_event_id = p_external_event_id;
  return true;
end;
$$;
create function public.apply_subscription_webhook_event(
  p_provider_subscription_id text, p_external_event_id text, p_event_type text, p_status text,
  p_period_start timestamptz, p_period_end timestamptz, p_next_payment_at timestamptz,
  p_payload jsonb, p_occurred_at timestamptz, p_provider_account text,
  p_subscription_id uuid, p_amount numeric, p_currency text
) returns boolean language sql security invoker set search_path = '' as $$
  select private.apply_subscription_webhook_event(p_provider_subscription_id, p_external_event_id,
    p_event_type, p_status, p_period_start, p_period_end, p_next_payment_at, p_payload,
    p_occurred_at, p_provider_account, p_subscription_id, p_amount, p_currency);
$$;

drop function public.apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz);
drop function private.apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz);
create function private.apply_subscription_payment_event(
  p_provider_subscription_id text, p_external_event_id text, p_payment_status text,
  p_paid_at timestamptz, p_payload jsonb, p_occurred_at timestamptz,
  p_provider_account text, p_subscription_id uuid, p_amount numeric, p_currency text,
  p_event_type text, p_provider_payment_id text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_sub public.subscriptions; v_inserted boolean;
  v_receipt private.subscription_payment_receipts; v_latest timestamptz;
  v_interval interval; v_grace integer;
begin
  v_sub := private.lock_payment_subscription(p_subscription_id, p_provider_account,
    p_provider_subscription_id, p_amount, p_currency);
  if nullif(p_external_event_id, '') is null or nullif(p_provider_payment_id, '') is null
     or p_occurred_at is null or p_payment_status is null
     or p_payment_status not in ('pending','in_process','in_mediation','authorized','approved','rejected','cancelled','refunded','charged_back')
     or p_event_type is null or p_event_type not in ('payment','subscription_authorized_payment')
     or (p_event_type = 'payment' and v_sub.plan_snapshot->>'payment_model' is distinct from 'ONE_TIME')
     or (p_event_type = 'subscription_authorized_payment' and v_sub.plan_snapshot->>'payment_model' is distinct from 'RECURRING')
     or (p_payment_status = 'approved' and p_paid_at is null) then
    raise exception 'Invalid payment event' using errcode = '22023';
  end if;
  -- Lock also by payment identity: concurrent cross-subscription attempts must
  -- never assign a single provider payment to two professionals.
  perform pg_advisory_xact_lock(hashtextextended('MERCADO_PAGO:' || p_provider_account || ':' || p_provider_payment_id, 0));
  select * into v_receipt from private.subscription_payment_receipts
  where provider = 'MERCADO_PAGO' and provider_account = p_provider_account and provider_payment_id = p_provider_payment_id;
  if found and v_receipt.subscription_id <> v_sub.id then
    raise exception 'Payment belongs to another subscription' using errcode = '22023';
  end if;
  insert into private.subscription_events(subscription_id, provider, provider_account,
    provider_resource_id, external_event_id, event_type, payload, occurred_at)
  values (v_sub.id, 'MERCADO_PAGO', p_provider_account, p_provider_payment_id,
    p_external_event_id, p_event_type, p_payload, p_occurred_at)
  on conflict do nothing returning true into v_inserted;
  if v_inserted is not true then return false; end if;
  insert into private.subscription_payment_state(subscription_id) values (v_sub.id) on conflict do nothing;
  select payment_updated_at into v_latest from private.subscription_payment_state where subscription_id = v_sub.id;
  if (v_receipt.provider_updated_at is null or p_occurred_at > v_receipt.provider_updated_at)
     and (v_receipt.status is null or v_receipt.status not in ('refunded','charged_back'))
     and (v_receipt.status is distinct from 'approved' or p_payment_status in ('approved','refunded','charged_back')) then
    insert into private.subscription_payment_receipts(provider, provider_account, provider_payment_id,
      subscription_id, status, paid_at, provider_updated_at)
    values ('MERCADO_PAGO', p_provider_account, p_provider_payment_id, v_sub.id,
      p_payment_status, p_paid_at, p_occurred_at)
    on conflict (provider, provider_account, provider_payment_id) do update set
      status = excluded.status, paid_at = coalesce(subscription_payment_receipts.paid_at, excluded.paid_at),
      provider_updated_at = excluded.provider_updated_at;
    if p_payment_status = 'approved' and v_receipt.status is distinct from 'approved'
       and (v_receipt.status is null or v_receipt.status not in ('refunded','charged_back'))
       and (v_sub.status in ('PENDING_PAYMENT','ACTIVE','PAST_DUE')
         or (v_sub.status = 'PAUSED' and v_sub.grace_period_ends_at is not null))
       and (v_sub.last_payment_at is null or p_paid_at > v_sub.last_payment_at)
       and (v_sub.plan_snapshot->>'payment_model' <> 'ONE_TIME' or v_sub.last_payment_at is null) then
      v_interval := case v_sub.plan_snapshot->>'billing_interval'
        when 'MONTH' then interval '1 month' when 'YEAR' then interval '1 year' else null end;
      if v_interval is null then raise exception 'Unknown billing interval' using errcode = '22023'; end if;
      update public.subscriptions set status = 'ACTIVE', last_payment_at = p_paid_at,
        current_period_start = p_paid_at,
        current_period_end = greatest(current_period_end, p_paid_at + v_interval),
        leads_used_in_period = 0, grace_period_ends_at = null,
        commitment_ends_at = case when commitment_ends_at is null and commitment_cycles is not null
          then p_paid_at + make_interval(months => commitment_cycles) else commitment_ends_at end
      where id = v_sub.id;
    elsif p_payment_status in ('rejected','cancelled') and v_sub.status = 'ACTIVE'
       and (v_latest is null or p_occurred_at > v_latest)
       and (p_payload->>'date_created')::timestamptz >= v_sub.last_payment_at
       and (v_receipt.status is null or v_receipt.status not in ('approved','refunded','charged_back')) then
      v_grace := coalesce((v_sub.plan_snapshot->>'grace_period_days')::integer, 3);
      update public.subscriptions set status = 'PAST_DUE',
        grace_period_ends_at = coalesce(grace_period_ends_at, p_occurred_at + make_interval(days => v_grace))
      where id = v_sub.id;
    elsif p_payment_status in ('refunded','charged_back')
       and ((v_receipt.status = 'approved' and v_receipt.paid_at = v_sub.last_payment_at)
         or (v_receipt.provider_payment_id is null and p_paid_at = v_sub.last_payment_at))
       and v_sub.status not in ('CANCELED','EXPIRED') then
      update public.subscriptions set status = 'PAUSED', grace_period_ends_at = null where id = v_sub.id;
    end if;
    update private.subscription_payment_state set payment_updated_at = greatest(payment_updated_at, p_occurred_at)
      where subscription_id = v_sub.id;
  end if;
  update private.subscription_events set processed_at = statement_timestamp()
  where subscription_id = v_sub.id and provider = 'MERCADO_PAGO' and provider_account = p_provider_account
    and event_type = p_event_type and provider_resource_id = p_provider_payment_id and external_event_id = p_external_event_id;
  return true;
end;
$$;
create function public.apply_subscription_payment_event(
  p_provider_subscription_id text, p_external_event_id text, p_payment_status text,
  p_paid_at timestamptz, p_payload jsonb, p_occurred_at timestamptz,
  p_provider_account text, p_subscription_id uuid, p_amount numeric, p_currency text,
  p_event_type text, p_provider_payment_id text
) returns boolean language sql security invoker set search_path = '' as $$
  select private.apply_subscription_payment_event(p_provider_subscription_id, p_external_event_id,
    p_payment_status, p_paid_at, p_payload, p_occurred_at, p_provider_account, p_subscription_id,
    p_amount, p_currency, p_event_type, p_provider_payment_id);
$$;

-- Exact EXECUTE surface; no PUBLIC inheritance and no broad table grants.
revoke all on function private.lock_payment_subscription(uuid,text,text,numeric,text) from public, anon, authenticated, service_role;
revoke all on function public.begin_subscription_checkout(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.begin_subscription_checkout(uuid,text,jsonb) to service_role;
revoke all on function private.begin_subscription_checkout(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function private.begin_subscription_checkout(uuid,text,jsonb) to service_role;
revoke all on function public.attach_subscription_checkout(uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.attach_subscription_checkout(uuid,text,text,text,jsonb) to service_role;
revoke all on function private.attach_subscription_checkout(uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function private.attach_subscription_checkout(uuid,text,text,text,jsonb) to service_role;
revoke all on function public.apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz,text,uuid,numeric,text) from public, anon, authenticated;
grant execute on function public.apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz,text,uuid,numeric,text) to service_role;
revoke all on function private.apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz,text,uuid,numeric,text) from public, anon, authenticated;
grant execute on function private.apply_subscription_webhook_event(text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb,timestamptz,text,uuid,numeric,text) to service_role;
revoke all on function public.apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz,text,uuid,numeric,text,text,text) from public, anon, authenticated;
grant execute on function public.apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz,text,uuid,numeric,text,text,text) to service_role;
revoke all on function private.apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz,text,uuid,numeric,text,text,text) from public, anon, authenticated;
grant execute on function private.apply_subscription_payment_event(text,text,text,timestamptz,jsonb,timestamptz,text,uuid,numeric,text,text,text) to service_role;

commit;
