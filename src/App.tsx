import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toast } from "./components/ui";
import { VistaRegistro } from "./views/Registro";
import { VistaPanel } from "./views/Panel";
import { VistaUsuarios } from "./views/Usuarios";
import type { Session } from "@supabase/supabase-js";
import { Login } from "./components/Login";
import { supabase } from "./supabase";
import { descargar, encolar, leerUmbral, pendientes, vaciarCola } from "./sync";
import { cargarDatos, guardarDatos, ordenar, type Registro } from "./lib";
import { iniciarNativo, toque } from "./native";

const TABS = [["registro", "Registrar", "M12 5v14M5 12h14"], ["panel", "Panel", "M4 20V10M10 20V4M16 20v-7M22 20H2"], ["usuarios", "Usuarios", "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 3.6-6 8-6s8 2 8 6"]] as const;
type Vista = (typeof TABS)[number][0];

export default function App() {
  const [inicial] = useState(cargarDatos);
  const [registros, setRegistros] = useState<Registro[]>(inicial.registros);
  const [umbral, setUmbral] = useState(inicial.umbral);
  const [vista, setVista] = useState<Vista>("registro");
  const [msg, setMsg] = useState("");
  const timer = useRef<number>(0);
  const vistaRef = useRef(vista);
  vistaRef.current = vista;

  useEffect(() => { guardarDatos({ registros, umbral }); }, [registros, umbral]);

  const aviso = useCallback((m: string) => {
    setMsg(m); clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(""), 2200);
  }, []);

  const ir = useCallback((v: Vista) => {
    if (v === vistaRef.current) return;
    history.pushState({ v }, ""); setVista(v);
  }, []);

  useEffect(() => {
    history.replaceState({ v: "registro" }, "");
    const pop = (e: PopStateEvent) => setVista((e.state?.v as Vista) ?? "registro");
    window.addEventListener("popstate", pop);
    iniciarNativo(() => { if (vistaRef.current !== "registro") { setVista("registro"); return true; } return false; });
    navigator.wakeLock?.request("screen").catch(() => {});
    return () => window.removeEventListener("popstate", pop);
  }, []);

  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  const [estadoSync, setEstadoSync] = useState<"ok" | "sync" | "offline">("sync");
  const [nPend, setNPend] = useState(pendientes());
  const esAdmin = sesion?.user.app_metadata?.role === "admin";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const sincronizar = useCallback(async () => {
    setEstadoSync("sync");
    try {
      await vaciarCola();
      const srv = await descargar();
      setRegistros(srv);
      const u = await leerUmbral(); if (u) setUmbral(u);
      setEstadoSync("ok");
    } catch { setEstadoSync("offline"); }
    setNPend(pendientes());
  }, []);

  const empujar = useCallback(async () => {
    try { await vaciarCola(); setEstadoSync("ok"); } catch { setEstadoSync("offline"); }
    setNPend(pendientes());
  }, []);

  const autenticado = !!sesion;
  useEffect(() => {
    if (!autenticado) return;
    sincronizar();
    let t = 0;
    const lanzar = () => { clearTimeout(t); t = window.setTimeout(sincronizar, 400); };
    const canal = supabase.channel("registros-vivo").on("postgres_changes", { event: "*", schema: "public", table: "registros" }, lanzar).subscribe();
    const visible = () => { if (!document.hidden) lanzar(); };
    window.addEventListener("online", lanzar); document.addEventListener("visibilitychange", visible);
    const iv = window.setInterval(sincronizar, 60000);
    return () => { supabase.removeChannel(canal); window.removeEventListener("online", lanzar); document.removeEventListener("visibilitychange", visible); clearInterval(iv); clearTimeout(t); };
  }, [autenticado, sincronizar]);

  const aplicar = useCallback((fn: (rs: Registro[]) => Registro[]) => {
    setRegistros((prev) => { const next = fn(prev); if (next !== prev) encolar(prev, next); return next; });
    setNPend(pendientes());
    window.setTimeout(empujar, 300);
  }, [empujar]);

  const guardar = (r: Registro) => aplicar((rs) => [r, ...rs].sort(ordenar));
  const borrar = (id: string) => aplicar((rs) => rs.filter((r) => r.id !== id));

  if (sesion === undefined) return <div className="grid min-h-dvh place-items-center text-mut">Cargando...</div>;
  if (!sesion) return <Login />;

  return (
    <div className="min-h-dvh pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <header className="relative overflow-hidden bg-linear-to-br from-[#0B2A31] via-[#0F4A57] to-[#1A7A8C] px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-8 text-white">
        <motion.div className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" animate={{ scale: [1, 1.25, 1], x: [0, -20, 0] }} transition={{ duration: 9, repeat: Infinity }} />
        <motion.div className="absolute -bottom-20 left-10 size-48 rounded-full bg-cyan-300/10 blur-2xl" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 11, repeat: Infinity }} />
        <div className="relative mx-auto flex max-w-5xl items-center gap-3">
          <motion.img src="logo.png" alt="Galapesca" className="h-12 rounded-xl bg-white p-1" initial={{ rotate: -12, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} />
          <div>
            <h1 className="text-xl leading-tight font-extrabold">Control de pesos</h1>
            <p className="text-xs text-white/70">Filling Pouch - GEW-OP-1.6.2.5.18</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1.5">
            <motion.span key={estadoSync + nPend} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${estadoSync === "offline" || nPend > 0 ? "bg-warn/90" : "bg-white/20"}`}>
              {estadoSync === "sync" ? "Sincronizando..." : estadoSync === "offline" ? `Sin conexion${nPend ? ` - ${nPend} pend.` : ""}` : nPend ? `${nPend} pendientes` : "Sincronizado"}
            </motion.span>
            <button onClick={() => supabase.auth.signOut()} className="text-[0.7rem] text-white/80 underline">{esAdmin ? "Admin" : sesion.user.email?.split("@")[0]} - Salir</button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto -mt-4 max-w-5xl px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={vista} initial={{ opacity: 0, y: 16, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {vista === "registro" && <VistaRegistro registros={registros} umbral={umbral} onGuardar={guardar} onBorrar={borrar} puedeBorrar={esAdmin} aviso={aviso} />}
            {vista === "panel" && <VistaPanel registros={registros} umbral={umbral} />}
            {vista === "usuarios" && esAdmin && <VistaUsuarios yoId={sesion.user.id} aviso={aviso} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toast msg={msg} />

      <nav className="glass fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md rounded-[1.75rem] p-1.5 shadow-2xl ring-1 ring-line">
        {TABS.filter(([id]) => id !== "usuarios" || esAdmin).map(([id, nombre, icono]) => {
          const activo = vista === id;
          return (
            <motion.button key={id} whileTap={{ scale: 0.9 }} onClick={() => { toque(); ir(id); }} role="tab" aria-selected={activo}
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-3xl text-[0.7rem] font-bold ${activo ? "text-white" : "text-mut"}`}>
              {activo && <motion.span layoutId="tab" className="absolute inset-0 rounded-3xl bg-linear-to-br from-deep to-deep2 shadow-lg shadow-deep/30" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <svg className="relative size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={icono} /></svg>
              <span className="relative">{nombre}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
