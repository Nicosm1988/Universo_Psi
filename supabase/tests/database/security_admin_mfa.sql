\set ON_ERROR_STOP on
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('cafecafe-0000-4000-8000-000000000001','authenticated','authenticated','mfa-security@example.invalid','{}','{}',now(),now());
insert into public.user_roles(user_id,role_id)
select 'cafecafe-0000-4000-8000-000000000001',id from public.roles where code='ADMIN' on conflict do nothing;
insert into auth.sessions(id,user_id,aal) values ('cafecafe-0000-4000-8000-000000000002','cafecafe-0000-4000-8000-000000000001','aal2');
select set_config('request.jwt.claims','{"sub":"cafecafe-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"cafecafe-0000-4000-8000-000000000002"}',true);
set local role authenticated;
do $$ begin
  if public.has_current_admin_session() then raise exception 'AAL1 admin bypass'; end if;
  if not private.has_any_role(array['USER']) then raise exception 'Normal role broken'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"cafecafe-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"cafecafe-0000-4000-8000-000000000002"}',true);
set local role authenticated;
do $$ begin
  if not public.has_current_admin_session() then raise exception 'Valid admin denied'; end if;
end $$;
reset role;
delete from auth.sessions where id='cafecafe-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
  if public.has_current_admin_session() then raise exception 'Revoked session accepted'; end if;
end $$;
reset role;
select 'PASS: AAL1 denied, AAL2 accepted, revoked session denied, normal roles preserved' as result;
rollback;
