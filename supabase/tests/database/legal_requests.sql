\set ON_ERROR_STOP on
begin;
do $$ begin
 if has_function_privilege('anon','public.create_legal_request_from_backend(text,text,text,text)','EXECUTE') then raise exception 'Anonymous intake RPC exposed'; end if;
 if has_function_privilege('authenticated','public.create_legal_request_from_backend(text,text,text,text)','EXECUTE') then raise exception 'Authenticated intake RPC exposed'; end if;
 if has_table_privilege('authenticated','private.legal_requests','SELECT') then raise exception 'PII exposed'; end if;
end $$;
set local role service_role;
do $$ declare a uuid; b uuid; begin
 a := public.create_legal_request_from_backend('CANCELLATION','qa@example.invalid','Pedido sintético de baja',repeat('a',64));
 b := public.create_legal_request_from_backend('CANCELLATION','qa@example.invalid','Pedido sintético de baja',repeat('a',64));
 if a <> b then raise exception 'Idempotency failed'; end if;
end $$;
reset role;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('bafebafe-0000-4000-8000-000000000001','authenticated','authenticated','legal-admin@example.invalid','{}','{}',now(),now());
insert into public.user_roles(user_id,role_id) select 'bafebafe-0000-4000-8000-000000000001',id from public.roles where code='ADMIN';
insert into auth.sessions(id,user_id,aal) values ('bafebafe-0000-4000-8000-000000000002','bafebafe-0000-4000-8000-000000000001','aal2');
select set_config('request.jwt.claims','{"sub":"bafebafe-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"bafebafe-0000-4000-8000-000000000002"}',true);
set local role authenticated;
do $$ begin
 begin perform public.admin_legal_requests(); raise exception 'AAL1 leaked requests'; exception when insufficient_privilege then null; end;
 begin perform public.admin_update_legal_request(gen_random_uuid(),'RESOLVED','Forbidden update'); raise exception 'AAL1 updated request'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"bafebafe-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"bafebafe-0000-4000-8000-000000000002"}',true);
set local role authenticated;
do $$ declare r record; begin
 select * into r from public.admin_legal_requests() where email='qa@example.invalid';
 if r.id is null then raise exception 'Admin cannot read'; end if;
 perform public.admin_update_legal_request(r.id,'IN_PROGRESS','Verificación pendiente de identidad.');
end $$;
reset role;
do $$ begin
 if (select count(*) from private.legal_request_events where note='Verificación pendiente de identidad.')<>1 then raise exception 'Audit missing'; end if;
end $$;
delete from auth.sessions where id='bafebafe-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
 begin perform public.admin_legal_requests(); raise exception 'Revoked session leaked requests'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: private intake, idempotency, MFA, audit and revoked session' as result;
rollback;
