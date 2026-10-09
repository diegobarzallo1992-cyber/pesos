-- Ejecutar completo en Supabase > SQL Editor > New query > Run

create table if not exists public.registros (
  id text primary key,
  fecha date not null,
  hora_registro timestamptz,
  turno text, supervisor text, linea text, tipo text, balanza text,
  controladora text, pesador text, producto text,
  total int not null, altas int not null default 0, bajas int not null default 0,
  critico int not null default 0, fuera int not null, pct numeric not null,
  creado_por uuid default auth.uid(),
  actualizado timestamptz not null default now()
);
create index if not exists registros_fecha_idx on public.registros (fecha desc, id desc);

create table if not exists public.ajustes (clave text primary key, valor jsonb not null);
insert into public.ajustes (clave, valor) values ('umbral', '25') on conflict do nothing;

alter table public.registros enable row level security;
alter table public.ajustes  enable row level security;

-- Cualquier usuario con sesion puede leer y registrar muestras
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

-- Tiempo real
alter publication supabase_realtime add table public.registros;

-- Dar rol de administrador (cambia el correo por el tuyo y ejecuta aparte):
-- update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}' where email = 'TU_CORREO@ejemplo.com';
