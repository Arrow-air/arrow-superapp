-- Spec threads prototype schema.
--
-- NOT APPLIED ANYWHERE YET. Written for the self-hosted Supabase at supabase.arrowair.com,
-- which is shared with flight-tracking. To stay out of its way:
--   * every object is prefixed st_
--   * nothing touches auth.users (no triggers); members are upserted by the client on first sign-in
--
-- Reads are public so anyone can watch decisions being made. Writes need a signed-in member.

create table if not exists st_projects (
  id text primary key,
  name text not null,
  weights jsonb not null
);

create table if not exists st_members (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  avatar_url text,
  -- Self-reported in this prototype. Known weakness: see README "What this does not do yet".
  token_balance bigint not null default 0 check (token_balance >= 0),
  token_balance_verified boolean not null default false,
  expertise text[] not null default '{}',
  location text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists st_project_roles (
  project_id text not null references st_projects (id) on delete cascade,
  member_id uuid not null references st_members (id) on delete cascade,
  role text not null check (role in ('lead', 'core', 'member')),
  primary key (project_id, member_id)
);

create table if not exists st_needs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references st_projects (id),
  title text not null check (length(trim(title)) > 0),
  body text not null default '',
  tags text[] not null default '{}',
  author_id uuid not null references st_members (id),
  status text not null default 'open' check (status in ('open', 'spec_selected', 'bounty')),
  created_at timestamptz not null default now()
);

create table if not exists st_specs (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references st_needs (id) on delete cascade,
  author_id uuid not null references st_members (id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists st_votes (
  spec_id uuid not null references st_specs (id) on delete cascade,
  member_id uuid not null references st_members (id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  cast_at timestamptz not null default now(),
  primary key (spec_id, member_id)
);

create table if not exists st_builder_intents (
  need_id uuid not null references st_needs (id) on delete cascade,
  member_id uuid not null references st_members (id) on delete cascade,
  primary key (need_id, member_id)
);

create table if not exists st_comments (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references st_specs (id) on delete cascade,
  author_id uuid not null references st_members (id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists st_promotions (
  need_id uuid primary key references st_needs (id) on delete cascade,
  spec_id uuid not null references st_specs (id),
  by_member_id uuid not null references st_members (id),
  at timestamptz not null default now(),
  weighted_rank_at_promotion int not null,
  raw_rank_at_promotion int not null,
  override_rationale text,
  bounty_markdown text not null,
  -- The lead may pick a spec that is not the weighted top, but must say why.
  constraint st_override_needs_rationale check (
    weighted_rank_at_promotion = 1 or length(trim(coalesce(override_rationale, ''))) >= 20
  )
);

create index if not exists st_specs_need_idx on st_specs (need_id);
create index if not exists st_votes_spec_idx on st_votes (spec_id);
create index if not exists st_comments_spec_idx on st_comments (spec_id);

-- Is the caller the lead of the project that owns this need?
create or replace function st_is_lead_of_need(p_need uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from st_needs n
    join st_project_roles r on r.project_id = n.project_id
    where n.id = p_need and r.member_id = auth.uid() and r.role = 'lead'
  );
$$;

-- Promotion closes the need. Done in a trigger so the client cannot do one without the other.
create or replace function st_close_need_on_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from st_specs s where s.id = new.spec_id and s.need_id = new.need_id) then
    raise exception 'spec does not belong to this need';
  end if;
  update st_needs set status = 'bounty' where id = new.need_id and status = 'open';
  if not found then
    raise exception 'need is not open';
  end if;
  return new;
end;
$$;

drop trigger if exists st_promotions_close_need on st_promotions;
create trigger st_promotions_close_need
  before insert on st_promotions
  for each row execute function st_close_need_on_promotion();

-- Row level security ---------------------------------------------------------

alter table st_projects enable row level security;
alter table st_members enable row level security;
alter table st_project_roles enable row level security;
alter table st_needs enable row level security;
alter table st_specs enable row level security;
alter table st_votes enable row level security;
alter table st_builder_intents enable row level security;
alter table st_comments enable row level security;
alter table st_promotions enable row level security;

-- Public read on everything.
create policy st_projects_read on st_projects for select using (true);
create policy st_members_read on st_members for select using (true);
create policy st_roles_read on st_project_roles for select using (true);
create policy st_needs_read on st_needs for select using (true);
create policy st_specs_read on st_specs for select using (true);
create policy st_votes_read on st_votes for select using (true);
create policy st_intents_read on st_builder_intents for select using (true);
create policy st_comments_read on st_comments for select using (true);
create policy st_promotions_read on st_promotions for select using (true);

-- Projects and roles are admin-managed (service role / SQL), no client writes.

-- Members manage their own row.
create policy st_members_insert on st_members for insert with check (id = auth.uid());
create policy st_members_update on st_members for update using (id = auth.uid()) with check (id = auth.uid());

-- Needs and specs: author is the caller; specs only on open needs.
create policy st_needs_insert on st_needs for insert
  with check (author_id = auth.uid() and status = 'open');
create policy st_specs_insert on st_specs for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from st_needs n where n.id = need_id and n.status = 'open')
  );

-- Votes: your own, only while the need is open.
create policy st_votes_insert on st_votes for insert
  with check (
    member_id = auth.uid()
    and exists (
      select 1 from st_specs s join st_needs n on n.id = s.need_id
      where s.id = spec_id and n.status = 'open'
    )
  );
create policy st_votes_update on st_votes for update
  using (member_id = auth.uid())
  with check (
    member_id = auth.uid()
    and exists (
      select 1 from st_specs s join st_needs n on n.id = s.need_id
      where s.id = spec_id and n.status = 'open'
    )
  );
create policy st_votes_delete on st_votes for delete using (member_id = auth.uid());

create policy st_intents_insert on st_builder_intents for insert with check (member_id = auth.uid());
create policy st_intents_delete on st_builder_intents for delete using (member_id = auth.uid());

create policy st_comments_insert on st_comments for insert with check (author_id = auth.uid());

-- Only the project lead promotes.
create policy st_promotions_insert on st_promotions for insert
  with check (by_member_id = auth.uid() and st_is_lead_of_need(need_id));

-- Seed the two projects with the default weights (matches DEFAULT_WEIGHTS in src/lib/weights.ts).
insert into st_projects (id, name, weights) values
  ('quiver', 'Quiver', '{"base":1,"tokenFactor":1,"tokenScale":1000,"tokenCap":3,"expertiseBonus":1,"builderBonus":1,"roleMultiplier":{"lead":2,"core":1.5,"member":1}}'),
  ('spearhead', 'Spearhead', '{"base":1,"tokenFactor":1,"tokenScale":1000,"tokenCap":3,"expertiseBonus":1,"builderBonus":1,"roleMultiplier":{"lead":2,"core":1.5,"member":1}}')
on conflict (id) do nothing;
