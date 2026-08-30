begin;

-- modalities.code was a fixed enum (ONLINE, IN_PERSON, HYBRID) that predates
-- the "A domicilio" (home visit) modality found in the RedPsi filter audit.
alter table public.modalities drop constraint modalities_code_check;
alter table public.modalities add constraint modalities_code_check
  check (code in ('ONLINE', 'IN_PERSON', 'HYBRID', 'HOME_VISIT'));

commit;
