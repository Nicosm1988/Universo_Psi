\set ON_ERROR_STOP on

begin;

-- Emulate an auth user that existed before the profile trigger. The fixture is
-- transaction-scoped and uses no password, identity, or deliverable address.
insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  'authenticated',
  'authenticated',
  'legacy-profile-test@example.invalid',
  '{}'::jsonb,
  jsonb_build_object(
    'display_name', E'  Persona\n  Legada  ',
    'requested_account_type', 'SUPERADMIN',
    'terms_version', '2026-08',
    'terms_accepted_at', '2026-08-01T00:00:00Z'
  ),
  statement_timestamp(),
  statement_timestamp()
);

-- The current trigger populated this row; remove it to reproduce the legacy
-- state while keeping the auth user in place.
delete from public.user_profiles
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';

do $$
declare
  v_profiles_inserted bigint;
  v_user_roles_inserted bigint;
  v_display_name text;
  v_terms_version text;
  v_terms_accepted_at timestamptz;
  v_role_codes text[];
begin
  select b.profiles_inserted, b.user_roles_inserted
  into v_profiles_inserted, v_user_roles_inserted
  from private.backfill_missing_auth_user_profiles() b;

  if v_profiles_inserted <> 1 or v_user_roles_inserted <> 1 then
    raise exception 'Backfill did not repair exactly one legacy auth user: %, %',
      v_profiles_inserted, v_user_roles_inserted;
  end if;

  select up.display_name, up.terms_version, up.terms_accepted_at
  into v_display_name, v_terms_version, v_terms_accepted_at
  from public.user_profiles up
  where up.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';

  if v_display_name <> 'Persona Legada' then
    raise exception 'Backfill display_name was not normalized: %', v_display_name;
  end if;
  if v_terms_version is not null or v_terms_accepted_at is not null then
    raise exception 'Backfill trusted legal-acceptance metadata';
  end if;
  if exists (
    select 1
    from private.legal_acceptances a
    where a.user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
  ) then
    raise exception 'Backfill created legal evidence from metadata';
  end if;

  select array_agg(r.code order by r.code)
  into v_role_codes
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';

  if v_role_codes is distinct from array['USER']::text[] then
    raise exception 'Backfill trusted requested role metadata: %', v_role_codes;
  end if;

  update public.user_profiles
  set display_name = 'Nombre existente conservado'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';

  select b.profiles_inserted, b.user_roles_inserted
  into v_profiles_inserted, v_user_roles_inserted
  from private.backfill_missing_auth_user_profiles() b;

  if v_profiles_inserted <> 0 or v_user_roles_inserted <> 0 then
    raise exception 'Backfill was not idempotent: %, %',
      v_profiles_inserted, v_user_roles_inserted;
  end if;
  if (
    select up.display_name
    from public.user_profiles up
    where up.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
  ) <> 'Nombre existente conservado' then
    raise exception 'Backfill overwrote an existing user profile';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.backfill_missing_auth_user_profiles()',
    'EXECUTE'
  ) then
    raise exception 'Authenticated unexpectedly has backfill EXECUTE';
  end if;
  if not has_function_privilege(
    'service_role',
    'private.backfill_missing_auth_user_profiles()',
    'EXECUTE'
  ) then
    raise exception 'service_role is missing backfill EXECUTE';
  end if;
end;
$$;

-- Build a complete, supported onboarding fixture for the owner workflow.
insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  'authenticated',
  'authenticated',
  'submission-owner-test@example.invalid',
  '{}'::jsonb,
  jsonb_build_object('display_name', 'Profesional de prueba'),
  statement_timestamp(),
  statement_timestamp()
);

select public.accept_terms_from_signup_backend(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  '2026-08'
);

insert into public.professional_profiles (
  id,
  user_id,
  slug,
  first_name,
  last_name,
  headline,
  bio,
  publication_status,
  verification_state,
  is_demo
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  'workflow-submission-test',
  'Profesional',
  'Prueba',
  'Perfil transaccional para validar el envío',
  'Perfil completamente ficticio usado sólo dentro de una prueba transaccional del flujo de moderación.',
  'DRAFT',
  'NOT_VERIFIED',
  false
);

insert into public.professional_profile_types (
  professional_profile_id,
  professional_type_id,
  is_primary
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  '20000000-0000-4000-8000-000000000002',
  true
);

insert into public.professional_needs (professional_profile_id, need_id)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  '22000000-0000-4000-8000-000000000004'
);

