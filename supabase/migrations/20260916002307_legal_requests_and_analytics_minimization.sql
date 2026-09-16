-- Requests contain PII: private storage, backend-only intake, MFA-protected administration.
create table private.legal_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('CANCELLATION','WITHDRAWAL','ACCESS','CORRECTION','DELETION','COMPLAINT')),
  email text not null check (length(email) between 3 and 254),
  message text not null check (length(message) between 10 and 2000),
  key_hash text not null unique check (length(key_hash) = 64),
  created_at timestamptz not null default now(),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','RESOLVED')),
  resolution text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table private.legal_requests enable row level security;
revoke all on private.legal_requests from public, anon, authenticated;
create index legal_requests_queue on private.legal_requests(status,created_at);

create function public.create_legal_request_from_backend(p_kind text,p_email text,p_message text,p_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if length(p_email) > 254 or position('@' in p_email)=0 then raise exception 'Invalid email'; end if;
  insert into private.legal_requests(kind,email,message,key_hash) values(p_kind,lower(trim(p_email)),trim(p_message),p_key)
  on conflict(key_hash) do update set key_hash=excluded.key_hash returning id into result;
  return result;
end; $$;
revoke all on function public.create_legal_request_from_backend(text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_legal_request_from_backend(text,text,text,text) to service_role;

create function public.admin_legal_requests()
returns table(id uuid,kind text,email text,message text,created_at timestamptz,status text,resolution text)
language plpgsql security definer set search_path='' as $$
begin
 if not private.has_any_role(array['ADMIN','SUPERADMIN']) then raise exception 'Forbidden' using errcode='42501'; end if;
 return query select r.id,r.kind,r.email,r.message,r.created_at,r.status,r.resolution from private.legal_requests r
 order by case when r.status='RESOLVED' then 1 else 0 end,r.created_at asc limit 200;
end; $$;
revoke all on function public.admin_legal_requests() from public,anon;
grant execute on function public.admin_legal_requests() to authenticated;

create table private.legal_request_events (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references private.legal_requests(id),
 actor_id uuid references auth.users(id) on delete set null, status text not null, note text not null, created_at timestamptz not null default now()
);
alter table private.legal_request_events enable row level security;
revoke all on private.legal_request_events from public,anon,authenticated;
create function public.admin_update_legal_request(p_id uuid,p_status text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_any_role(array['ADMIN','SUPERADMIN']) then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_status not in ('OPEN','IN_PROGRESS','RESOLVED') or p_status is null or p_note is null or length(trim(p_note)) not between 10 and 2000 then raise exception 'Invalid input'; end if;
 update private.legal_requests set status=p_status,resolution=trim(p_note),updated_at=now(),updated_by=auth.uid() where id=p_id;
 if not found then raise exception 'Not found'; end if;
 insert into private.legal_request_events(request_id,actor_id,status,note) values(p_id,auth.uid(),p_status,trim(p_note));
end; $$;
revoke all on function public.admin_update_legal_request(uuid,text,text) from public,anon;
grant execute on function public.admin_update_legal_request(uuid,text,text) to authenticated;
