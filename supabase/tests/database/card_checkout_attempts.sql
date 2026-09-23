\set ON_ERROR_STOP on
-- Isolated local/test project only. No card token, provider request or real identity.
begin;
create function pg_temp.assert_true(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
create function pg_temp.expect_error(query text,expected text) returns void language plpgsql as $$
begin
 begin execute query; exception when others then
  if sqlstate=expected then return; end if;
  raise exception 'Expected %, got %',expected,sqlstate;
 end;
 raise exception 'Expected failure';
end $$;

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
values('e9140000-0000-4000-8000-000000000001','authenticated','authenticated','card-lease-fixture@example.invalid','{}','{}');
insert into public.plans(id,code,name,price_amount,currency,billing_interval,pricing_status,payment_model,is_demo)
values('e9140000-0000-4000-8000-000000000002','CARD_LEASE_QA','Plan transaccional QA',1,'ARS','MONTH','PUBLISHED','RECURRING',true);
insert into public.professional_profiles(id,user_id,slug,first_name,last_name,headline,bio,is_demo)
select ('e9140000-0000-4000-8000-00000000001'||i)::uuid,
 case when i=3 then 'e9140000-0000-4000-8000-000000000001'::uuid else null end,
 'card-lease-fixture-'||i,'Prueba','Aislada','Perfil aislado de prueba','Presentación de prueba aislada para reservas de tarjeta.',true
from generate_series(1,4)i;
insert into public.subscriptions(id,professional_profile_id,plan_id,plan_snapshot,is_demo)
select ('e9140000-0000-4000-8000-00000000002'||i)::uuid,
 ('e9140000-0000-4000-8000-00000000001'||i)::uuid,'e9140000-0000-4000-8000-000000000002',
 jsonb_build_object('code','CARD_LEASE_QA','name','Plan transaccional QA','price_amount',1,'currency','ARS',
 'billing_interval','MONTH','pricing_status','PUBLISHED','payment_model','RECURRING','grace_period_days',3),true
from generate_series(1,4)i;
create function pg_temp.reserve(sub uuid) returns table(may_create boolean,attempt_id uuid)
language sql as $$ select * from public.reserve_card_checkout(sub,'personal',(select plan_snapshot from public.subscriptions where id=sub)); $$;
create temporary table claims(label text primary key,attempt_id uuid);
insert into claims select 'first',attempt_id from pg_temp.reserve('e9140000-0000-4000-8000-000000000021') where may_create;
select pg_temp.assert_true((select count(*)=1 and bool_and(attempt_id is not null) from claims),'first request receives its own fencing token');
select pg_temp.assert_true(not may_create and attempt_id is null,'retry cannot see or own the active token') from pg_temp.reserve('e9140000-0000-4000-8000-000000000021');
select pg_temp.assert_true(not public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000021',gen_random_uuid(),400),'random attempt cannot release');
select pg_temp.assert_true(not public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000022',(select attempt_id from claims where label='first'),400),'attempt is scoped to its subscription');
do $$ declare code integer; begin
 foreach code in array array[200,401,403,404,408,409,429,500,502,503,504] loop
  perform pg_temp.expect_error(format('select public.release_failed_card_checkout(%L,%L,%s)','e9140000-0000-4000-8000-000000000021',(select attempt_id::text from claims where label='first'),code),'22023');
 end loop;
end $$;
select pg_temp.expect_error($q$select public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000021',null,400)$q$,'22023');
select pg_temp.expect_error($q$select public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000021',(select attempt_id from claims where label='first'),null)$q$,'22023');

-- Elapsed time never reopens an ambiguous provider request.
update private.subscription_payment_state set checkout_reserved_at=statement_timestamp()-interval '7 days'
where subscription_id='e9140000-0000-4000-8000-000000000021';
select pg_temp.assert_true(not may_create and attempt_id is null,'expired wall clock does not release ambiguous request') from pg_temp.reserve('e9140000-0000-4000-8000-000000000021');
select pg_temp.assert_true(public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000021',(select attempt_id from claims where label='first'),400),'definitive 400 releases only its request');
select pg_temp.assert_true(not public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000021',(select attempt_id from claims where label='first'),400),'repeat release is harmless');
insert into claims select 'second',attempt_id from pg_temp.reserve('e9140000-0000-4000-8000-000000000021') where may_create;
select pg_temp.assert_true((select count(distinct attempt_id)=2 from claims),'new attempt gets a new token');
select pg_temp.assert_true(not public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000021',(select attempt_id from claims where label='first'),422),'late old rejection cannot unlock newer attempt');
select pg_temp.assert_true(public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000021',(select attempt_id from claims where label='second'),422),'definitive 422 can release current attempt');
insert into claims select 'third',attempt_id from pg_temp.reserve('e9140000-0000-4000-8000-000000000021') where may_create;
select public.attach_subscription_checkout(id,'personal','card-lease-created',null,plan_snapshot)
from public.subscriptions where id='e9140000-0000-4000-8000-000000000021';
select pg_temp.assert_true(not public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000021',(select attempt_id from claims where label='third'),400),'linked resource cannot be released');
select pg_temp.assert_true(not may_create and attempt_id is null,'linked resource cannot create another attempt') from pg_temp.reserve('e9140000-0000-4000-8000-000000000021');
select pg_temp.assert_true((select count(*)=3 and count(released_at)=2 from private.card_checkout_attempts where subscription_id='e9140000-0000-4000-8000-000000000021'),'all prior attempts and rejection statuses are preserved');
select pg_temp.assert_true((select provider_account='personal' and (plan_snapshot->>'price_amount')::numeric=1 and status='PENDING_PAYMENT' and current_period_end is null from public.subscriptions where id='e9140000-0000-4000-8000-000000000021'),'release does not change account, snapshot or paid state');

-- Legacy reservations have no fencing token and are never released by this API.
select public.begin_subscription_checkout(id,'personal',plan_snapshot) from public.subscriptions where id='e9140000-0000-4000-8000-000000000022';
select pg_temp.assert_true(not may_create and attempt_id is null,'legacy reservation remains closed') from pg_temp.reserve('e9140000-0000-4000-8000-000000000022');
select pg_temp.assert_true(not public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000022',(select attempt_id from claims where label='third'),400),'legacy reservation has no releasable owner');

-- A failure after the established reservation guard must roll account/state back too.
alter table private.card_checkout_attempts add constraint qa_force_attempt_failure
  check(subscription_id<>'e9140000-0000-4000-8000-000000000024'::uuid);
select pg_temp.expect_error($q$select * from pg_temp.reserve('e9140000-0000-4000-8000-000000000024')$q$,'23514');
select pg_temp.assert_true(not exists(select 1 from private.subscription_payment_state where subscription_id='e9140000-0000-4000-8000-000000000024'),'failed attempt insert rolls back reservation state');
select pg_temp.assert_true((select provider_account is null from public.subscriptions where id='e9140000-0000-4000-8000-000000000024'),'failed attempt insert rolls back provider account');
alter table private.card_checkout_attempts drop constraint qa_force_attempt_failure;
select pg_temp.expect_error($q$insert into private.card_checkout_attempts(subscription_id,provider_account,released_at) values('e9140000-0000-4000-8000-000000000024','personal',statement_timestamp())$q$,'23514');

-- Backend-only permissions; private ledger has no application-user grants.
do $$ declare r record; begin
 for r in select p.oid,p.prosecdef,p.proconfig,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where p.proname in ('reserve_card_checkout','release_failed_card_checkout') and n.nspname in ('public','private') loop
  perform pg_temp.assert_true(not has_function_privilege('anon',r.oid,'EXECUTE') and not has_function_privilege('authenticated',r.oid,'EXECUTE') and has_function_privilege('service_role',r.oid,'EXECUTE'),'backend-only EXECUTE');
  perform pg_temp.assert_true(r.prosecdef=(r.nspname='private') and r.proconfig=array['search_path=""']::text[],'definer boundary and search path');
 end loop;
end $$;
select pg_temp.assert_true((select relrowsecurity and relforcerowsecurity from pg_class where oid='private.card_checkout_attempts'::regclass),'ledger RLS forced');
select pg_temp.assert_true(not has_table_privilege('authenticated','private.card_checkout_attempts','SELECT,INSERT,UPDATE,DELETE') and not has_table_privilege('anon','private.card_checkout_attempts','SELECT,INSERT,UPDATE,DELETE'),'private ledger is not exposed');
set local role authenticated;
select set_config('request.jwt.claim.sub','e9140000-0000-4000-8000-000000000001',true);
select pg_temp.expect_error($q$select * from public.reserve_card_checkout('e9140000-0000-4000-8000-000000000023','personal','{}')$q$,'42501');
select pg_temp.expect_error($q$select public.release_failed_card_checkout('e9140000-0000-4000-8000-000000000023',gen_random_uuid(),400)$q$,'42501');
reset role;

-- A confirmed cancellation preserves the old resource; selecting a plan creates a new local subscription.
select public.begin_subscription_checkout(id,'personal',plan_snapshot) from public.subscriptions where id='e9140000-0000-4000-8000-000000000023';
select public.attach_subscription_checkout(id,'personal','hosted-lease-old',null,plan_snapshot) from public.subscriptions where id='e9140000-0000-4000-8000-000000000023';
select public.apply_subscription_webhook_event('hosted-lease-old','hosted-lease-cancelled','subscription_preapproval','CANCELED',null,null,null,'{}',statement_timestamp(),'personal','e9140000-0000-4000-8000-000000000023',1,'ARS');
set local role authenticated;
select public.accept_current_terms('2026-08');
select pg_temp.assert_true(public.select_professional_plan('e9140000-0000-4000-8000-000000000013','CARD_LEASE_QA')<>'e9140000-0000-4000-8000-000000000023'::uuid,'cancelled hosted checkout gets a new local subscription');
select pg_temp.assert_true((select count(*)=1 from public.subscriptions where professional_profile_id='e9140000-0000-4000-8000-000000000013' and status='PENDING_PAYMENT'),'exactly one current pending replacement');
select pg_temp.assert_true((select status='CANCELED' and provider_subscription_id='hosted-lease-old' and (plan_snapshot->>'price_amount')::numeric=1 from public.subscriptions where id='e9140000-0000-4000-8000-000000000023'),'cancelled historical row and snapshot retained');
reset role;
select 'PASS: card checkout fencing, definitive rejection, private grants and cancelled replacement' as result;
rollback;
