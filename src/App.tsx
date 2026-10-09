import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toast } from "./components/ui";
import { VistaRegistro } from "./views/Registro";
import { VistaPanel } from "./views/Panel";
import { VistaDatos } from "./views/Datos";
import { cargarDatos, generarEjemplo, guardarDatos, ordenar, type Registro } from "./lib";
import { iniciarNativo, toque } from "./native";

const TABS = [["registro", "Registrar", "M12 5v14M5 12h14"], ["panel", "Panel", "M4 20V10M10 20V4M16 20v-7M22 20H2"], ["datos", "Datos", "M4 6h16M4 12h16M4 18h16"]] as const;
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

  const ejemplo = () => { setRegistros(generarEjemplo()); setVista("panel"); aviso("Datos de ejemplo cargados."); };
  const guardar = (r: Registro) => setRegistros((rs) => [r, ...rs].sort(ordenar));
  const borrar = (id: string) => setRegistros((rs) => rs.filter((r) => r.id !== id));

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
        </div>
      </header>

      <main className="relative z-10 mx-auto -mt-4 max-w-5xl px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={vista} initial={{ opacity: 0, y: 16, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {vista === "registro" && <VistaRegistro registros={registros} umbral={umbral} onGuardar={guardar} onBorrar={borrar} aviso={aviso} />}
            {vista === "panel" && <VistaPanel registros={registros} umbral={umbral} onEjemplo={ejemplo} />}
            {vista === "datos" && <VistaDatos registros={registros} umbral={umbral} setUmbral={setUmbral} setRegistros={setRegistros} onEjemplo={ejemplo} aviso={aviso} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toast msg={msg} />

      <nav className="glass fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md rounded-[1.75rem] p-1.5 shadow-2xl ring-1 ring-line">
        {TABS.map(([id, nombre, icono]) => {
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
