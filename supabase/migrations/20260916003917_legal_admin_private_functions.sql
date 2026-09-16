-- Keep privileged implementations outside the exposed API schema.
-- Their existing MFA/role/session authorization remains mandatory.
alter function public.admin_legal_requests() set schema private;
alter function public.admin_update_legal_request(uuid,text,text) set schema private;

create function public.admin_legal_requests()
returns table(id uuid,kind text,email text,message text,created_at timestamptz,status text,resolution text)
language sql security invoker set search_path='' as $$
  select * from private.admin_legal_requests();
$$;
revoke all on function public.admin_legal_requests() from public,anon;
grant execute on function public.admin_legal_requests() to authenticated;

create function public.admin_update_legal_request(p_id uuid,p_status text,p_note text)
returns void language sql security invoker set search_path='' as $$
  select private.admin_update_legal_request(p_id,p_status,p_note);
$$;
revoke all on function public.admin_update_legal_request(uuid,text,text) from public,anon;
grant execute on function public.admin_update_legal_request(uuid,text,text) to authenticated;
