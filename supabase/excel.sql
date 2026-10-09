-- Conexion de Excel por URL (solo lectura de la tabla registros, protegida con una clave propia).
-- Supabase > SQL Editor > New query > pegar todo > Run.  Se puede ejecutar varias veces.

-- Tabla privada para guardar la clave de Excel (RLS activo y SIN politicas: la API no puede leerla).
create table if not exists public.secretos (clave text primary key, valor text not null);
alter table public.secretos enable row level security;

-- Funcion que devuelve los registros solo si la clave coincide.
create or replace function public.exportar_registros(p_clave text)
returns setof public.registros
language plpgsql stable security definer set search_path = public as $$
begin
  if p_clave is null or not exists (select 1 from public.secretos s where s.clave = 'excel' and s.valor = p_clave) then
    raise exception 'Clave invalida' using errcode = '28000';
  end if;
  return query select * from public.registros order by fecha desc, id desc;
end $$;

revoke all on function public.exportar_registros(text) from public;
grant execute on function public.exportar_registros(text) to anon, authenticated;

-- Genera (o cambia) la clave de Excel. El resultado de esta consulta ES tu clave: copiala.
insert into public.secretos (clave, valor) values ('excel', gen_random_uuid()::text)
on conflict (clave) do update set valor = excluded.valor
returning valor as clave_excel;
