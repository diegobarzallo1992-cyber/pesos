import { useState } from "react";
import { motion } from "motion/react";
import { Boton, Campo } from "./ui";
import { supabase } from "../supabase";

export function Login() {
  const [correo, setCorreo] = useState(""); const [clave, setClave] = useState("");
  const [error, setError] = useState(""); const [cargando, setCargando] = useState(false);
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (error) setError(error.message.includes("Invalid login") ? "Correo o contrasena incorrectos." : "No se pudo iniciar sesion. Revisa tu conexion.");
    setCargando(false);
  };
  return (
    <div className="grid min-h-dvh place-items-center bg-linear-to-br from-[#0B2A31] via-[#0F4A57] to-[#1A7A8C] p-5">
      <motion.form onSubmit={entrar} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="w-full max-w-sm space-y-4 rounded-[2rem] bg-card p-6 shadow-2xl">
        <img src="logo.png" alt="Galapesca" className="mx-auto h-16" />
        <div className="text-center"><h1 className="text-xl font-extrabold">Control de pesos</h1><p className="text-sm text-mut">Inicia sesion para continuar</p></div>
        <Campo etiqueta="Correo" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <Campo etiqueta="Contrasena" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
        {error && <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: [0, -8, 8, -4, 0] }} className="text-sm font-medium text-bad">{error}</motion.p>}
        <Boton variante="pri" type="submit" disabled={cargando} className="w-full py-3.5 text-base">{cargando ? "Entrando..." : "Entrar"}</Boton>
      </motion.form>
    </div>
  );
}
