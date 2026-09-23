\set ON_ERROR_STOP on
-- Run only on an isolated Supabase test project. Every fixture is rolled back.
begin;
create function pg_temp.assert_true(p_ok boolean, p_message text) returns void
language plpgsql as $$ begin
  if p_ok is distinct from true then raise exception 'FAIL: %', p_message; end if;
end; $$;
create function pg_temp.expect_error(p_sql text, p_code text) returns void
language plpgsql as $$ begin
  begin execute p_sql;
  exception when others then
    if sqlstate = p_code then return; end if;
    raise exception 'Expected SQLSTATE %, got %: %', p_code, sqlstate, sqlerrm;
  end;
  raise exception 'Expected SQLSTATE %, operation succeeded', p_code;
end; $$;

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values ('f1000000-0000-4000-8000-000000000001','authenticated','authenticated','payment-fixture@example.invalid','{}','{}');
insert into public.professional_profiles(id,user_id,slug,first_name,last_name,headline,bio,is_demo)
select ('f2000000-0000-4000-8000-00000000000' || i)::uuid,
  case when i = 1 then 'f1000000-0000-4000-8000-000000000001'::uuid end,
  'payment-fixture-' || i,'Prueba','Pagos','Perfil de prueba aislada',
  'Perfil transaccional de prueba de pagos que no se publica.',true
from generate_series(1,4) i;
insert into public.subscriptions(id,professional_profile_id,plan_id,plan_snapshot,is_demo)
select ('f3000000-0000-4000-8000-00000000000' || i)::uuid,
  ('f2000000-0000-4000-8000-00000000000' || i)::uuid,p.id,
  jsonb_build_object('code',p.code,'name',p.name,'pricing_status','PUBLISHED',
    'price_amount',p.price_amount,'currency',p.currency,'billing_interval','MONTH',
    'payment_model','RECURRING','grace_period_days',3),true
from public.plans p cross join generate_series(1,4) i where code='PROFESSIONAL_MONTHLY';

create function pg_temp.payment(
  p_event text, p_status text, p_time timestamptz, p_paid timestamptz,
  p_payment text default 'pay-1', p_sub uuid default 'f3000000-0000-4000-8000-000000000001',
  p_account text default 'personal', p_amount numeric default 120000,
  p_currency text default 'ARS', p_resource text default 'pre-1',
  p_created timestamptz default null
) returns boolean language sql as $$
select public.apply_subscription_payment_event(p_resource,p_event,p_status,p_paid,
 jsonb_build_object('date_created',coalesce(p_created,p_time)),p_time,
 p_account,p_sub,p_amount,p_currency,'subscription_authorized_payment',p_payment);
$$;
create function pg_temp.preapproval(p_event text,p_status text,p_time timestamptz)
returns boolean language sql as $$
select public.apply_subscription_webhook_event('pre-1',p_event,'subscription_preapproval',p_status,
 null,null,null,'{}',p_time,'personal','f3000000-0000-4000-8000-000000000001',120000,'ARS');
$$;

-- Grant surface and RLS: no sensitive table or backend function is available
-- to anonymous visitors or authenticated professionals.
do $$ declare r record; begin
  for r in select oid::regprocedure signature from pg_proc
    where pronamespace in ('public'::regnamespace,'private'::regnamespace)
    and proname in ('begin_subscription_checkout','attach_subscription_checkout',
      'apply_subscription_webhook_event','apply_subscription_payment_event') loop
    perform pg_temp.assert_true(not has_function_privilege('anon',r.signature,'EXECUTE'), 'anon RPC denied');
    perform pg_temp.assert_true(not has_function_privilege('authenticated',r.signature,'EXECUTE'), 'user RPC denied');
    perform pg_temp.assert_true(has_function_privilege('service_role',r.signature,'EXECUTE'), 'backend RPC allowed');
  end loop;
  for r in select c.oid,c.relrowsecurity,c.relforcerowsecurity from pg_class c
    where c.relnamespace='private'::regnamespace and c.relname in
      ('subscription_payment_state','subscription_payment_receipts','subscription_events','payment_customers','plan_provider_mappings') loop
    perform pg_temp.assert_true(r.relrowsecurity and r.relforcerowsecurity,'private RLS enabled and forced');
    perform pg_temp.assert_true(not has_table_privilege('anon',r.oid,'SELECT'),'anon table denied');
    perform pg_temp.assert_true(not has_table_privilege('authenticated',r.oid,'SELECT'),'user table denied');
  end loop;
end; $$;

