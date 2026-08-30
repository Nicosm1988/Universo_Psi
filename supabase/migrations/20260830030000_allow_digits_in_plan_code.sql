begin;

-- The inherited check constraint (code ~ '^[A-Z][A-Z_]{1,31}$') predates
-- the PROFESSIONAL_6M / PROFESSIONAL_12M plan codes and rejects digits.
-- Widen it to allow them; still uppercase-letters/underscore/digits only,
-- still must start with a letter.
alter table public.plans drop constraint plans_code_check;
alter table public.plans add constraint plans_code_check
  check (code ~ '^[A-Z][A-Z0-9_]{1,31}$');

commit;
