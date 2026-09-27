-- API-owned schema. Never exposed through Supabase PostgREST.
create schema if not exists arrow_workspace;
revoke all on schema arrow_workspace from public, anon, authenticated;
create table if not exists arrow_workspace.workspaces (
 id text primary key, revision bigint not null default 0, data jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists arrow_workspace.evidence (
 workspace_id text primary key references arrow_workspace.workspaces(id), revision integer not null,
 digest text not null, data jsonb not null, imported_at timestamptz not null default now()
);
create table if not exists arrow_workspace.events (
 id bigint generated always as identity primary key, workspace_id text not null,
 actor_id uuid, action text not null, entity_id text, title text not null,
 data jsonb not null default '{}', at timestamptz not null default now()
);
create table if not exists arrow_workspace.snapshots (
 workspace_id text not null, revision bigint not null, data jsonb not null,
 at timestamptz not null default now(), primary key(workspace_id,revision)
);
create table if not exists arrow_workspace.invites (
 digest text primary key, workspace_id text not null, email text not null,
 role text not null check(role in ('lead','core','member')), display_name text not null,
 expires_at timestamptz not null, used_at timestamptz
);
create table if not exists arrow_workspace.watches (
 workspace_id text not null, member_id uuid not null, target text not null,
 primary key(workspace_id,member_id,target)
);
create table if not exists arrow_workspace.notifications (
 id bigint generated always as identity primary key, workspace_id text not null,
 member_id uuid not null, event_id bigint not null references arrow_workspace.events(id),
 read_at timestamptz, unique(member_id,event_id)
);
create table if not exists arrow_workspace.reconciliations (
 workspace_id text not null, item_id text not null, revision integer not null default 1,
 data jsonb not null, updated_by uuid not null, updated_at timestamptz not null default now(),
 primary key(workspace_id,item_id)
);
create table if not exists arrow_workspace.attachments (
 id uuid primary key, workspace_id text not null, entity_id text not null, author_id uuid not null,
 filename text not null, media_type text not null, digest text not null, size integer not null,
 data bytea not null, revision_note text not null, created_at timestamptz not null default now()
);
create table if not exists arrow_workspace.read_cursors (
 workspace_id text not null, member_id uuid not null, seen_event bigint not null default 0,
 primary key(workspace_id,member_id)
);
create table if not exists arrow_workspace.evidence_versions (
 workspace_id text not null, revision integer not null, digest text not null, data jsonb not null,
 imported_at timestamptz not null default now(), primary key(workspace_id,revision)
);
