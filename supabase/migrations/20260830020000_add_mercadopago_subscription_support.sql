begin;

-- Mercado Pago billing support: recurring (Preapproval) and one-time
-- (Checkout Pro preference) checkout, reconciled server-side and never by
-- the client redirect alone. Designed so a future move from the founder's
-- personal Mercado Pago account to the incorporated company's account is a
-- config change (MERCADOPAGO_ACTIVE_ACCOUNT), not a rewrite: every
-- subscription permanently records which provider_account created it, and
-- internal plan codes are decoupled from Mercado Pago's own
-- preapproval_plan_id via plan_provider_mappings (one internal plan can
-- have a different provider_plan_id per account).
--
-- Nothing here is applied to any live database yet — Universo Psi has no
-- Supabase project provisioned. This file replaces the first draft of
-- this migration wholesale rather than layering a correction on top,
-- since there is no deployed state to preserve.

-- ---------------------------------------------------------------------
-- plans: billing model + commitment + grace period
-- ---------------------------------------------------------------------

alter table public.plans
  add column payment_model text not null default 'RECURRING'
    check (payment_model in ('RECURRING', 'ONE_TIME')),
  add column commitment_cycles integer check (commitment_cycles is null or commitment_cycles > 0),
  add column grace_period_days integer not null default 3 check (grace_period_days >= 0);

-- ---------------------------------------------------------------------
-- subscriptions: provider linkage, commitment and payment tracking
-- ---------------------------------------------------------------------

alter table public.subscriptions
  add column provider text check (provider in ('MERCADO_PAGO')),
  add column provider_account text check (provider_account in ('personal', 'company')),
  add column provider_plan_id text,
  add column provider_subscription_id text,
  add column commitment_cycles integer,
  add column commitment_ends_at timestamptz,
  add column last_payment_at timestamptz,
  add column next_payment_at timestamptz,
  add column grace_period_ends_at timestamptz;

create unique index subscriptions_provider_subscription_idx
  on public.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

-- ---------------------------------------------------------------------
-- plan_provider_mappings: internal plan <-> Mercado Pago preapproval_plan_id,
-- one row per (plan, account). Lives in `private` — only server code (via
-- the wrappers below) ever needs it, never a direct client query.
-- ---------------------------------------------------------------------

create table private.plan_provider_mappings (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  provider text not null check (provider in ('MERCADO_PAGO')),
  provider_account text not null check (provider_account in ('personal', 'company')),
  provider_plan_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, provider, provider_account)
);

-- ---------------------------------------------------------------------
-- select_professional_plan: re-declared to snapshot the new plan fields
-- (payment_model, commitment_cycles, grace_period_days) that the checkout
-- layer needs. Everything else — auth checks, upsert shape — is
-- unchanged from the original (see supabase/migrations/20260815161322_*).
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- Checkout linking: called right after creating a Mercado Pago
-- preapproval/preference, before redirecting the professional.
-- ---------------------------------------------------------------------

