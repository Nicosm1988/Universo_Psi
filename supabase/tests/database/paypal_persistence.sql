\set ON_ERROR_STOP on
-- Isolated database only; caller may prepend the migration without COMMIT.
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', message; end if; end; $$;
insert into public.professional_profiles(id,slug,first_name,last_name,headline,bio,is_demo)
values ('fa200000-0000-4000-8000-000000000001','paypal-fixture','Prueba','PayPal','Perfil de prueba aislada','Perfil transaccional de prueba de pagos que no se publica.',true);
insert into public.subscriptions(id,professional_profile_id,plan_id,plan_snapshot,is_demo)
select 'fa300000-0000-4000-8000-000000000001','fa200000-0000-4000-8000-000000000001',id,
  jsonb_build_object('code',code,'name',name,'pricing_status','PUBLISHED','price_amount',price_amount,'currency',currency,'billing_interval','MONTH','payment_model','RECURRING'),true
from public.plans where code='PROFESSIONAL_MONTHLY';
create function pg_temp.reserve() returns jsonb language sql as $$
  select public.paypal_operation('reserve',jsonb_build_object('subscription_id',id,'profile_id',professional_profile_id,'snapshot',plan_snapshot,
    'price',jsonb_build_object('amount','25.00','currency','USD','planId','P-TEST')))
  from public.subscriptions where id='fa300000-0000-4000-8000-000000000001';
$$;
do $$ begin
  begin
    perform public.paypal_operation('reserve',jsonb_build_object('subscription_id',id,'profile_id','fa200000-0000-4000-8000-000000000099','snapshot',plan_snapshot,'price','{}'::jsonb))
      from public.subscriptions where id='fa300000-0000-4000-8000-000000000001';
    raise exception 'Wrong owner accepted';
  exception when others then if sqlerrm <> 'Checkout ownership, status or snapshot mismatch' then raise; end if; end;
end; $$;
select pg_temp.assert_true(pg_temp.reserve()->>'external_reference' = pg_temp.reserve()->>'external_reference','retry uses one opaque reference');
select pg_temp.assert_true((select count(*)=1 from private.paypal_operations where subscription_id='fa300000-0000-4000-8000-000000000001'),'one operation');
select pg_temp.assert_true((select status='PENDING_PAYMENT' from public.subscriptions where id='fa300000-0000-4000-8000-000000000001'),'reserve cannot activate');
do $$ begin
  begin
    perform public.begin_subscription_checkout(id,'personal',plan_snapshot) from public.subscriptions where id='fa300000-0000-4000-8000-000000000001';
    raise exception 'Provider switched';
  exception when sqlstate '22023' then null; end;
end; $$;
select public.paypal_operation('attach','{"subscription_id":"fa300000-0000-4000-8000-000000000001","resource_id":"I-TEST"}');
create function pg_temp.event(event_id text, status text, seen timestamptz default now(), amount text default '25.00') returns jsonb language sql as $$
  select public.paypal_operation('event',jsonb_build_object('subscription_id','fa300000-0000-4000-8000-000000000001','resource_id','I-TEST',
    'event_id',event_id,'event_type','BILLING.SUBSCRIPTION.ACTIVATED','status',status,'provider_status','ACTIVE','verified_at',seen,
    'paid_at',now()-interval '1 day','period_end',now()+interval '29 days','amount',amount,'currency','USD'));
$$;
do $$ begin
  begin perform pg_temp.event('WRONG-AMOUNT','ACTIVE',now(),'1.00'); raise exception 'Activated wrong amount';
  exception when others then if sqlerrm <> 'Unverified payment' then raise; end if; end;
end; $$;
select pg_temp.assert_true(not exists(select 1 from private.paypal_events where event_id='WRONG-AMOUNT'),'invalid event rolls back');
select pg_temp.event('PAY-1','ACTIVE');
select pg_temp.assert_true((select status='ACTIVE' from public.subscriptions where id='fa300000-0000-4000-8000-000000000001'),'verified payment activates');
select pg_temp.assert_true(pg_temp.event('PAY-1','CANCELED')->>'duplicate'='true','event ID deduplicated');
select pg_temp.assert_true(pg_temp.event('OLD','CANCELED',now()-interval '1 hour')->>'stale'='true','stale snapshot ignored');
select pg_temp.event('CANCEL','CANCELED',now()+interval '1 second');
select pg_temp.event('LATE','ACTIVE',now()+interval '2 seconds');
select pg_temp.assert_true((select status='CANCELED' from public.subscriptions where id='fa300000-0000-4000-8000-000000000001'),'terminal contract cannot revive');
select pg_temp.assert_true(not has_function_privilege('anon','public.paypal_operation(text,jsonb)','EXECUTE'),'anon denied');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.paypal_operation(text,jsonb)','EXECUTE'),'user activation denied');
select pg_temp.assert_true(has_function_privilege('service_role','public.paypal_operation(text,jsonb)','EXECUTE'),'service allowed');
select pg_temp.assert_true(not has_table_privilege('authenticated','private.paypal_operations','SELECT'),'private operation hidden');
select pg_temp.assert_true((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in ('private.paypal_operations'::regclass,'private.paypal_events'::regclass)),'RLS forced');
rollback;
