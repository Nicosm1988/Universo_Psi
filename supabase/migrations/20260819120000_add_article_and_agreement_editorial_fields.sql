begin;

-- Serving /recursos and /convenios from Supabase needs a small amount of
-- structured editorial content that the initial schema did not carry:
-- curated takeaways for articles, and audience/coverage/benefit copy for
-- agreements. Existing columns (body, modality_notes, summary) remain the
-- source for prose; these additions are narrow and normalized, matching the
-- project's existing array-column pattern (see articles.tags).

alter table public.articles
  add column takeaways text[] not null default '{}';

alter table public.agreements
  add column audience_summary text,
  add column coverage_summary text,
  add column benefits text[] not null default '{}',
  add column eligibility text[] not null default '{}',
  add column access_steps text[] not null default '{}';

-- articles uses column-level grants; agreements is granted at table level
-- already, so the new agreements columns are covered automatically.
grant select (takeaways) on public.articles to anon, authenticated;
grant insert (takeaways) on public.articles to authenticated;
grant update (takeaways) on public.articles to authenticated;

-- Pre-existing gap surfaced by actually exercising anon reads on articles and
-- agreement_professionals for the first time: both RLS policies call
-- private.owns_professional_profile() inside an OR chain while granted
-- `to anon, authenticated`, but EXECUTE was only ever granted to
-- authenticated. Postgres does not guarantee OR short-circuit evaluation
-- order, so an anon SELECT can still hit "permission denied for function
-- owns_professional_profile" even when the earlier branch (status =
-- 'PUBLISHED', or the ACTIVE/public-agreement clause) is true. The function
-- is a pure boolean check (security definer, returns false whenever
-- auth.uid() is null) so extending EXECUTE to anon is safe and matches how
-- private.can_view_professional_profile() is already granted.
grant execute on function private.owns_professional_profile(uuid) to anon;

commit;
