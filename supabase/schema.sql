-- Flashcards C1 — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it.
-- It's written to be idempotent: safe to re-run after future edits.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- decks
-- ---------------------------------------------------------------------------
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text,
  new_per_day int not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  front text not null,
  back text not null,
  example text,
  notes text,
  tags text[] not null default '{}',
  tts_lang text not null default 'en-GB',
  state text not null default 'new' check (state in ('new', 'learning', 'review', 'relearning')),
  due timestamptz not null default now(),
  interval_days int not null default 0,
  ease real not null default 2.5,
  step int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_due_idx on public.cards (user_id, due);
create index if not exists cards_deck_idx on public.cards (deck_id);
create index if not exists cards_deck_state_idx on public.cards (deck_id, state);

-- ---------------------------------------------------------------------------
-- review_logs
-- ---------------------------------------------------------------------------
create table if not exists public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  state_before text not null,
  interval_before int not null,
  interval_after int not null,
  ease_after real not null,
  duration_ms int not null default 0,
  reviewed_at timestamptz not null default now()
);

create index if not exists review_logs_user_reviewed_idx on public.review_logs (user_id, reviewed_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists decks_set_updated_at on public.decks;
create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.review_logs enable row level security;

drop policy if exists "decks_select_own" on public.decks;
create policy "decks_select_own" on public.decks
  for select using (user_id = auth.uid());

drop policy if exists "decks_insert_own" on public.decks;
create policy "decks_insert_own" on public.decks
  for insert with check (user_id = auth.uid());

drop policy if exists "decks_update_own" on public.decks;
create policy "decks_update_own" on public.decks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "decks_delete_own" on public.decks;
create policy "decks_delete_own" on public.decks
  for delete using (user_id = auth.uid());

drop policy if exists "cards_select_own" on public.cards;
create policy "cards_select_own" on public.cards
  for select using (user_id = auth.uid());

drop policy if exists "cards_insert_own" on public.cards;
create policy "cards_insert_own" on public.cards
  for insert with check (user_id = auth.uid());

drop policy if exists "cards_update_own" on public.cards;
create policy "cards_update_own" on public.cards
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cards_delete_own" on public.cards;
create policy "cards_delete_own" on public.cards
  for delete using (user_id = auth.uid());

drop policy if exists "review_logs_select_own" on public.review_logs;
create policy "review_logs_select_own" on public.review_logs
  for select using (user_id = auth.uid());

drop policy if exists "review_logs_insert_own" on public.review_logs;
create policy "review_logs_insert_own" on public.review_logs
  for insert with check (user_id = auth.uid());

drop policy if exists "review_logs_update_own" on public.review_logs;
create policy "review_logs_update_own" on public.review_logs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "review_logs_delete_own" on public.review_logs;
create policy "review_logs_delete_own" on public.review_logs
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- review_card RPC: updates the card and inserts its review log in one
-- transaction. security invoker keeps RLS in effect, so this can't be used
-- to touch another user's rows even though it's a single call.
-- p_new_state is the SchedulableCard result from src/lib/scheduler.ts,
-- serialized as JSON with keys: state, due, intervalDays, ease, step, reps, lapses.
-- ---------------------------------------------------------------------------
create or replace function public.review_card(
  p_card_id uuid,
  p_rating smallint,
  p_new_state jsonb,
  p_duration_ms int
)
returns void
language plpgsql
security invoker
as $$
declare
  v_card public.cards%rowtype;
  v_interval_after int := (p_new_state ->> 'intervalDays')::int;
  v_ease_after real := (p_new_state ->> 'ease')::real;
begin
  select * into v_card from public.cards where id = p_card_id;
  if not found then
    raise exception 'Card % not found', p_card_id;
  end if;

  update public.cards
  set
    state = p_new_state ->> 'state',
    due = (p_new_state ->> 'due')::timestamptz,
    interval_days = v_interval_after,
    ease = v_ease_after,
    step = (p_new_state ->> 'step')::int,
    reps = (p_new_state ->> 'reps')::int,
    lapses = (p_new_state ->> 'lapses')::int
  where id = p_card_id;

  insert into public.review_logs (
    user_id, card_id, deck_id, rating, state_before,
    interval_before, interval_after, ease_after, duration_ms
  ) values (
    auth.uid(), v_card.id, v_card.deck_id, p_rating, v_card.state,
    v_card.interval_days, v_interval_after, v_ease_after, p_duration_ms
  );
end;
$$;
