create table if not exists public.cards (
  id text primary key,
  event_id text,
  persona_name text not null,
  owner_name text not null,
  headline text,
  bio text not null,
  cta text not null,
  focus text,
  event_name text,
  links jsonb not null default '[]'::jsonb,
  owner_sync_key text,
  created_at timestamptz not null default now()
);

alter table public.cards add column if not exists headline text;
alter table public.cards add column if not exists owner_sync_key text;

create table if not exists public.contacts (
  id text primary key,
  card_id text not null references public.cards(id) on delete cascade,
  event_id text,
  name text not null,
  contact text not null,
  note text,
  promise text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  follow_up_draft text,
  done boolean not null default false,
  consented_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.contacts add column if not exists consented_at timestamptz;

create index if not exists contacts_card_id_created_at_idx
  on public.contacts (card_id, created_at desc);

alter table public.cards enable row level security;
alter table public.contacts enable row level security;

-- New tables are intentionally not exposed to browser roles. The server-only
-- Supabase secret key runs as service_role and needs explicit table privileges.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.cards, public.contacts to service_role;

-- The browser never talks to these tables directly. Nametag's server routes use
-- SUPABASE_SECRET_KEY, while RLS keeps public clients from reading private contacts.

-- Authenticated owners sync their private workspace directly from the app.
-- Scanner-facing cards and contacts remain server-only tables above.
create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on table public.user_workspaces to authenticated;
grant select, insert, update on table public.user_workspaces to service_role;

drop policy if exists "Owners can read their workspace" on public.user_workspaces;
create policy "Owners can read their workspace"
  on public.user_workspaces for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owners can create their workspace" on public.user_workspaces;
create policy "Owners can create their workspace"
  on public.user_workspaces for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owners can update their workspace" on public.user_workspaces;
create policy "Owners can update their workspace"
  on public.user_workspaces for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
