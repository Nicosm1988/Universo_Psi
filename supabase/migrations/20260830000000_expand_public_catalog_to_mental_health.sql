begin;

-- Universo Psi is the broad/generalist mental health marketplace: any active,
-- data-driven professional_types row may cross the public boundary. This
-- supersedes the narrow two-code allowlist that the inherited schema
-- (originally written for Red Senda's orientation vertical) enforced. Every
-- submission, publication and visibility gate already routes exclusively
-- through this function, so redefining it alone lifts the restriction
-- everywhere without touching the workflow/audit logic in submit_professional_profile
-- or admin_set_professional_publication.
create or replace function private.has_supported_professional_types(
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.professional_profile_types ppt
      join public.professional_types pt on pt.id = ppt.professional_type_id
      where ppt.professional_profile_id = p_profile_id
        and pt.is_active
    )
    and not exists (
      select 1
      from public.professional_profile_types ppt
      join public.professional_types pt on pt.id = ppt.professional_type_id
      where ppt.professional_profile_id = p_profile_id
        and not pt.is_active
    );
$$;

revoke all on function private.has_supported_professional_types(uuid)
  from public, anon, authenticated;
grant execute on function private.has_supported_professional_types(uuid)
  to anon, authenticated, service_role;

commit;
