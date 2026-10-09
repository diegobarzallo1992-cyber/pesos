// Edge Function: gestion de usuarios, solo para administradores.
// Supabase inyecta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY automaticamente: no pegues ninguna clave aqui.
import { createClient } from "npm:@supabase/supabase-js@2";

const DOMINIO = "@galapesca.local";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const ROLES = ["admin", "usuario"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i, "");
  const { data: { user: yo }, error: errAuth } = await admin.auth.getUser(token);
  if (errAuth || !yo || yo.app_metadata?.role !== "admin") return json({ error: "No autorizado" }, 403);

  let b: Record<string, string>;
  try { b = await req.json(); } catch { return json({ error: "Solicitud invalida" }, 400); }

  if (b.accion === "listar") {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (error) return json({ error: error.message }, 500);
    return json({ usuarios: data.users.map((u) => ({
      id: u.id, usuario: (u.email ?? "").replace(DOMINIO, ""), rol: u.app_metadata?.role === "admin" ? "admin" : "usuario",
      creado: u.created_at, ultimo: u.last_sign_in_at ?? null,
    })) });
  }

  if (b.accion === "crear") {
    const usuario = (b.usuario ?? "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return json({ error: "Usuario: 3 a 30 letras, numeros, punto, guion." }, 400);
    if ((b.clave ?? "").length < 6) return json({ error: "La contrasena debe tener al menos 6 caracteres." }, 400);
    const rol = ROLES.includes(b.rol) ? b.rol : "usuario";
    const { error } = await admin.auth.admin.createUser({ email: usuario + DOMINIO, password: b.clave, email_confirm: true, app_metadata: { role: rol } });
    if (error) return json({ error: /already|registered/i.test(error.message) ? "Ese usuario ya existe." : error.message }, 400);
    return json({ ok: true });
  }

  if (b.accion === "actualizar") {
    if (!b.id) return json({ error: "Falta el usuario." }, 400);
    const cambios: { password?: string; app_metadata?: { role: string } } = {};
    if (b.clave) { if (b.clave.length < 6) return json({ error: "La contrasena debe tener al menos 6 caracteres." }, 400); cambios.password = b.clave; }
    if (b.rol) {
      if (!ROLES.includes(b.rol)) return json({ error: "Rol invalido." }, 400);
      if (b.id === yo.id && b.rol !== "admin") return json({ error: "No puedes quitarte el rol de administrador." }, 400);
      cambios.app_metadata = { role: b.rol };
    }
    const { error } = await admin.auth.admin.updateUserById(b.id, cambios);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (b.accion === "eliminar") {
    if (b.id === yo.id) return json({ error: "No puedes eliminar tu propio usuario." }, 400);
    const { error } = await admin.auth.admin.deleteUser(b.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  return json({ error: "Accion desconocida" }, 400);
});
