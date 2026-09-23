\set ON_ERROR_STOP on
-- Isolated test DB only. No provider calls; all configuration and users roll back.
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',message; end if;
end $$;
create function pg_temp.expect_error(query text, expected_code text, expected_constraint text default null)
returns void language plpgsql as $$ declare actual_constraint text; begin
 begin execute query;
 exception when others then
  get stacked diagnostics actual_constraint=constraint_name;
  if sqlstate=expected_code and (expected_constraint is null or actual_constraint=expected_constraint) then return; end if;
  raise exception 'Expected % / %, got % / %',expected_code,expected_constraint,sqlstate,actual_constraint;
 end;
 raise exception 'Expected rejected operation';
end $$;
create function pg_temp.profile(headline text,bio text,status text) returns uuid
language plpgsql as $$ declare profile_id uuid:=gen_random_uuid(); begin
 insert into public.professional_profiles(id,slug,first_name,last_name,headline,bio,publication_status,published_at,is_demo)
 values(profile_id,'draft-check-'||profile_id,'Prueba','Aislada',headline,bio,status,
  case when status='PUBLISHED' then statement_timestamp() else null end,true);
 return profile_id;
end $$;

-- Every publication state retains both upper bounds; only draft/rejected allow short texts.
do $$ declare status text; begin
 foreach status in array array['DRAFT','REJECTED','PENDING_REVIEW','PUBLISHED','SUSPENDED'] loop
  perform pg_temp.profile(repeat('h',10),repeat('b',40),status);
  perform pg_temp.profile(repeat('h',180),repeat('b',6000),status);
  perform pg_temp.expect_error(format('select pg_temp.profile(%L,%L,%L)',repeat('h',181),repeat('b',40),status),'23514','professional_profiles_headline_check');
  perform pg_temp.expect_error(format('select pg_temp.profile(%L,%L,%L)',repeat('h',10),repeat('b',6001),status),'23514','professional_profiles_bio_check');
  if status in ('DRAFT','REJECTED') then
   perform pg_temp.profile('','',status);
   perform pg_temp.profile('prueba','prueba',status);
  else
   perform pg_temp.expect_error(format('select pg_temp.profile(%L,%L,%L)','',repeat('b',40),status),'23514','professional_profiles_headline_check');
   perform pg_temp.expect_error(format('select pg_temp.profile(%L,%L,%L)',repeat('h',10),'',status),'23514','professional_profiles_bio_check');
   perform pg_temp.expect_error(format('select pg_temp.profile(%L,%L,%L)',repeat('h',9),repeat('b',40),status),'23514','professional_profiles_headline_check');
   perform pg_temp.expect_error(format('select pg_temp.profile(%L,%L,%L)',repeat('h',10),repeat('b',39),status),'23514','professional_profiles_bio_check');
  end if;
 end loop;
end $$;
select pg_temp.expect_error($q$select pg_temp.profile(null,'','DRAFT')$q$,'23502');
select pg_temp.expect_error($q$select pg_temp.profile('',null,'DRAFT')$q$,'23502');

-- The authenticated owner can save a genuinely empty presentation and choose a plan.
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
values('e9130000-0000-4000-8000-000000000001','authenticated','authenticated','draft-payment@example.invalid','{}','{}');
insert into public.plans(id,code,name,price_amount,currency,billing_interval,pricing_status,payment_model,is_demo)
values('e9130000-0000-4000-8000-000000000002','DRAFT_PRESENTATION_QA','Plan transaccional QA',1,'ARS','MONTH','PUBLISHED','RECURRING',true);
insert into public.professional_profiles(id,user_id,slug,first_name,last_name,headline,bio,is_demo)
values('e9130000-0000-4000-8000-000000000003','e9130000-0000-4000-8000-000000000001','draft-presentation-payment-owner','Prueba','Aislada','','',true),
 ('e9130000-0000-4000-8000-000000000004',null,'draft-presentation-payment-other','Otra','Aislada','','',true);

