\set ON_ERROR_STOP on
begin;

-- La versión legal vigente se lee de la base en lugar de fijarse acá: cada
-- revisión del paquete rompía estas pruebas. Se captura antes de cambiar de rol,
-- porque `authenticated` no alcanza el esquema private.
select version as terms_version
from private.legal_document_versions
where document_type = 'TERMS' and is_current \gset

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('cafecafe-0000-4000-8000-000000000011','authenticated','authenticated','quota-security@example.invalid','{}','{}',now(),now());
select public.accept_terms_from_signup_backend('cafecafe-0000-4000-8000-000000000011',:'terms_version');
insert into storage.objects(bucket_id,name) select 'professional-credentials','cafecafe-0000-4000-8000-000000000011/'||n||'.pdf' from generate_series(1,19) n;
select set_config('request.jwt.claims','{"sub":"cafecafe-0000-4000-8000-000000000011","role":"authenticated"}',true);
set local role authenticated;
insert into storage.objects(bucket_id,name) values ('professional-credentials','cafecafe-0000-4000-8000-000000000011/20.pdf');
do $$ begin
  if private.can_upload_credential_object('cafecafe-0000-4000-8000-000000000011/21.pdf') then raise exception 'Quota not enforced'; end if;
  if private.can_upload_credential_object('cafecafe-0000-4000-8000-000000000012/1.pdf') then raise exception 'Foreign path allowed'; end if;
  begin
    insert into storage.objects(bucket_id,name) values ('professional-credentials','cafecafe-0000-4000-8000-000000000011/21.pdf');
    raise exception 'RLS accepted object beyond quota';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS: object cap, foreign path denial, insert below cap' as result;
rollback;
