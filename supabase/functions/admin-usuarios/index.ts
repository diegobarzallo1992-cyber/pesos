// Edge Function unica de usuarios. Desplegar con "Verify JWT" DESACTIVADO (las acciones de admin se validan aqui adentro).
//  - POST {accion:"solicitar"}         publico: una persona pide acceso (queda bloqueada hasta aprobarla)
//  - GET  ?aprobar=ID&exp=..&sig=..    enlace firmado del correo: aprueba
//  - GET  ?rechazar=ID&exp=..&sig=..   enlace firmado del correo: rechaza
//  - POST {accion:"listar|crear|actualizar|aprobar|eliminar"}  solo administradores
// Secretos (Edge Functions > Secrets): RESEND_API_KEY (opcional, para el correo) y ADMIN_EMAIL (opcional).
import { createClient } from "npm:@supabase/supabase-js@2";

const DOMINIO = "@galapesca.local";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "diegobarzallo1992@gmail.com";
const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ROLES = ["admin", "usuario"];
const BLOQUEO = "876000h";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const texto = (t: string, s = 200) => new Response(t, { status: s, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
const admin = createClient(URL_BASE, SERVICE);

async function firmar(id: string, exp: number, accion: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SERVICE), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${accion}.${id}.${exp}`));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function enlace(id: string, accion: "aprobar" | "rechazar") {
  const exp = Date.now() + 72 * 3600 * 1000;
  return `${URL_BASE}/functions/v1/admin-usuarios?${accion}=${id}&exp=${exp}&sig=${await firmar(id, exp, accion)}`;
}

async function avisarAdmin(id: string, usuario: string, nombre: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  const a = await enlace(id, "aprobar"), r = await enlace(id, "rechazar");
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Control de pesos <onboarding@resend.dev>", to: [ADMIN_EMAIL], subject: `Solicitud de acceso: ${nombre} (${usuario})`,
      html: `<p><b>${nombre}</b> pidio acceso a la app Control de pesos con el usuario <b>${usuario}</b>.</p>
             <p><a href="${a}" style="background:#0F4A57;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Aprobar</a>
             &nbsp; <a href="${r}" style="padding:12px 20px;border-radius:10px;border:1px solid #c33;color:#c33;text-decoration:none">Rechazar</a></p>
             <p style="color:#666;font-size:12px">Los enlaces vencen en 72 horas. Tambien puedes decidir desde la pestana Usuarios de la app.</p>`,
    }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  // ---- enlaces del correo ----
  const accionLink = url.searchParams.has("aprobar") ? "aprobar" : url.searchParams.has("rechazar") ? "rechazar" : "";
  if (req.method === "GET" && accionLink) {
    const id = url.searchParams.get(accionLink)!, exp = Number(url.searchParams.get("exp")), sig = url.searchParams.get("sig");
    if (!exp || exp < Date.now() || sig !== (await firmar(id, exp, accionLink))) return texto("Enlace invalido o vencido.", 400);
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error || !data.user) return texto("La solicitud ya no existe.", 404);
    const u = data.user, nombre = u.user_metadata?.nombre ?? u.email;
    if (u.app_metadata?.estado !== "pendiente") return texto(`La solicitud de ${nombre} ya fue resuelta.`);
    if (accionLink === "aprobar") {
      await admin.auth.admin.updateUserById(id, { ban_duration: "none", app_metadata: { role: "usuario", estado: "activo" } });
      return texto(`Listo: ${nombre} fue APROBADO. Ya puede iniciar sesion en la app.`);
    }
    await admin.auth.admin.deleteUser(id);
    return texto(`La solicitud de ${nombre} fue RECHAZADA y eliminada.`);
  }

  if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405);
  let b: Record<string, string>;
  try { b = await req.json(); } catch { return json({ error: "Solicitud invalida" }, 400); }

  const valida = (usuario: string, clave: string) =>
    !/^[a-z0-9._-]{3,30}$/.test(usuario) ? "Usuario: 3 a 30 letras, numeros, punto o guion."
      : (clave ?? "").length < 6 ? "La contrasena debe tener al menos 6 caracteres." : "";

  // ---- solicitud publica ----
  if (b.accion === "solicitar") {
    const usuario = (b.usuario ?? "").trim().toLowerCase(), nombre = (b.nombre ?? "").trim().slice(0, 60);
    const e = valida(usuario, b.clave);
    if (e) return json({ error: e }, 400);
    if (nombre.length < 2) return json({ error: "Escribe tu nombre completo." }, 400);
    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 200 });
    if ((lista?.users ?? []).filter((u) => u.app_metadata?.estado === "pendiente").length >= 20) return json({ error: "Hay demasiadas solicitudes pendientes. Avisa al administrador." }, 429);
    const { data, error } = await admin.auth.admin.createUser({
      email: usuario + DOMINIO, password: b.clave, email_confirm: true, ban_duration: BLOQUEO,
      app_metadata: { role: "usuario", estado: "pendiente" }, user_metadata: { nombre },
    });
    if (error || !data.user) return json({ error: "Ese usuario ya existe o tiene una solicitud pendiente." }, 400);
    await avisarAdmin(data.user.id, usuario, nombre);
    return json({ ok: true });
  }

  // ---- solo administradores ----
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i, "");
  const { data: { user: yo }, error: errAuth } = await admin.auth.getUser(token);
  if (errAuth || !yo || yo.app_metadata?.role !== "admin") return json({ error: "No autorizado" }, 403);

  if (b.accion === "listar") {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (error) return json({ error: error.message }, 500);
    return json({ usuarios: data.users.map((u) => ({
      id: u.id, usuario: (u.email ?? "").replace(DOMINIO, ""), nombre: u.user_metadata?.nombre ?? "",
      rol: u.app_metadata?.role === "admin" ? "admin" : "usuario", estado: u.app_metadata?.estado === "pendiente" ? "pendiente" : "activo",
      creado: u.created_at, ultimo: u.last_sign_in_at ?? null,
    })) });
  }

  if (b.accion === "crear") {
    const usuario = (b.usuario ?? "").trim().toLowerCase();
    const e = valida(usuario, b.clave);
    if (e) return json({ error: e }, 400);
    const rol = ROLES.includes(b.rol) ? b.rol : "usuario";
    const { error } = await admin.auth.admin.createUser({ email: usuario + DOMINIO, password: b.clave, email_confirm: true, app_metadata: { role: rol, estado: "activo" } });
    if (error) return json({ error: /already|registered/i.test(error.message) ? "Ese usuario ya existe." : error.message }, 400);
    return json({ ok: true });
  }

  if (b.accion === "aprobar") {
    const { error } = await admin.auth.admin.updateUserById(b.id, { ban_duration: "none", app_metadata: { role: "usuario", estado: "activo" } });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
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
