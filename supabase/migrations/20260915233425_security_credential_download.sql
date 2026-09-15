create or replace function private.admin_credential_object(p_credential_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select c.object_path from private.credentials c
  where c.id = p_credential_id and auth.uid() is not null
    and private.has_current_legal_acceptance()
    and private.has_any_role(array['ADMIN', 'SUPERADMIN']);
$$;
revoke all on function private.admin_credential_object(uuid) from public, anon, authenticated;
grant execute on function private.admin_credential_object(uuid) to authenticated;
create or replace function public.admin_credential_object(p_credential_id uuid)
returns text language sql stable security invoker set search_path = '' as $$
  select private.admin_credential_object(p_credential_id);
$$;
revoke all on function public.admin_credential_object(uuid) from public, anon;
grant execute on function public.admin_credential_object(uuid) to authenticated;

-- Keep authenticated downloads below the hosting response limit. Existing files are not modified.
update storage.buckets set file_size_limit = 4194304 where id = 'professional-credentials';

-- Bound stored objects per account, including uploads abandoned before submission.
create or replace function private.can_upload_credential_object(p_name text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_count bigint;
begin
  if v_uid is null or split_part(p_name, '/', 1) <> v_uid::text
    or not private.has_current_legal_acceptance() then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('credential-upload:' || v_uid::text, 0));
  select count(*) into v_count from storage.objects
    where bucket_id = 'professional-credentials' and split_part(name, '/', 1) = v_uid::text;
  return v_count < 20;
end;
$$;
revoke all on function private.can_upload_credential_object(text) from public, anon, authenticated;
grant execute on function private.can_upload_credential_object(text) to authenticated;
alter policy professional_credentials_insert_own on storage.objects
with check (bucket_id = 'professional-credentials' and private.can_upload_credential_object(name));
