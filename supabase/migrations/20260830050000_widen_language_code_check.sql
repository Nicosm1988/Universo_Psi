begin;

-- languages.code was constrained to strict ISO 639-1 (2-letter, optional
-- region suffix), which fits es/en/pt/de but not a taxonomy entry like
-- "sign_language" (sign languages have no 2-letter ISO code). Widen it to
-- also accept a lowercase snake_case slug for non-ISO entries.
alter table public.languages drop constraint languages_code_check;
alter table public.languages add constraint languages_code_check
  check (code ~ '^[a-z]{2}(?:-[A-Z]{2})?$' or code ~ '^[a-z][a-z_]{2,31}$');

commit;
