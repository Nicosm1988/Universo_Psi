begin;

-- Mercado Pago recurring billing (Preapproval API) support. Links a
-- subscription to MP's preapproval id and gives the webhook handler an
-- idempotent, auditable way to reconcile subscription state using the
-- already-modeled private.payment_customers / private.subscription_events
-- tables. All functions here are service_role only: they are called from
-- server routes using the admin client, never from an authenticated user
-- session directly.

alter table public.subscriptions
  add column external_subscription_id text;

create unique index subscriptions_external_subscription_idx
  on public.subscriptions (external_subscription_id)
  where external_subscription_id is not null;

-- Called by the checkout-initiation route right after creating a Mercado
-- Pago preapproval, to link it to our row before redirecting the
-- professional to the checkout URL.
create or replace function private.attach_subscription_checkout(
  p_subscription_id uuid,
  p_external_subscription_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.subscriptions
  set external_subscription_id = p_external_subscription_id,
      updated_at = statement_timestamp()
  where id = p_subscription_id
    and status = 'PENDING_PAYMENT';

  if not found then
    raise exception 'Subscription not found or not pending payment' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.attach_subscription_checkout(uuid, text)
  from public, anon, authenticated;
grant execute on function private.attach_subscription_checkout(uuid, text)
  to service_role;

-- Called by the Mercado Pago webhook handler after fetching the
-- authoritative resource state from the Mercado Pago API (never trusting
-- the thin notification payload alone). Idempotent on
-- (provider, external_event_id): replaying the same notification never
-- double-applies a transition.
create or replace function private.apply_subscription_webhook_event(
  p_external_subscription_id text,
  p_external_event_id text,
  p_event_type text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
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
  where external_subscription_id = p_external_subscription_id
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
  text, text, text, text, timestamptz, timestamptz, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function private.apply_subscription_webhook_event(
  text, text, text, text, timestamptz, timestamptz, jsonb, timestamptz
) to service_role;

-- Links a professional's Mercado Pago payer id the first time we create a
-- checkout for them.
create or replace function private.upsert_payment_customer(
  p_profile_id uuid,
  p_external_customer_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.payment_customers (professional_profile_id, provider, external_customer_id)
  values (p_profile_id, 'MERCADO_PAGO', p_external_customer_id)
  on conflict (professional_profile_id) do update
    set external_customer_id = excluded.external_customer_id,
        updated_at = statement_timestamp();
end;
$$;

revoke all on function private.upsert_payment_customer(uuid, text)
  from public, anon, authenticated;
grant execute on function private.upsert_payment_customer(uuid, text)
  to service_role;

-- PostgREST only resolves RPC calls against schemas in the exposed API
-- (public, graphql_public here — see supabase/config.toml). These thin
-- public wrappers are the only way the service-role admin client can reach
-- the private.* implementations above via supabase.rpc(...).
create or replace function public.attach_subscription_checkout(
  p_subscription_id uuid,
  p_external_subscription_id text
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.attach_subscription_checkout(p_subscription_id, p_external_subscription_id); $$;

revoke all on function public.attach_subscription_checkout(uuid, text) from public, anon, authenticated;
grant execute on function public.attach_subscription_checkout(uuid, text) to service_role;

create or replace function public.apply_subscription_webhook_event(
  p_external_subscription_id text,
  p_external_event_id text,
  p_event_type text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.apply_subscription_webhook_event(
    p_external_subscription_id, p_external_event_id, p_event_type, p_status,
    p_period_start, p_period_end, p_payload, p_occurred_at
  );
$$;

revoke all on function public.apply_subscription_webhook_event(
  text, text, text, text, timestamptz, timestamptz, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_subscription_webhook_event(
  text, text, text, text, timestamptz, timestamptz, jsonb, timestamptz
) to service_role;

create or replace function public.upsert_payment_customer(
  p_profile_id uuid,
  p_external_customer_id text
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.upsert_payment_customer(p_profile_id, p_external_customer_id); $$;

revoke all on function public.upsert_payment_customer(uuid, text) from public, anon, authenticated;
grant execute on function public.upsert_payment_customer(uuid, text) to service_role;

commit;
