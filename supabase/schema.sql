-- Touchline's normalized match data model.
create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  age_group text not null,
  team text not null,
  position text,
  created_at timestamptz not null default now(),
  unique (player_name, age_group, team)
);

create table if not exists public.matches (
  match_id text primary key,
  match_date date not null,
  competition text not null default '',
  home_team text not null default '',
  away_team text not null default ''
);

create table if not exists public.appearances (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(match_id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  opponent text not null default '',
  venue text not null default '',
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  minutes_played numeric not null default 0 check (minutes_played >= 0),
  touches numeric not null default 0,
  passes_attempted numeric not null default 0,
  passes_completed numeric not null default 0,
  progressive_passes numeric not null default 0,
  crosses numeric not null default 0,
  dribbles_attempted numeric not null default 0,
  dribbles_completed numeric not null default 0,
  shots numeric not null default 0,
  shots_on_target numeric not null default 0,
  goals numeric not null default 0,
  assists numeric not null default 0,
  duels_won numeric not null default 0,
  duels_lost numeric not null default 0,
  aerial_duels_won numeric not null default 0,
  aerial_duels_lost numeric not null default 0,
  tackles numeric not null default 0,
  interceptions numeric not null default 0,
  recoveries numeric not null default 0,
  clearances numeric not null default 0,
  fouls_committed numeric not null default 0,
  fouls_won numeric not null default 0,
  yellow_cards numeric not null default 0,
  red_cards numeric not null default 0,
  possession_lost numeric not null default 0,
  unique (match_id, player_id)
);

create index if not exists appearances_player_id_idx on public.appearances(player_id);
create index if not exists matches_match_date_idx on public.matches(match_date desc);

-- Reads and imports are performed by the Next.js server using the service-role key.
-- Keep this key server-only; never prefix it with NEXT_PUBLIC_.
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.appearances enable row level security;
