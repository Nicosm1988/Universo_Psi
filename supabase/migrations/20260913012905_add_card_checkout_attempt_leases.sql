begin;

-- Fencing tokens identify the request that may release a definitive rejection.
-- There is no automatic expiry: ambiguous provider responses stay reserved.
-- Neither card tokens, payer email nor provider response bodies are persisted.
create table private.card_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  provider_account text not null check (provider_account in ('personal', 'company')),
  reserved_at timestamptz not null default statement_timestamp(),
  released_at timestamptz,
  rejection_http_status integer,
  unique (id, subscription_id),
  check (
    (released_at is null and rejection_http_status is null)
    or (released_at is not null and rejection_http_status is not null
      and rejection_http_status in (400, 422))
  )
);
create unique index card_checkout_attempts_one_unreleased_idx
  on private.card_checkout_attempts(subscription_id) where released_at is null;
alter table private.card_checkout_attempts enable row level security;
alter table private.card_checkout_attempts force row level security;
revoke all on private.card_checkout_attempts from public, anon, authenticated, service_role;
grant select on private.card_checkout_attempts to service_role;

alter table private.subscription_payment_state
  add column current_card_attempt_id uuid,
  add constraint subscription_payment_state_card_attempt_fkey
    foreign key (current_card_attempt_id, subscription_id)
    references private.card_checkout_attempts(id, subscription_id) on delete restrict;

create function private.reserve_card_checkout(
  p_subscription_id uuid,
  p_provider_account text,
  p_expected_plan_snapshot jsonb
) returns table (may_create boolean, attempt_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_sub public.subscriptions;
  v_attempt_id uuid;
begin
  select * into v_sub from public.subscriptions where id=p_subscription_id for update;
  if not found or v_sub.plan_snapshot->>'payment_model' is distinct from 'RECURRING' then
    raise exception 'Card checkout requires a recurring subscription' using errcode='22023';
  end if;

  -- Reuse the established account, snapshot, status and permanent-reservation guard.
  if not private.begin_subscription_checkout(p_subscription_id,p_provider_account,p_expected_plan_snapshot) then
    -- Never disclose the current request's fencing token to a concurrent retry.
    return query select false,null::uuid;
    return;
  end if;

  insert into private.card_checkout_attempts(subscription_id,provider_account)
  values(p_subscription_id,p_provider_account) returning id into v_attempt_id;
  update private.subscription_payment_state set current_card_attempt_id=v_attempt_id
  where subscription_id=p_subscription_id;
  return query select true,v_attempt_id;
end;
$$;
create function public.reserve_card_checkout(
  p_subscription_id uuid,
  p_provider_account text,
  p_expected_plan_snapshot jsonb
) returns table (may_create boolean, attempt_id uuid)
language sql security invoker set search_path = '' as $$
  select * from private.reserve_card_checkout(p_subscription_id,p_provider_account,p_expected_plan_snapshot);
$$;

create function private.release_failed_card_checkout(
  p_subscription_id uuid,
  p_attempt_id uuid,
  p_http_status integer
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_sub public.subscriptions;
  v_attempt private.card_checkout_attempts;
  v_state private.subscription_payment_state;
begin
  if p_attempt_id is null or p_http_status is null or p_http_status not in (400,422) then
    raise exception 'Only a definitive card validation rejection may release this attempt' using errcode='22023';
  end if;
  select * into v_sub from public.subscriptions where id=p_subscription_id for update;
  if not found or v_sub.status<>'PENDING_PAYMENT' or v_sub.provider_subscription_id is not null then
    return false;
  end if;
  select * into v_attempt from private.card_checkout_attempts
  where id=p_attempt_id and subscription_id=p_subscription_id for update;
  if not found or v_attempt.released_at is not null
     or v_attempt.provider_account is distinct from v_sub.provider_account then
    return false;
  end if;
  select * into v_state from private.subscription_payment_state
  where subscription_id=p_subscription_id for update;
  if not found or v_state.current_card_attempt_id is distinct from p_attempt_id
     or v_state.checkout_reserved_at is null then
    return false;
  end if;

  update private.card_checkout_attempts
  set released_at=statement_timestamp(),rejection_http_status=p_http_status where id=p_attempt_id;
  update private.subscription_payment_state
  set checkout_reserved_at=null,current_card_attempt_id=null where subscription_id=p_subscription_id;
  -- Keep provider account, commercial snapshot, event history and prior attempts.
  return true;
end;
$$;
create function public.release_failed_card_checkout(
  p_subscription_id uuid,
  p_attempt_id uuid,
  p_http_status integer
) returns boolean language sql security invoker set search_path = '' as $$
  select private.release_failed_card_checkout(p_subscription_id,p_attempt_id,p_http_status);
$$;

revoke all on function private.reserve_card_checkout(uuid,text,jsonb),
  public.reserve_card_checkout(uuid,text,jsonb),
  private.release_failed_card_checkout(uuid,uuid,integer),
  public.release_failed_card_checkout(uuid,uuid,integer)
  from public, anon, authenticated;
grant execute on function private.reserve_card_checkout(uuid,text,jsonb),
  public.reserve_card_checkout(uuid,text,jsonb),
  private.release_failed_card_checkout(uuid,uuid,integer),
  public.release_failed_card_checkout(uuid,uuid,integer)
  to service_role;

commit;