select pg_temp.expect_error($q$select pg_temp.payment('early','approved','2026-09-01','2026-09-01')$q$,'P0002');
select pg_temp.assert_true(not exists(select 1 from private.subscription_events where external_event_id='early'),'early notification not consumed');
select pg_temp.assert_true(public.begin_subscription_checkout(id,'personal',plan_snapshot),'first reservation succeeds')
from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(not public.begin_subscription_checkout(id,'personal',plan_snapshot),'retry cannot repeat provider POST')
from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.expect_error($q$select public.begin_subscription_checkout(id,'company',plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000001'$q$,'22023');
select public.attach_subscription_checkout(id,'personal','pre-1',null,plan_snapshot)
from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select public.attach_subscription_checkout(id,'personal','pre-1',null,plan_snapshot)
from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.expect_error($q$select public.attach_subscription_checkout(id,'personal','pre-replaced',null,plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000001'$q$,'22023');
select pg_temp.expect_error($q$select public.attach_subscription_checkout('f3000000-0000-4000-8000-000000000001','personal','pre-1',null,'{}')$q$,'22023');
delete from private.subscription_payment_state where subscription_id='f3000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(not public.begin_subscription_checkout(id,'personal',plan_snapshot),'legacy linked resource never grants a new provider POST') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select public.accept_current_terms('2026-08');
select pg_temp.assert_true(public.select_professional_plan('f2000000-0000-4000-8000-000000000001','PROFESSIONAL_MONTHLY')='f3000000-0000-4000-8000-000000000001','same plan reuses immutable reserved checkout');
select pg_temp.expect_error($q$select public.select_professional_plan('f2000000-0000-4000-8000-000000000001','PROFESSIONAL_6M')$q$,'22023');
reset role;

select pg_temp.preapproval('authorized','ACTIVE','2026-09-01');
select pg_temp.assert_true(status='PENDING_PAYMENT','authorization alone does not activate') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.expect_error($q$select pg_temp.payment('wrong-account','approved','2026-09-01','2026-09-01','pay-1','f3000000-0000-4000-8000-000000000001','company')$q$,'22023');
select pg_temp.expect_error($q$select pg_temp.payment('wrong-amount','approved','2026-09-01','2026-09-01','pay-1','f3000000-0000-4000-8000-000000000001','personal',1)$q$,'22023');
select pg_temp.expect_error($q$select pg_temp.payment('wrong-currency','approved','2026-09-01','2026-09-01','pay-1','f3000000-0000-4000-8000-000000000001','personal',120000,'USD')$q$,'22023');
select pg_temp.expect_error($q$select pg_temp.payment('wrong-resource','approved','2026-09-01','2026-09-01','pay-1','f3000000-0000-4000-8000-000000000001','personal',120000,'ARS','pre-other')$q$,'22023');
select pg_temp.assert_true(not exists(select 1 from private.subscription_events where external_event_id like 'wrong-%'),'invalid events do not commit ledger rows');

select pg_temp.assert_true(pg_temp.payment('early','approved','2026-09-01','2026-09-01'),'early notification succeeds after attach');
select pg_temp.assert_true(not pg_temp.payment('early','approved','2026-09-01','2026-09-01'),'exact duplicate ignored');
select pg_temp.payment('different-notification-same-payment','approved','2026-09-02','2026-09-01');
select pg_temp.payment('stale-rejection','rejected','2026-08-31',null);
select pg_temp.assert_true(status='ACTIVE' and last_payment_at='2026-09-01'::timestamptz
 and current_period_end='2026-10-01'::timestamptz,'duplicate payment never extends period; stale rejection cannot regress')
from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.payment('new-rejection','rejected','2026-10-01',null,'pay-2');
select pg_temp.assert_true(status='PAST_DUE' and grace_period_ends_at='2026-10-04'::timestamptz,'new rejection starts grace once') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.payment('retry-approved','approved','2026-10-02','2026-10-02','pay-2');
select pg_temp.assert_true(status='ACTIVE' and current_period_end='2026-11-02'::timestamptz and grace_period_ends_at is null,'approved retry restores paid benefits') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.payment('old-charge-late-rejection','rejected','2026-10-03',null,'pay-old','f3000000-0000-4000-8000-000000000001','personal',120000,'ARS','pre-1','2026-09-01');
select pg_temp.assert_true(status='ACTIVE','old charge rejected after newer approval cannot regress subscription') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.payment('refund-old-payment','refunded','2026-10-03',null,'pay-1');
select pg_temp.assert_true(status='ACTIVE','refund of old payment cannot revoke newer paid period') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.payment('refund-current-payment','refunded','2026-10-04',null,'pay-2');
select pg_temp.assert_true(status='PAUSED','refund current payment pauses benefits') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.payment('refund-replay-approved','approved','2026-10-05','2026-10-05','pay-2');
select pg_temp.assert_true(status='PAUSED' and last_payment_at='2026-10-02'::timestamptz,'refunded resource cannot activate again') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';
select pg_temp.preapproval('cancel','CANCELED','2026-10-05');
select pg_temp.preapproval('late-authorized','ACTIVE','2026-10-06');
select pg_temp.payment('late-payment','approved','2026-11-01','2026-11-01','pay-3');
select pg_temp.assert_true(status='CANCELED' and current_period_end='2026-11-02'::timestamptz,'terminal cancellation is not revived or extended') from public.subscriptions where id='f3000000-0000-4000-8000-000000000001';

-- Same provider resource identifier and notification identifier in another
-- account are independent. In the same account a payment cannot be reassigned.
select public.begin_subscription_checkout(id,'company',plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000002';
select public.attach_subscription_checkout(id,'company','pre-1',null,plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000002';
select pg_temp.assert_true(pg_temp.payment('early','approved','2026-09-01','2026-09-01','pay-1','f3000000-0000-4000-8000-000000000002','company'),'account namespaces prevent collisions');
select public.begin_subscription_checkout(id,'personal',plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000003';
select public.attach_subscription_checkout(id,'personal','pre-3',null,plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000003';
select pg_temp.expect_error($q$select pg_temp.payment('stolen','approved','2026-11-02','2026-11-02','pay-1','f3000000-0000-4000-8000-000000000003','personal',120000,'ARS','pre-3')$q$,'22023');
select pg_temp.payment('mediation','in_mediation','2026-11-02',null,'pay-mediation','f3000000-0000-4000-8000-000000000003','personal',120000,'ARS','pre-3');
select pg_temp.assert_true(status='PENDING_PAYMENT','mediation is neutral and never activates') from public.subscriptions where id='f3000000-0000-4000-8000-000000000003';
-- Legacy approved payment predates the new receipt ledger. The authoritative
-- refund's approval timestamp ties it to the latest historical paid period.
update public.subscriptions set status='ACTIVE',last_payment_at='2026-09-01',current_period_start='2026-09-01',current_period_end='2026-10-01' where id='f3000000-0000-4000-8000-000000000003';
select pg_temp.payment('legacy-refund','refunded','2026-09-03','2026-09-01','pay-legacy','f3000000-0000-4000-8000-000000000003','personal',120000,'ARS','pre-3');
select pg_temp.assert_true(status='PAUSED','refund of latest legacy payment pauses without an existing receipt') from public.subscriptions where id='f3000000-0000-4000-8000-000000000003';

-- A DRAFT plan never gets a provider reservation, even with an injected price.
update public.subscriptions set plan_snapshot=plan_snapshot || '{"pricing_status":"DRAFT"}' where id='f3000000-0000-4000-8000-000000000004';
select pg_temp.expect_error($q$select public.begin_subscription_checkout(id,'personal',plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000004'$q$,'22023');

-- Synthetic one-time snapshot only inside this rolled-back transaction;
-- catalog prices and DRAFT business plans remain untouched.
update public.subscriptions set plan_snapshot=plan_snapshot || '{"pricing_status":"PUBLISHED","payment_model":"ONE_TIME","billing_interval":"YEAR"}' where id='f3000000-0000-4000-8000-000000000004';
select public.begin_subscription_checkout(id,'personal',plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000004';
select public.attach_subscription_checkout(id,'personal',id::text,'preference-test',plan_snapshot) from public.subscriptions where id='f3000000-0000-4000-8000-000000000004';
select public.apply_subscription_payment_event('f3000000-0000-4000-8000-000000000004','once','approved','2026-09-01','{}','2026-09-01','personal','f3000000-0000-4000-8000-000000000004',120000,'ARS','payment','one-time-1');
select public.apply_subscription_payment_event('f3000000-0000-4000-8000-000000000004','twice','approved','2026-09-02','{}','2026-09-02','personal','f3000000-0000-4000-8000-000000000004',120000,'ARS','payment','one-time-2');
select pg_temp.assert_true(status='ACTIVE' and current_period_end='2027-09-01'::timestamptz,'extra payment does not extend one-time term twice') from public.subscriptions where id='f3000000-0000-4000-8000-000000000004';

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select pg_temp.expect_error($q$select public.select_professional_plan('f2000000-0000-4000-8000-000000000002','PROFESSIONAL_MONTHLY')$q$,'42501');
select pg_temp.expect_error($q$select public.begin_subscription_checkout('f3000000-0000-4000-8000-000000000001','personal','{}')$q$,'42501');
select pg_temp.expect_error($q$select * from private.subscription_events$q$,'42501');
select pg_temp.assert_true((select count(*)=1 from public.subscriptions),'RLS sees own subscription only');
reset role;
select pg_temp.assert_true(not exists(select 1 from private.subscription_events where external_event_id in ('stolen','wrong-account')),'failed operations are atomic');
select 'PASS: payment persistence, isolation, transitions and RPC permissions' as result;
rollback;
