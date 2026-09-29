-- supabase/schema.sql — tabla de "Mis trámites" para cuentas en la nube.
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente (se puede correr de nuevo).
-- Seguridad: Row Level Security; cada persona solo ve y modifica sus propios trámites.

create table if not exists public.tramites (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fuente      text not null check (fuente in ('foto', 'pdf', 'texto', 'ejemplo')),
  ejemplo_id  text,
  data        jsonb not null,
  done        integer[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tramites_user_created_idx on public.tramites (user_id, created_at desc);

alter table public.tramites enable row level security;

drop policy if exists "tramites_select_own" on public.tramites;
drop policy if exists "tramites_insert_own" on public.tramites;
drop policy if exists "tramites_update_own" on public.tramites;
drop policy if exists "tramites_delete_own" on public.tramites;

create policy "tramites_select_own" on public.tramites for select to authenticated using ((select auth.uid()) = user_id);
create policy "tramites_insert_own" on public.tramites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tramites_update_own" on public.tramites for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tramites_delete_own" on public.tramites for delete to authenticated using ((select auth.uid()) = user_id);
