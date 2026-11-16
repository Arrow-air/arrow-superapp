-- Longshot is one project with a pack per aircraft (Thomas, 2026-11-16): the
-- 14S9P for Quiver, the 14S3P for Spearhead. Each variant has its own build
-- clock, and the BMS both of them wait on has one too (src/projects/plans.ts):
--   'Longshot PT2'        the 14S9P's next build (the name it had when it was
--                         Longshot's only one), then 'Longshot PT3'
--   'Longshot 14S3P PT1'  the 14S3P's, then 'Longshot 14S3P PT2'
--   'Longshot BMS v1'     the BMS's, then 'Longshot BMS v2'
--   'Longshot PT1'        the 14S9P already built
-- Versions are text keyed by name (sa_release too), so the schema doesn't
-- change. This only re-files the seeded threads onto the builds they are
-- about, as seed_longshot.sql now has them. Each update is guarded on the
-- thread still being open and where the seed put it, so it can run more than
-- once and never moves a thread someone has since moved or decided.

update public.sa_threads set version = 'Longshot BMS v1'
  where project = 'longshot' and id in ('L-1', 'L-2', 'L-3', 'L-12') and version = 'Longshot PT2' and settled is null and declined is null;

update public.sa_threads set version = 'Longshot 14S3P PT1'
  where project = 'longshot' and id in ('L-6', 'L-7') and version = '' and settled is null and declined is null;

update public.sa_threads set version = 'Longshot PT1'
  where project = 'longshot' and id in ('L-4', 'L-9', 'L-10', 'L-13') and version = '' and settled is null and declined is null;

-- Which cells the next packs use is a question for every variant.
update public.sa_threads set version = ''
  where project = 'longshot' and id = 'L-5' and version = 'Longshot PT2' and settled is null and declined is null;
