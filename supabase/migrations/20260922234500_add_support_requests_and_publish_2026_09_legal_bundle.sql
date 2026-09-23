begin;

-- ---------------------------------------------------------------------------
-- Formulario de contacto de la plataforma
--
-- Canal general: reportes de perfiles o contenidos, avisos de seguridad (la
-- cláusula 3.n de los términos exige un canal para divulgar vulnerabilidades),
-- soporte y consultas comerciales.
--
-- Los derechos sobre datos, la baja y el arrepentimiento NO pasan por acá:
-- siguen en `private.legal_requests` vía `/solicitudes`, que ya entrega
-- constancia y deja eventos inmutables. Son pedidos con plazos legales y su
-- rastro no debe partirse entre dos bandejas.
--
-- Aun así el pedido se persiste antes de cualquier aviso por correo: un reporte
-- de contenido no puede perderse porque el proveedor de email no responda.
--
-- La tabla vive en `private` porque guarda datos de contacto y el cuerpo del
-- mensaje. Se lee sólo desde funciones definidas o con service_role.
-- ---------------------------------------------------------------------------
create table private.support_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid references public.user_profiles(id) on delete set null,
  topic text not null check (
    topic in ('REPORTE', 'SEGURIDAD', 'SOPORTE', 'COMERCIAL', 'OTRO')
  ),
  status text not null default 'NEW'
    check (status in ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (position('@' in email) > 1 and char_length(email) <= 320),
  message text not null check (char_length(message) between 20 and 4000),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null,
  idempotency_key_hash text not null unique check (char_length(idempotency_key_hash) >= 32),
  fingerprint_hash text check (fingerprint_hash is null or char_length(fingerprint_hash) >= 32),
  landing_path text check (
    landing_path is null
    or (char_length(landing_path) <= 500 and landing_path ~ '^/' and landing_path !~ '[?#]')
  ),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 4000),
  resolved_by uuid references public.user_profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (resolved_at is null or status in ('RESOLVED', 'SPAM'))
);
create index support_requests_status_created_idx
  on private.support_requests(status, created_at desc);
create index support_requests_open_idx on private.support_requests(created_at, id)
  where status in ('NEW', 'IN_PROGRESS');
create index support_requests_fingerprint_idx on private.support_requests(fingerprint_hash)
  where fingerprint_hash is not null;
create index support_requests_requester_idx
  on private.support_requests(requester_user_id, created_at desc)
  where requester_user_id is not null;

create trigger support_requests_set_updated_at
  before update on private.support_requests
  for each row execute function private.set_updated_at();

alter table private.support_requests enable row level security;
alter table private.support_requests force row level security;
revoke all on private.support_requests from public, anon, authenticated, service_role;
grant select on private.support_requests to service_role;

