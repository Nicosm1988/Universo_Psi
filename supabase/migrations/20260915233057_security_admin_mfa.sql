-- Administrative permissions require MFA and a non-revoked session even over direct REST/RPC.
create or replace function private.has_any_role(p_role_codes text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid()) and r.code = any(p_role_codes)
      and (r.code not in ('ADMIN', 'SUPERADMIN') or (
        (select auth.jwt()->>'aal') = 'aal2' and exists (
          select 1 from auth.sessions s
          where s.id::text = (select auth.jwt()->>'session_id')
            and s.user_id = (select auth.uid())
            and (s.not_after is null or s.not_after > statement_timestamp())
        )
      ))
  );
$$;
revoke all on function private.has_any_role(text[]) from public, anon, authenticated;
grant execute on function private.has_any_role(text[]) to anon, authenticated, service_role;

create or replace function public.has_current_admin_session()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.has_any_role(array['ADMIN', 'SUPERADMIN']);
$$;
revoke all on function public.has_current_admin_session() from public, anon;
grant execute on function public.has_current_admin_session() to authenticated;

-- This event-trigger function is managed by the platform, not an application endpoint.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
