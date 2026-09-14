begin;

-- modalities.code was a fixed enum (ONLINE, IN_PERSON, HYBRID) that predates
-- the "A domicilio" (home visit) modality found in the RedPsi filter audit.
alter table public.modalities drop constraint modalities_code_check;
alter table public.modalities add constraint modalities_code_check
  check (code in ('ONLINE', 'IN_PERSON', 'HYBRID', 'HOME_VISIT'));

-- Moved here from 20260830040000_expand_taxonomy_to_match_redpsi_filters.sql:
-- that migration ran before this constraint was widened, so inserting this
-- code there would fail on a fresh migration replay.
insert into public.modalities (id, code, name, sort_order)
values
  ('26000000-0000-4000-8000-000000000004', 'HOME_VISIT', 'A domicilio', 40)
on conflict (id) do update set name = excluded.name, is_active = true;

commit;