-- Alta desde el Route Handler: la autorización se repite acá y el handler ya
-- validó origen, tamaño, honeypot, esquema y límites de frecuencia.
create or replace function public.create_support_request_from_backend(
  p_topic text,
  p_full_name text,
  p_email text,
  p_message text,
  p_consent_version text,
  p_consented_at timestamptz,
  p_idempotency_key_hash text,
  p_requester_user_id uuid default null,
  p_landing_path text default null,
  p_fingerprint_hash text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_id uuid;
begin
  if p_consented_at > statement_timestamp() + interval '5 minutes' then
    raise exception 'Consent timestamp cannot be in the future' using errcode = '22023';
  end if;

  insert into private.support_requests (
    requester_user_id, topic, full_name, email, message,
    consent_version, consented_at, idempotency_key_hash,
    landing_path, fingerprint_hash
  ) values (
    p_requester_user_id, p_topic, btrim(p_full_name), lower(btrim(p_email)), p_message,
    p_consent_version, p_consented_at, p_idempotency_key_hash,
    p_landing_path, p_fingerprint_hash
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_support_request_from_backend(
  text, text, text, text, text, timestamptz, text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.create_support_request_from_backend(
  text, text, text, text, text, timestamptz, text, uuid, text, text
) to service_role;

-- Bandeja de administración.
create or replace function private.admin_support_requests(
  p_status text default null,
  p_before timestamptz default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  topic text,
  status text,
  full_name text,
  email text,
  message text,
  landing_path text,
  requester_user_id uuid,
  consent_version text,
  consented_at timestamptz,
  internal_notes text,
  resolved_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.topic, s.status, s.full_name, s.email, s.message, s.landing_path,
         s.requester_user_id, s.consent_version, s.consented_at, s.internal_notes,
         s.resolved_at, s.created_at
  from private.support_requests s
  where (select auth.uid()) is not null
    and private.has_current_legal_acceptance()
    and private.has_any_role(array['ADMIN', 'SUPERADMIN'])
    and (p_status is null or s.status = p_status)
    and (p_before is null or s.created_at < p_before)
  order by s.created_at desc, s.id desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function private.admin_support_requests(text, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function private.admin_support_requests(text, timestamptz, integer)
  to authenticated, service_role;

create or replace function public.admin_support_requests(
  p_status text default null,
  p_before timestamptz default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  topic text,
  status text,
  full_name text,
  email text,
  message text,
  landing_path text,
  requester_user_id uuid,
  consent_version text,
  consented_at timestamptz,
  internal_notes text,
  resolved_at timestamptz,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.admin_support_requests(p_status, p_before, p_limit); $$;

revoke all on function public.admin_support_requests(text, timestamptz, integer) from public, anon;
grant execute on function public.admin_support_requests(text, timestamptz, integer)
  to authenticated, service_role;

create or replace function private.admin_resolve_support_request(
  p_request_id uuid,
  p_status text,
  p_internal_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not private.has_current_legal_acceptance()
    or not private.has_any_role(array['ADMIN', 'SUPERADMIN'])
  then
    raise exception 'Administrative role required' using errcode = '42501';
  end if;
  if p_status not in ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM') then
    raise exception 'Invalid support request status' using errcode = '22023';
  end if;

  update private.support_requests
  set status = p_status,
      internal_notes = coalesce(nullif(btrim(p_internal_notes), ''), internal_notes),
      resolved_by = case when p_status in ('RESOLVED', 'SPAM') then (select auth.uid()) else null end,
      resolved_at = case when p_status in ('RESOLVED', 'SPAM') then statement_timestamp() else null end
  where id = p_request_id;

  if not found then
    raise exception 'Support request not found' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.admin_resolve_support_request(uuid, text, text)
  from public, anon, authenticated;
grant execute on function private.admin_resolve_support_request(uuid, text, text)
  to authenticated, service_role;

create or replace function public.admin_resolve_support_request(
  p_request_id uuid,
  p_status text,
  p_internal_notes text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_resolve_support_request(p_request_id, p_status, p_internal_notes); $$;

revoke all on function public.admin_resolve_support_request(uuid, text, text) from public, anon;
grant execute on function public.admin_resolve_support_request(uuid, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Paquete legal 2026-09
--
-- Ambos documentos se reemplazan por la versión final redactada por asesoría
-- legal. `private.accept_current_terms` exige que TERMS y PRIVACY compartan
-- versión vigente, así que se publican juntos con la etiqueta 2026-09 y los
-- usuarios vuelven a aceptar el paquete completo. Las filas 2026-08 no se
-- borran: sostienen las aceptaciones ya registradas.
--
-- `content_sha256` = sha256 del archivo fuente de cada página en el momento de
-- la publicación:
--   sha256sum 'src/app/(public)/terminos/page.tsx'
--   sha256sum 'src/app/(public)/privacidad/page.tsx'
-- ---------------------------------------------------------------------------
update private.legal_document_versions
set is_current = false
where document_type in ('TERMS', 'PRIVACY') and is_current;

insert into private.legal_document_versions (
  document_type, version, document_path, content_sha256, is_current, published_at
) values
  (
    'TERMS', '2026-09', '/terminos',
    '0f54efb8c33b6d63d4b14675602841cca79d4a95d6c3abc90e9cf3c641193fc2',
    true, timestamptz '2026-09-22 00:00:00+00'
  ),
  (
    'PRIVACY', '2026-09', '/privacidad',
    '633db58a2e0144ce85ef0f6fcda97aafd10d875ff9e099440cc8fc618613d3ba',
    true, timestamptz '2026-09-22 00:00:00+00'
  )
on conflict (document_type, version) do update
set document_path = excluded.document_path,
    content_sha256 = excluded.content_sha256,
    is_current = excluded.is_current,
    published_at = excluded.published_at;

commit;
