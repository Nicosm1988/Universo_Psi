begin;

-- A professional can save an unfinished presentation and select a payment plan.
-- Review, publication and suspension retain the existing presentation minimums.
-- NOT NULL, maximum lengths, ownership and publication workflow remain intact.
alter table public.professional_profiles
  drop constraint professional_profiles_headline_check,
  drop constraint professional_profiles_bio_check,
  add constraint professional_profiles_headline_check check (
    char_length(headline) <= 180
    and (
      publication_status in ('DRAFT', 'REJECTED')
      or char_length(headline) >= 10
    )
  ),
  add constraint professional_profiles_bio_check check (
    char_length(bio) <= 6000
    and (
      publication_status in ('DRAFT', 'REJECTED')
      or char_length(bio) >= 40
    )
  );

commit;
