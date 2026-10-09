import { useState } from "react";
import { motion } from "motion/react";
import { Boton, Campo } from "./ui";
import { KEY_SB, URL_SB, supabase } from "../supabase";

export function Login() {
  const [usuario, setUsuario] = useState(""); const [clave, setClave] = useState("");
  const [error, setError] = useState(""); const [cargando, setCargando] = useState(false);
  const [modo, setModo] = useState<"entrar" | "solicitar">("entrar");
  const [nombre, setNombre] = useState(""); const [enviada, setEnviada] = useState(false);
  const solicitar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setError("");
    try {
      const r = await fetch(`${URL_SB}/functions/v1/admin-usuarios`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY_SB },
        body: JSON.stringify({ accion: "solicitar", usuario, clave, nombre }) });
      const j = await r.json();
      if (!r.ok) setError(j.error ?? "No se pudo enviar la solicitud."); else setEnviada(true);
    } catch { setError("No se pudo enviar la solicitud. Revisa tu conexion."); }
    setCargando(false);
  };
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: usuario.includes("@") ? usuario.trim() : `${usuario.trim().toLowerCase()}@galapesca.local`, password: clave });
    if (error) setError(/banned/i.test(error.message) ? "Tu acceso esta pendiente de aprobacion por el administrador." : /Invalid login/i.test(error.message) ? "Usuario o contrasena incorrectos." : "No se pudo iniciar sesion. Revisa tu conexion.");
    setCargando(false);
  };
  return (
    <div className="grid min-h-dvh place-items-center bg-linear-to-br from-[#0B2A31] via-[#0F4A57] to-[#1A7A8C] p-5">
      <motion.form onSubmit={modo === "entrar" ? entrar : solicitar} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="w-full max-w-sm space-y-4 rounded-[2rem] bg-card p-6 shadow-2xl">
        <img src="logo.png" alt="Galapesca" className="mx-auto h-16" />
        <div className="text-center"><h1 className="text-xl font-extrabold">Control de pesos</h1><p className="text-sm text-mut">{modo === "entrar" ? "Inicia sesion para continuar" : "Solicitar acceso"}</p></div>
        {modo === "solicitar" && !enviada && <Campo etiqueta="Nombre completo" required value={nombre} onChange={(e) => setNombre(e.target.value)} />}
        {enviada ? <p className="rounded-2xl bg-ok/10 p-4 text-center text-sm font-semibold text-ok">Solicitud enviada. El administrador debe aprobarla; luego podras iniciar sesion con tu usuario y contrasena.</p> : <>
        <Campo etiqueta="Usuario" type="text" autoCapitalize="none" autoCorrect="off" autoComplete="username" required placeholder="ej. xbarzallo" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        <Campo etiqueta="Contrasena" type="password" autoComplete={modo === "entrar" ? "current-password" : "new-password"} required value={clave} onChange={(e) => setClave(e.target.value)} />
        {error && <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: [0, -8, 8, -4, 0] }} className="text-sm font-medium text-bad">{error}</motion.p>}
        <Boton variante="pri" type="submit" disabled={cargando} className="w-full py-3.5 text-base">{cargando ? "Enviando..." : modo === "entrar" ? "Entrar" : "Enviar solicitud"}</Boton></>}
        <button type="button" className="w-full text-sm font-semibold text-deep underline" onClick={() => { setModo(modo === "entrar" ? "solicitar" : "entrar"); setError(""); setEnviada(false); }}>{modo === "entrar" ? "No tengo usuario: solicitar acceso" : "Volver a iniciar sesion"}</button>
      </motion.form>
    </div>
  );
}
