-- Postgres / Supabase schema for Claude Editor API.
-- Local dev uses an equivalent SQLite schema (editor_api/db.py); keep them in sync.
create extension if not exists pgcrypto;

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) on delete cascade,  -- Supabase auth; null in dev
  name        text not null default 'Untitled',
  status      text not null default 'created'
              check (status in ('created','uploaded','processing','ready','error')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists assets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  kind        text not null check (kind in ('source','render_preview','render_final','other')),
  filename    text not null,
  path        text not null,            -- local path or Supabase Storage key
  size_bytes  bigint not null default 0,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists assets_project_idx on assets(project_id, kind);

create table if not exists messages (
  id          bigint generated always as identity primary key,
  project_id  uuid not null references projects(id) on delete cascade,
  role        text not null check (role in ('user','assistant','system')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists messages_project_idx on messages(project_id, id);

-- EditPlan history: every change is a new immutable version (1,2,3...).
create table if not exists plans (
  project_id  uuid not null references projects(id) on delete cascade,
  version     int  not null,
  plan        jsonb not null,           -- the EditPlan (see docs/CONTRACT.md)
  created_by  text not null default 'system',  -- 'upload' | 'agent' | 'user' | 'restore'
  note        text not null default '',
  created_at  timestamptz not null default now(),
  primary key (project_id, version)
);

create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  kind        text not null check (kind in ('agent','render_preview','render_final')),
  status      text not null default 'queued'
              check (status in ('queued','running','done','error')),
  payload     jsonb not null default '{}',
  result      jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index if not exists jobs_project_idx on jobs(project_id, created_at);

-- Progress events (SSE source; replayable via Last-Event-ID).
create table if not exists events (
  id          bigint generated always as identity primary key,
  project_id  uuid not null references projects(id) on delete cascade,
  type        text not null,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists events_project_idx on events(project_id, id);

-- Row level security: owners only (service role bypasses for the API).
alter table projects enable row level security;
alter table assets   enable row level security;
alter table messages enable row level security;
alter table plans    enable row level security;
alter table jobs     enable row level security;
alter table events   enable row level security;
create policy projects_owner on projects for all using (owner_id = auth.uid());
create policy assets_owner   on assets   for all using (project_id in (select id from projects where owner_id = auth.uid()));
create policy messages_owner on messages for all using (project_id in (select id from projects where owner_id = auth.uid()));
create policy plans_owner    on plans    for all using (project_id in (select id from projects where owner_id = auth.uid()));
create policy jobs_owner     on jobs     for all using (project_id in (select id from projects where owner_id = auth.uid()));
create policy events_owner   on events   for all using (project_id in (select id from projects where owner_id = auth.uid()));