create or replace function private.attach_subscription_checkout(
  p_subscription_id uuid,
  p_provider_account text,
  p_provider_subscription_id text,
  p_provider_plan_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.subscriptions
  set provider = 'MERCADO_PAGO',
      provider_account = p_provider_account,
      provider_subscription_id = p_provider_subscription_id,
      provider_plan_id = p_provider_plan_id,
      updated_at = statement_timestamp()
  where id = p_subscription_id
    and status = 'PENDING_PAYMENT';

  if not found then
    raise exception 'Subscription not found or not pending payment' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.attach_subscription_checkout(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function private.attach_subscription_checkout(uuid, text, text, text)
  to service_role;

create or replace function public.attach_subscription_checkout(
  p_subscription_id uuid,
  p_provider_account text,
  p_provider_subscription_id text,
  p_provider_plan_id text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.attach_subscription_checkout(
    p_subscription_id, p_provider_account, p_provider_subscription_id, p_provider_plan_id
  );
$$;

revoke all on function public.attach_subscription_checkout(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.attach_subscription_checkout(uuid, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------
-- Subscription-level webhook reconciliation (subscription_preapproval
-- events): idempotent on (provider, external_event_id), never trusts the
-- webhook payload's status — the caller must have already re-fetched the
-- authoritative resource from Mercado Pago before calling this.
-- ---------------------------------------------------------------------

create or replace function private.apply_subscription_webhook_event(
  p_provider_subscription_id text,
  p_external_event_id text,
  p_event_type text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_next_payment_at timestamptz,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription_id uuid;
  v_inserted boolean;
begin
  select id into v_subscription_id
  from public.subscriptions
  where provider = 'MERCADO_PAGO' and provider_subscription_id = p_provider_subscription_id
  for update;

  insert into private.subscription_events (
    subscription_id, provider, external_event_id, event_type, payload, occurred_at
  ) values (
    v_subscription_id, 'MERCADO_PAGO', p_external_event_id, p_event_type, p_payload, p_occurred_at
  )
  on conflict (provider, external_event_id) do nothing
  returning true into v_inserted;

  if v_inserted is not true then
    return false;
  end if;

  if v_subscription_id is not null and p_status is not null then
    update public.subscriptions
    set status = p_status,
        current_period_start = coalesce(p_period_start, current_period_start),
        current_period_end = coalesce(p_period_end, current_period_end),
        next_payment_at = coalesce(p_next_payment_at, next_payment_at),
        commitment_ends_at = case
          when commitment_ends_at is null and p_status = 'ACTIVE' and commitment_cycles is not null
            then statement_timestamp() + (commitment_cycles || ' months')::interval
          else commitment_ends_at
        end,
        updated_at = statement_timestamp()
    where id = v_subscription_id;
  end if;

  update private.subscription_events
  set processed_at = statement_timestamp()
  where subscription_id is not distinct from v_subscription_id
    and provider = 'MERCADO_PAGO'
    and external_event_id = p_external_event_id;

  return true;
end;
$$;

revoke all on function private.apply_subscription_webhook_event(
  text, text, text, text, timestamptz, timestamptz, timestamptz, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function private.apply_subscription_webhook_event(
  text, text, text, text, timestamptz, timestamptz, timestamptz, jsonb, timestamptz
) to service_role;

create or replace function public.apply_subscription_webhook_event(
  p_provider_subscription_id text,
  p_external_event_id text,
  p_event_type text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_next_payment_at timestamptz,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.apply_subscription_webhook_event(
    p_provider_subscription_id, p_external_event_id, p_event_type, p_status,
    p_period_start, p_period_end, p_next_payment_at, p_payload, p_occurred_at
  );
$$;

revoke all on function public.apply_subscription_webhook_event(
  text, text, text, text, timestamptz, timestamptz, timestamptz, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_subscription_webhook_event(
  text, text, text, text, timestamptz, timestamptz, timestamptz, jsonb, timestamptz
) to service_role;

-- ---------------------------------------------------------------------
-- Payment-level reconciliation (subscription_authorized_payment and
-- one-time `payment` events): tracks last/next payment and applies the
-- configurable grace period on a rejected charge instead of suspending
-- immediately on a single failure.
-- ---------------------------------------------------------------------

create or replace function private.apply_subscription_payment_event(
  p_provider_subscription_id text,
  p_external_event_id text,
  p_payment_status text,
  p_paid_at timestamptz,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription record;
  v_inserted boolean;
  v_grace_days integer;
begin
  select id, status, plan_snapshot into v_subscription
  from public.subscriptions
  where provider = 'MERCADO_PAGO' and provider_subscription_id = p_provider_subscription_id
  for update;

  insert into private.subscription_events (
    subscription_id, provider, external_event_id, event_type, payload, occurred_at
  ) values (
    v_subscription.id, 'MERCADO_PAGO', p_external_event_id, 'payment.' || p_payment_status,
    p_payload, p_occurred_at
  )
  on conflict (provider, external_event_id) do nothing
  returning true into v_inserted;

  if v_inserted is not true then
    return false;
  end if;

  if v_subscription.id is not null then
    if p_payment_status = 'approved' then
      update public.subscriptions
      set status = case when status in ('PENDING_PAYMENT', 'PAST_DUE') then 'ACTIVE' else status end,
          last_payment_at = coalesce(p_paid_at, statement_timestamp()),
          grace_period_ends_at = null,
          updated_at = statement_timestamp()
      where id = v_subscription.id;
    elsif p_payment_status in ('rejected', 'cancelled') then
      v_grace_days := coalesce((v_subscription.plan_snapshot->>'grace_period_days')::integer, 3);
      update public.subscriptions
      set status = case when status = 'ACTIVE' then 'PAST_DUE' else status end,
          grace_period_ends_at = coalesce(grace_period_ends_at, statement_timestamp() + (v_grace_days || ' days')::interval),
          updated_at = statement_timestamp()
      where id = v_subscription.id;
    end if;
  end if;

  update private.subscription_events
  set processed_at = statement_timestamp()
  where subscription_id is not distinct from v_subscription.id
    and provider = 'MERCADO_PAGO'
    and external_event_id = p_external_event_id;

  return true;
end;
$$;

revoke all on function private.apply_subscription_payment_event(
  text, text, text, timestamptz, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function private.apply_subscription_payment_event(
  text, text, text, timestamptz, jsonb, timestamptz
) to service_role;

create or replace function public.apply_subscription_payment_event(
  p_provider_subscription_id text,
  p_external_event_id text,
  p_payment_status text,
  p_paid_at timestamptz,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.apply_subscription_payment_event(
    p_provider_subscription_id, p_external_event_id, p_payment_status, p_paid_at, p_payload, p_occurred_at
  );
$$;

revoke all on function public.apply_subscription_payment_event(
  text, text, text, timestamptz, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_subscription_payment_event(
  text, text, text, timestamptz, jsonb, timestamptz
) to service_role;

-- ---------------------------------------------------------------------
-- Grace period expiry: pauses subscriptions whose grace period has
-- elapsed without a successful retry. Called manually from the admin
-- panel today; safe to put on a schedule later without any code change.
-- ---------------------------------------------------------------------

create or replace function private.expire_past_due_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.subscriptions
  set status = 'PAUSED', updated_at = statement_timestamp()
  where status = 'PAST_DUE'
    and grace_period_ends_at is not null
    and grace_period_ends_at < statement_timestamp();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.expire_past_due_subscriptions() from public, anon, authenticated;
grant execute on function private.expire_past_due_subscriptions() to service_role;

create or replace function public.expire_past_due_subscriptions()
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.expire_past_due_subscriptions(); $$;

revoke all on function public.expire_past_due_subscriptions() from public, anon, authenticated;
grant execute on function public.expire_past_due_subscriptions() to service_role;

-- ---------------------------------------------------------------------
-- Plan <-> provider plan id mapping (read/write), service_role only.
-- ---------------------------------------------------------------------

create or replace function private.lookup_plan_provider_id(
  p_plan_code text,
  p_provider_account text
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.provider_plan_id
  from private.plan_provider_mappings m
  join public.plans p on p.id = m.plan_id
  where p.code = upper(p_plan_code)
    and m.provider = 'MERCADO_PAGO'
    and m.provider_account = p_provider_account;
$$;

revoke all on function private.lookup_plan_provider_id(text, text) from public, anon, authenticated;
grant execute on function private.lookup_plan_provider_id(text, text) to service_role;

create or replace function public.lookup_plan_provider_id(
  p_plan_code text,
  p_provider_account text
)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.lookup_plan_provider_id(p_plan_code, p_provider_account); $$;

revoke all on function public.lookup_plan_provider_id(text, text) from public, anon, authenticated;
grant execute on function public.lookup_plan_provider_id(text, text) to service_role;

create or replace function private.upsert_plan_provider_mapping(
  p_plan_code text,
  p_provider_account text,
  p_provider_plan_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
begin
  select id into v_plan_id from public.plans where code = upper(p_plan_code);
  if v_plan_id is null then
    raise exception 'Unknown plan code' using errcode = '22023';
  end if;

  insert into private.plan_provider_mappings (plan_id, provider, provider_account, provider_plan_id)
  values (v_plan_id, 'MERCADO_PAGO', p_provider_account, p_provider_plan_id)
  on conflict (plan_id, provider, provider_account) do update
    set provider_plan_id = excluded.provider_plan_id,
        updated_at = statement_timestamp();
end;
$$;

revoke all on function private.upsert_plan_provider_mapping(text, text, text)
  from public, anon, authenticated;
grant execute on function private.upsert_plan_provider_mapping(text, text, text)
  to service_role;

create or replace function public.upsert_plan_provider_mapping(
  p_plan_code text,
  p_provider_account text,
  p_provider_plan_id text
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.upsert_plan_provider_mapping(p_plan_code, p_provider_account, p_provider_plan_id); $$;

revoke all on function public.upsert_plan_provider_mapping(text, text, text)
  from public, anon, authenticated;
grant execute on function public.upsert_plan_provider_mapping(text, text, text)
  to service_role;

-- ---------------------------------------------------------------------
-- Admin read model: one row per subscription with everything the
-- requested admin panel needs (internal plan, provider account,
-- provider_subscription_id, status, last/next payment).
-- security_invoker means this view enforces the querying user's own RLS,
-- not the view owner's — so it reuses the existing
-- subscriptions_owner_or_admin_read policy (ADMIN/SUPERADMIN see every
-- row, everyone else only their own) instead of needing a new authz path.
-- ---------------------------------------------------------------------

create or replace view public.admin_subscription_overview
with (security_invoker = true) as
select
  s.id as subscription_id,
  s.professional_profile_id,
  p.first_name || ' ' || p.last_name as professional_name,
  pl.code as internal_plan_code,
  pl.name as internal_plan_name,
  s.provider,
  s.provider_account,
  s.provider_subscription_id,
  s.provider_plan_id,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.commitment_cycles,
  s.commitment_ends_at,
  s.last_payment_at,
  s.next_payment_at,
  s.grace_period_ends_at,
  s.created_at,
  s.updated_at
from public.subscriptions s
join public.professional_profiles p on p.id = s.professional_profile_id
join public.plans pl on pl.id = s.plan_id;

revoke all on public.admin_subscription_overview from public, anon;
grant select on public.admin_subscription_overview to authenticated, service_role;

commit;
