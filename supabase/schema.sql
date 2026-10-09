-- Control de pesos - Filling Pouch
-- Supabase > SQL Editor > New query > pegar todo > Run. Se puede ejecutar varias veces sin error.

-- 1) TABLA DE MUESTRAS ---------------------------------------------------
create table if not exists public.registros (
  id            text primary key,
  fecha         date not null,
  hora_registro timestamptz,
  turno         text,
  supervisor    text,
  linea         text,
  tipo          text,
  balanza       text,
  controladora  text,
  pesador       text,
  producto      text,
  total         int  not null,
  altas         int  not null default 0,
  bajas         int  not null default 0,
  critico       int  not null default 0,
  fuera         int  not null,
  pct           numeric not null,
  creado_por    uuid default auth.uid(),
  actualizado   timestamptz not null default now()
);
create index if not exists registros_fecha_idx on public.registros (fecha desc, id desc);

-- 2) TABLA DE AJUSTES (limite operativo, por defecto 25%) -----------------
create table if not exists public.ajustes (
  clave text primary key,
  valor jsonb not null
);
insert into public.ajustes (clave, valor) values ('umbral', '25') on conflict do nothing;

-- 3) SEGURIDAD (RLS) ------------------------------------------------------
alter table public.registros enable row level security;
alter table public.ajustes   enable row level security;

drop policy if exists "registros_leer"     on public.registros;
drop policy if exists "registros_insertar" on public.registros;
drop policy if exists "registros_editar"   on public.registros;
drop policy if exists "registros_borrar"   on public.registros;
drop policy if exists "ajustes_leer"       on public.ajustes;
drop policy if exists "ajustes_editar"     on public.ajustes;

-- Cualquier usuario con sesion lee y registra muestras
create policy "registros_leer"     on public.registros for select to authenticated using (true);
create policy "registros_insertar" on public.registros for insert to authenticated with check (true);
-- Solo administradores editan y borran
create policy "registros_editar"   on public.registros for update to authenticated
  using ((auth.jwt()->'app_metadata'->>'role') = 'admin') with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "registros_borrar"   on public.registros for delete to authenticated
  using ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "ajustes_leer"   on public.ajustes for select to authenticated using (true);
create policy "ajustes_editar" on public.ajustes for all to authenticated
  using ((auth.jwt()->'app_metadata'->>'role') = 'admin') with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- 4) TIEMPO REAL (el panel se actualiza solo) -----------------------------
do $$ begin
  alter publication supabase_realtime add table public.registros;
exception when duplicate_object then null; end $$;

-- 5) TU USUARIO ADMINISTRADOR (cambia el correo y ejecuta esto aparte) ----
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin","estado":"activo"}'
-- where email = 'diego@galapesca.local';
