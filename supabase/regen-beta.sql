-- EVAD bêta, parcours REGEN : projets des testeurs.
-- À exécuter dans Supabase > SQL Editor (d'abord sur staging evad-dev, puis sur prod quand validé).
-- Idempotent : on peut le relancer sans casse.

create table if not exists public.regen_projets (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom         text not null default '',
  promesse    text not null default '',
  reve        text not null default '',
  collectif   text not null default '',
  lieu        text not null default '',
  lat         double precision,
  lng         double precision,
  public      boolean not null default true,
  statut      text not null default 'reve' check (statut in ('reve', 'encours', 'prouve')),
  data        jsonb not null default '{}'::jsonb,  -- espaces, solutions choisies, maquette, preuves
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists regen_projets_owner_idx on public.regen_projets (owner, updated_at desc);

-- Mise à jour automatique de updated_at
create or replace function public.regen_touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists regen_projets_touch on public.regen_projets;
create trigger regen_projets_touch before update on public.regen_projets
  for each row execute function public.regen_touch_updated_at();

-- Sécurité : chacun ne voit et ne modifie que ses propres projets.
alter table public.regen_projets enable row level security;
drop policy if exists regen_projets_owner on public.regen_projets;
create policy regen_projets_owner on public.regen_projets
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

grant select, insert, update, delete on public.regen_projets to authenticated;
revoke all on public.regen_projets from anon;

-- Carte publique : seulement les lieux publics, nommés et situés,
-- et seulement les colonnes utiles à la carte (pas de preuves détaillées, pas de compte).
create or replace view public.regen_carte as
  select id, nom, promesse, lieu, collectif, lat, lng, statut,
         coalesce(data -> 'placed', '[]'::jsonb) as placed,
         updated_at
  from public.regen_projets
  where public and lat is not null and lng is not null and nom <> '';

grant select on public.regen_carte to anon, authenticated;
