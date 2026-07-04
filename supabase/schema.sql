-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Agents table: the "passport" profile
create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  avatar_url text,
  reputation_score numeric not null default 50,   -- 0-100 scale, starts neutral
  total_tasks integer not null default 0,
  successful_tasks integer not null default 0,
  state_version integer not null default 0,        -- mirrors on-chain "version"
  last_state_hash text,                             -- last hash we computed & anchored
  last_anchored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Task history: append-only log of every task an agent has executed
create table if not exists task_history (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references agents(id) on delete cascade,
  prompt text not null,
  response text not null,
  success boolean not null,
  score_delta numeric not null,
  reputation_score_after numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_history_agent_id on task_history(agent_id);
create index if not exists idx_task_history_created_at on task_history(created_at desc);

-- Keep updated_at fresh on agents
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_agents_updated_at on agents;
create trigger trg_agents_updated_at
  before update on agents
  for each row execute function set_updated_at();

-- Seed one demo agent
insert into agents (name, description)
values ('Atlas Research Agent', 'A general-purpose research and Q&A agent.')
on conflict do nothing;