-- Minimal existing submission requirements remain independently enforced.
insert into public.professional_types(id,code,slug,name)
values('e9130000-0000-4000-8000-000000000011','draft_payment_qa','draft-payment-qa','Tipo QA borrador');
insert into public.needs(id,code,slug,name)
values('e9130000-0000-4000-8000-000000000012','draft_payment_qa','draft-payment-qa','Necesidad QA borrador');
insert into public.services(id,code,slug,name)
values('e9130000-0000-4000-8000-000000000013','draft_payment_qa','draft-payment-qa','Servicio QA borrador');
insert into public.modalities(id,code,name)
values('e9130000-0000-4000-8000-000000000014','ONLINE','Modalidad QA borrador') on conflict(code) do nothing;
insert into public.languages(id,code,name)
values('e9130000-0000-4000-8000-000000000015','zz','Idioma QA borrador');
insert into public.professional_profile_types(professional_profile_id,professional_type_id)
values('e9130000-0000-4000-8000-000000000003','e9130000-0000-4000-8000-000000000011');
insert into public.professional_needs(professional_profile_id,need_id)
values('e9130000-0000-4000-8000-000000000003','e9130000-0000-4000-8000-000000000012');
insert into public.professional_services(professional_profile_id,service_id)
values('e9130000-0000-4000-8000-000000000003','e9130000-0000-4000-8000-000000000013');
insert into public.professional_modalities(professional_profile_id,modality_id)
select 'e9130000-0000-4000-8000-000000000003',id from public.modalities where code='ONLINE';
insert into public.professional_languages(professional_profile_id,language_id)
values('e9130000-0000-4000-8000-000000000003','e9130000-0000-4000-8000-000000000015');

set local role authenticated;
select set_config('request.jwt.claim.sub','e9130000-0000-4000-8000-000000000001',true);
select public.accept_current_terms('2026-09');
update public.professional_profiles set headline='prueba',bio='prueba' where id='e9130000-0000-4000-8000-000000000003';
update public.professional_profiles set headline='',bio='' where id='e9130000-0000-4000-8000-000000000003';
select pg_temp.assert_true(public.select_professional_plan('e9130000-0000-4000-8000-000000000003','DRAFT_PRESENTATION_QA') is not null,'Empty draft can select payment plan');
select pg_temp.assert_true((select count(*)=1 from public.subscriptions where professional_profile_id='e9130000-0000-4000-8000-000000000003' and status='PENDING_PAYMENT'),'Owner sees one pending subscription');
select pg_temp.expect_error($q$select public.select_professional_plan('e9130000-0000-4000-8000-000000000004','DRAFT_PRESENTATION_QA')$q$,'42501');
select pg_temp.expect_error($q$select public.submit_professional_profile('e9130000-0000-4000-8000-000000000003')$q$,'23514');
select pg_temp.assert_true((select publication_status='DRAFT' and headline='' and bio='' from public.my_professional_profile()),'Failed submission leaves genuine empty draft intact');
select pg_temp.expect_error($q$update public.professional_profiles set linkedin_url='prueba' where id='e9130000-0000-4000-8000-000000000003'$q$,'23514','professional_profiles_linkedin_url_check');
select pg_temp.expect_error($q$update public.professional_profiles set website_url='http://example.invalid' where id='e9130000-0000-4000-8000-000000000003'$q$,'23514','professional_profiles_website_url_check');
reset role;
select pg_temp.assert_true(public.begin_subscription_checkout(id,'personal',plan_snapshot),'Empty draft can reserve checkout without provider call')
from public.subscriptions where professional_profile_id='e9130000-0000-4000-8000-000000000003';

set local role authenticated;
update public.professional_profiles set headline=repeat('h',10),bio=repeat('b',40) where id='e9130000-0000-4000-8000-000000000003';
select public.submit_professional_profile('e9130000-0000-4000-8000-000000000003');
select pg_temp.assert_true((select publication_status='PENDING_REVIEW' from public.my_professional_profile()),'Completed draft can submit for review');
select pg_temp.expect_error($q$update public.professional_profiles set headline='' where id='e9130000-0000-4000-8000-000000000003'$q$,'23514','professional_profiles_headline_check');
select pg_temp.assert_true((select status='PENDING_PAYMENT' and current_period_end is null from public.subscriptions where professional_profile_id='e9130000-0000-4000-8000-000000000003'),'Submission never fabricates paid period');
reset role;
select 'PASS: draft presentation boundaries, ownership, payment reservation and review guards' as result;
rollback;