insert into public.professional_services (professional_profile_id, service_id)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  '23000000-0000-4000-8000-000000000002'
);

insert into public.professional_modalities (professional_profile_id, modality_id)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  '26000000-0000-4000-8000-000000000001'
);

insert into public.professional_languages (
  professional_profile_id,
  language_id,
  proficiency
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  '28000000-0000-4000-8000-000000000001',
  'NATIVE'
);

insert into public.subscriptions (
  id,
  professional_profile_id,
  plan_id,
  status
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccc02',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  '2b000000-0000-4000-8000-000000000001',
  'PENDING_PAYMENT'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

do $$
declare
  v_status text;
  v_direct_update_rejected boolean := false;
begin
  if (select auth.uid()) is distinct from
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02'::uuid then
    raise exception 'Test JWT did not establish the expected auth.uid()';
  end if;

  begin
    update public.professional_profiles
    set publication_status = 'PENDING_REVIEW'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';
  exception
    when insufficient_privilege then
      v_direct_update_rejected := true;
  end;

  if not v_direct_update_rejected then
    raise exception 'Owner direct publication update was not rejected';
  end if;

  select p.publication_status
  into v_status
  from public.professional_profiles p
  where p.id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

  if v_status <> 'DRAFT' then
    raise exception 'Direct owner update changed state to %', v_status;
  end if;
end;
$$;

savepoint unsupported_catalog_guardrails;

-- A forged relation to a historical professional type cannot be submitted or
-- published, even if a privileged actor later forces the profile status.
delete from public.professional_profile_types
where professional_profile_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

insert into public.professional_profile_types (
  professional_profile_id,
  professional_type_id,
  is_primary
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  '20000000-0000-4000-8000-000000000003',
  true
);

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.submit_professional_profile(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02'
    );
  exception
    when check_violation then
      v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Unsupported professional type was submitted';
  end if;
end;
$$;

reset role;

insert into public.user_roles (user_id, role_id)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', r.id
from public.roles r
where r.code = 'ADMIN'
on conflict do nothing;

set local role authenticated;

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.admin_set_professional_publication(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
      'PUBLISHED',
      null
    );
  exception
    when check_violation then
      v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Admin published an unsupported professional type';
  end if;
end;
$$;

reset role;

-- Simulate legacy/corrupt state to prove every public read and lead boundary
-- applies the catalogue rule independently of publication_status.
update public.professional_profiles
set publication_status = 'PUBLISHED',
    published_at = statement_timestamp(),
    is_accepting_leads = true
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

set local role anon;

do $$
begin
  if exists (
    select 1
    from public.professional_directory d
    where d.id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02'
  ) then
    raise exception 'Directory exposed an unsupported professional type';
  end if;

  if exists (
    select 1
    from public.rank_professionals() r
    where r.professional_profile_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02'
  ) then
    raise exception 'Ranking exposed an unsupported professional type';
  end if;
end;
$$;

reset role;

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.create_lead_from_backend(
      p_professional_profile_id => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
      p_full_name => 'Persona de prueba',
      p_email => 'catalog-guardrail@example.invalid',
      p_message => 'Consulta ficticia para comprobar la barrera de catálogo.',
      p_contact_preference => 'EMAIL',
      p_source => 'database_test',
      p_consent_version => '2026-08',
      p_consented_at => statement_timestamp(),
      p_idempotency_key_hash => repeat('a', 64)
    );
  exception
    when invalid_parameter_value then
      v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Lead was created for an unsupported professional type';
  end if;
end;
$$;

do $$
declare
  v_directory_columns text[];
  v_rank_row jsonb;
  v_my_profile_fields text[];
  v_admin_profile_fields text[];
begin
  select array_agg(a.attname order by a.attname)
  into v_directory_columns
  from pg_attribute a
  where a.attrelid = 'public.professional_directory'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  if v_directory_columns && array[
    'starting_price', 'currency', 'show_starting_price'
  ]::text[] then
    raise exception 'Directory still exposes fee columns: %', v_directory_columns;
  end if;

  select to_jsonb(r)
  into v_rank_row
  from public.rank_professionals() r
  limit 1;

  if v_rank_row is null then
    raise exception 'Ranking contract test requires a supported seed profile';
  end if;
  if v_rank_row ?| array['starting_price', 'currency', 'show_starting_price'] then
    raise exception 'Ranking still exposes fee fields: %', v_rank_row;
  end if;

  if to_regprocedure(
    'public.rank_professionals(uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],numeric,text,text,integer)'
  ) is not null then
    raise exception 'Legacy budget-aware ranking signature still exists';
  end if;
  if to_regprocedure(
    'public.rank_professionals(uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],text,text,integer)'
  ) is null then
    raise exception 'Price-free ranking signature is missing';
  end if;

  select p.proargnames
  into v_my_profile_fields
  from pg_proc p
  where p.oid = 'public.my_professional_profile()'::regprocedure;

  select p.proargnames
  into v_admin_profile_fields
  from pg_proc p
  where p.oid = 'public.admin_pending_professional_profiles(integer)'::regprocedure;

  if v_my_profile_fields && array[
    'starting_price', 'currency', 'show_starting_price'
  ]::text[] then
    raise exception 'Owner profile RPC still exposes fee fields: %',
      v_my_profile_fields;
  end if;
  if v_admin_profile_fields && array[
    'starting_price', 'currency', 'show_starting_price'
  ]::text[] then
    raise exception 'Admin profile RPC still exposes fee fields: %',
      v_admin_profile_fields;
  end if;

  if has_column_privilege(
    'anon', 'public.professional_profiles', 'starting_price', 'SELECT'
  ) or has_column_privilege(
    'authenticated', 'public.professional_profiles', 'starting_price', 'SELECT'
  ) then
    raise exception 'Client role can still read profile fees';
  end if;

  if has_column_privilege(
    'anon', 'public.professional_services', 'price_from', 'SELECT'
  ) or has_column_privilege(
    'authenticated', 'public.professional_services', 'price_from', 'SELECT'
  ) then
    raise exception 'Client role can still read service fees';
  end if;
end;
$$;

reset role;
rollback to savepoint unsupported_catalog_guardrails;
reset role;

savepoint published_type_change_recheck;

-- A published owner changing discipline must immediately leave the public
-- catalogue and return to human review. The trigger workflow is privileged,
-- but its marker cannot be forged by the authenticated caller.
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

update public.professional_profiles
set publication_status = 'PUBLISHED',
    published_at = statement_timestamp()
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

select set_config(
  'request.jwt.claims',
  '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02", "role": "authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

set local role authenticated;

delete from public.professional_profile_types
where professional_profile_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

insert into public.professional_profile_types (
  professional_profile_id,
  professional_type_id,
  is_primary
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
  '20000000-0000-4000-8000-000000000002',
  true
);

do $$
declare
  v_status text;
  v_published_at timestamptz;
begin
  select p.publication_status, p.published_at
  into v_status, v_published_at
  from public.professional_profiles p
  where p.id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

  if v_status <> 'PENDING_REVIEW' or v_published_at is not null then
    raise exception
      'Owner type change did not return published profile to review: %, %',
      v_status,
      v_published_at;
  end if;
  if coalesce(
    current_setting('red_senda.professional_profile_workflow', true),
    ''
  ) <> '' then
    raise exception 'Taxonomy workflow marker leaked after relation change';
  end if;
end;
$$;

reset role;
rollback to savepoint published_type_change_recheck;
reset role;

-- Defense in depth: even if a future grant accidentally exposes the state
-- columns, the trigger rejects a forged workflow marker from an owner session.
grant update (publication_status, published_at)
on public.professional_profiles to authenticated;

set local role authenticated;

select set_config(
  'red_senda.professional_profile_workflow',
  'submit_professional_profile',
  true
);

update public.professional_profiles
set publication_status = 'PENDING_REVIEW',
    published_at = null
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

do $$
declare
  v_status text;
begin
  select p.publication_status
  into v_status
  from public.professional_profiles p
  where p.id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

  if v_status <> 'DRAFT' then
    raise exception 'Forged owner workflow marker changed state to %', v_status;
  end if;
end;
$$;

select set_config('red_senda.professional_profile_workflow', '', true);

select public.submit_professional_profile(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02'
);

do $$
declare
  v_status text;
begin
  select p.publication_status
  into v_status
  from public.professional_profiles p
  where p.id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

  if v_status <> 'PENDING_REVIEW' then
    raise exception 'Submission RPC left profile in %', v_status;
  end if;
  if not private.has_any_role(array['PROFESSIONAL']) then
    raise exception 'Submission RPC did not assign PROFESSIONAL';
  end if;
  if coalesce(
    current_setting('red_senda.professional_profile_workflow', true),
    ''
  ) <> '' then
    raise exception 'Submission workflow marker leaked after RPC';
  end if;
end;
$$;

reset role;

rollback;
