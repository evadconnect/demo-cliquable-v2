-- EVAD, SMA de Deva : consommation de tokens par agent, affichée dans admin.html.
-- À exécuter une fois dans Supabase > SQL Editor. Idempotent : on peut le relancer sans casse.
-- Aucune donnée personnelle : ni question, ni réponse, ni compte. Seulement l'agent, les tokens et le modèle.

create table if not exists public.deva_usage (
  id         bigint generated always as identity primary key,
  agent      text not null check (char_length(agent) between 1 and 40),
  tokens     integer not null default 0 check (tokens between 0 and 20000),
  modele     text not null default '' check (char_length(modele) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists deva_usage_created_idx on public.deva_usage (created_at desc);

-- Le site (visiteurs connectés ou non) peut seulement ajouter des lignes, jamais les lire ni les modifier.
alter table public.deva_usage enable row level security;
drop policy if exists deva_usage_insert on public.deva_usage;
create policy deva_usage_insert on public.deva_usage
  for insert to anon, authenticated with check (true);
revoke all on public.deva_usage from anon, authenticated;
grant insert on public.deva_usage to anon, authenticated;

-- Totaux par jour et par agent : seule vue lisible, pour la page d'administration.
create or replace view public.deva_usage_jour
with (security_invoker = false) as
  select (created_at at time zone 'Europe/Paris')::date as jour, agent,
         count(*)::int as questions, sum(tokens)::int as tokens
  from public.deva_usage
  group by 1, 2;
revoke all on public.deva_usage_jour from anon, authenticated;
grant select on public.deva_usage_jour to anon, authenticated;
