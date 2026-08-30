begin;

-- Auth users may predate the profile trigger in an existing project. Repair
-- only missing identity rows and ensure the baseline USER role; never derive
-- authorization or legal acceptance from editable user metadata.
create or replace function private.backfill_missing_auth_user_profiles()
returns table (
  profiles_inserted bigint,
  user_roles_inserted bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profiles_inserted bigint := 0;
  v_user_roles_inserted bigint := 0;
  v_user_role_id bigint;
begin
  select r.id
  into v_user_role_id
  from public.roles r
  where r.code = 'USER';

  if v_user_role_id is null then
    raise exception 'Required USER role has not been seeded'
      using errcode = '23503';
  end if;

  insert into public.user_profiles (id, display_name)
  select
    u.id,
    coalesce(
      nullif(
        left(
          btrim(
            regexp_replace(
              coalesce(u.raw_user_meta_data ->> 'display_name', ''),
              '[[:space:][:cntrl:]]+',
              ' ',
              'g'
            )
          ),
          100
        ),
        ''
      ),
      'Persona de Red Senda'
    )
  from auth.users u
  where not exists (
    select 1
    from public.user_profiles up
    where up.id = u.id
  )
  on conflict (id) do nothing;

  get diagnostics v_profiles_inserted = row_count;

  insert into public.user_roles (user_id, role_id)
  select u.id, v_user_role_id
  from auth.users u
  join public.user_profiles up on up.id = u.id
  where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = u.id
      and ur.role_id = v_user_role_id
  )
  on conflict (user_id, role_id) do nothing;

  get diagnostics v_user_roles_inserted = row_count;

  return query
  select v_profiles_inserted, v_user_roles_inserted;
end;
$$;

revoke all on function private.backfill_missing_auth_user_profiles()
  from public, anon, authenticated;
grant execute on function private.backfill_missing_auth_user_profiles()
  to service_role;

select * from private.backfill_missing_auth_user_profiles();

-- The profile guard must run with the caller's effective database role. This
-- lets it distinguish an authenticated table update from the narrowly scoped
-- SECURITY DEFINER submission workflow below.
create or replace function private.guard_professional_profile_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_submission_workflow boolean := false;
begin
  if tg_op = 'UPDATE' then
    select
      current_user = pg_catalog.pg_get_userbyid(p.proowner)
      and coalesce(
        pg_catalog.current_setting(
          'red_senda.professional_profile_workflow',
          true
        ),
        ''
      ) = 'submit_professional_profile'
    into v_submission_workflow
    from pg_catalog.pg_proc p
    where p.oid = pg_catalog.to_regprocedure(
      'private.submit_professional_profile(uuid)'
    );
  end if;

  if v_submission_workflow then
    new.user_id := old.user_id;
    new.is_demo := old.is_demo;

    if new.publication_status is distinct from old.publication_status
       and not (
         old.publication_status in ('DRAFT', 'REJECTED')
         and new.publication_status = 'PENDING_REVIEW'
         and new.published_at is null
       ) then
      raise exception 'Invalid professional submission transition'
        using errcode = '42501';
    elsif new.publication_status is not distinct from old.publication_status
          and new.published_at is distinct from old.published_at then
      raise exception 'Submission workflow cannot change published_at alone'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if (select auth.uid()) is not null
     and not private.has_any_role(array['ADMIN', 'SUPERADMIN']) then
    if tg_op = 'INSERT' then
      new.user_id := (select auth.uid());
      new.publication_status := 'DRAFT';
      new.verification_state := 'NOT_VERIFIED';
      new.published_at := null;
      new.is_demo := false;
    else
      new.user_id := old.user_id;
      new.verification_state := old.verification_state;
      new.is_demo := old.is_demo;

      if old.publication_status in ('PUBLISHED', 'PENDING_REVIEW') and
        row(
          new.slug, new.first_name, new.last_name, new.pronouns, new.avatar_path,
          new.headline, new.bio, new.approach, new.experience_summary,
          new.education_summary, new.years_experience, new.starting_price,
          new.currency, new.show_starting_price, new.availability_status,
          new.next_available_on, new.availability_note, new.linkedin_url,
          new.website_url, new.instagram_url, new.is_accepting_leads
        ) is distinct from row(
          old.slug, old.first_name, old.last_name, old.pronouns, old.avatar_path,
          old.headline, old.bio, old.approach, old.experience_summary,
          old.education_summary, old.years_experience, old.starting_price,
          old.currency, old.show_starting_price, old.availability_status,
          old.next_available_on, old.availability_note, old.linkedin_url,
          old.website_url, old.instagram_url, old.is_accepting_leads
        )
      then
        new.publication_status := 'PENDING_REVIEW';
        new.published_at := null;
      else
        -- Publication state is workflow-owned. A client update can edit only
        -- profile content; it can never submit, publish, reject, or suspend.
        new.publication_status := old.publication_status;
        new.published_at := old.published_at;
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_professional_profile_write()
  from public, anon, authenticated;

create or replace function private.submit_professional_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professional_role_id bigint;
begin
  if (select auth.uid()) is null
     or not private.owns_professional_profile(p_profile_id) then
    raise exception 'Not authorized for this profile' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.professional_profile_types
    where professional_profile_id = p_profile_id
  )
  or not exists (
    select 1 from public.professional_needs
    where professional_profile_id = p_profile_id
  )
  or not exists (
    select 1 from public.professional_services
    where professional_profile_id = p_profile_id and is_active
  )
  or not exists (
    select 1 from public.professional_modalities
    where professional_profile_id = p_profile_id
  )
  or not exists (
    select 1 from public.professional_languages
    where professional_profile_id = p_profile_id
  )
  or not exists (
    select 1 from public.subscriptions
    where professional_profile_id = p_profile_id
      and status in ('PENDING_PAYMENT', 'TRIALING', 'ACTIVE')
  ) then
    raise exception 'Profile onboarding is incomplete' using errcode = '23514';
  end if;

  perform pg_catalog.set_config(
    'red_senda.professional_profile_workflow',
    'submit_professional_profile',
    true
  );

  perform private.set_professional_verification_state(p_profile_id);

  update public.professional_profiles
  set publication_status = 'PENDING_REVIEW',
      published_at = null,
      updated_at = statement_timestamp()
  where id = p_profile_id
    and publication_status in ('DRAFT', 'REJECTED');

  if not found then
    raise exception 'Profile cannot be submitted from its current state'
      using errcode = '22023';
  end if;

  perform pg_catalog.set_config(
    'red_senda.professional_profile_workflow',
    '',
    true
  );

  select id into v_professional_role_id
  from public.roles
  where code = 'PROFESSIONAL';

  insert into public.user_roles (user_id, role_id)
  values ((select auth.uid()), v_professional_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function private.submit_professional_profile(uuid)
  from public, anon, authenticated;
grant execute on function private.submit_professional_profile(uuid)
  to authenticated, service_role;

commit;
