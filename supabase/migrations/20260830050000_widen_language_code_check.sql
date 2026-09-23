begin;

-- languages.code was constrained to strict ISO 639-1 (2-letter, optional
-- region suffix), which fits es/en/pt/de but not a taxonomy entry like
-- "sign_language" (sign languages have no 2-letter ISO code). Widen it to
-- also accept a lowercase snake_case slug for non-ISO entries.
alter table public.languages drop constraint languages_code_check;
alter table public.languages add constraint languages_code_check
  check (code ~ '^[a-z]{2}(?:-[A-Z]{2})?$' or code ~ '^[a-z][a-z_]{2,31}$');

-- Moved here from 20260830040000_expand_taxonomy_to_match_redpsi_filters.sql:
-- that migration ran before this constraint was widened, so inserting this
-- non-ISO code there would fail on a fresh migration replay.
insert into public.languages (id, code, name, sort_order)
values
  ('28000000-0000-4000-8000-000000000005', 'sign_language', 'Lengua de señas', 50)
on conflict (id) do update set name = excluded.name, is_active = true;

commit;
