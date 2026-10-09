import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { createPortal } from "react-dom";
import { toque } from "../native";

export function Seg({ opciones, valor, onChange, compacto }: { opciones: readonly string[]; valor: string; onChange: (v: string) => void; compacto?: boolean }) {
  const id = useId();
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((o) => {
        const activo = o === valor;
        return (
          <motion.button key={o} type="button" whileTap={{ scale: 0.92 }} onClick={() => { toque(); onChange(o); }}
            className={`relative min-h-12 rounded-2xl px-4 text-[0.95rem] font-semibold transition-colors ${compacto ? "min-w-11 px-3" : "min-w-13"} ${activo ? "text-white" : "bg-card text-mut ring-1 ring-line"}`}>
            {activo && (
              <motion.span layoutId={id} className="absolute inset-0 rounded-2xl bg-linear-to-br from-deep to-deep2 shadow-lg shadow-deep/30"
                transition={{ type: "spring", stiffness: 500, damping: 34 }} />
            )}
            <span className="relative">{o}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export const Et = ({ children }: { children: ReactNode }) => <span className="mb-1.5 block text-[0.8rem] font-semibold text-mut">{children}</span>;

export function Campo({ etiqueta, className = "", ...p }: { etiqueta: string } & React.ComponentProps<"input">) {
  return (
    <label className="block">
      <Et>{etiqueta}</Et>
      <input {...p} className={`min-h-12 w-full rounded-2xl border-0 bg-bg px-3.5 text-fg ring-1 ring-line outline-none transition focus:ring-2 focus:ring-deep ${className}`} />
    </label>
  );
}

export function Tarjeta({ titulo, nota, children, className = "" }: { titulo?: string; nota?: string; children: ReactNode; className?: string }) {
  return (
    <motion.section layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={`rounded-3xl bg-card p-4 shadow-sm ring-1 ring-line ${className}`}>
      {titulo && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[1rem] font-bold">{titulo}</h2>
          {nota && <span className="text-xs text-mut">{nota}</span>}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function Numero({ valor, decimales = 0, sufijo = "", className = "", style }: { valor: number; decimales?: number; sufijo?: string; className?: string; style?: React.CSSProperties }) {
  const mv = useMotionValue(valor);
  const texto = useTransform(mv, (v) => v.toLocaleString("es-EC", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + sufijo);
  useEffect(() => { const c = animate(mv, valor, { duration: 0.7, ease: [0.22, 1, 0.36, 1] }); return () => c.stop(); }, [valor, mv]);
  return <motion.span className={`tabular ${className}`} style={style}>{texto}</motion.span>;
}

export function Anillo({ pct, umbral, color }: { pct: number | null; umbral: number; color: string }) {
  const r = 70, c = 2 * Math.PI * r;
  const frac = pct == null ? 0 : Math.min(pct / (umbral * 2), 1);
  return (
    <div className="relative mx-auto grid h-48 w-48 place-items-center">
      <svg viewBox="0 0 180 180" className="absolute inset-0 -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
        <motion.circle cx="90" cy="90" r={r} fill="none" strokeWidth="14" strokeLinecap="round" strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - frac), stroke: color }} transition={{ type: "spring", stiffness: 90, damping: 20 }} />
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--bad)" strokeWidth="2" strokeDasharray={`2 ${c}`} strokeDashoffset={-c * 0.5} opacity=".0" />
      </svg>
      <div className="text-center">
        {pct == null ? <span className="text-5xl font-bold text-mut">-</span> : <Numero valor={pct} decimales={1} sufijo="%" className="text-5xl font-bold" style={{ color }} />}
      </div>
    </div>
  );
}

export function Modal({ abierto, onClose, children, titulo }: { abierto: boolean; onClose: () => void; children: ReactNode; titulo: string }) {
  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div onClick={(e) => e.stopPropagation()} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 120) onClose(); }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ring-1 ring-line sm:rounded-[2rem]">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
            <h2 className="mb-4 text-lg font-bold">{titulo}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Boton({ children, variante = "sec", ...p }: { variante?: "pri" | "sec" | "peligro" } & Omit<React.ComponentProps<typeof motion.button>, "children"> & { children: ReactNode }) {
  const est = variante === "pri" ? "bg-linear-to-br from-deep to-deep2 text-white shadow-lg shadow-deep/30"
    : variante === "peligro" ? "bg-bad/10 text-bad ring-1 ring-bad/40" : "bg-bg text-fg ring-1 ring-line";
  return (
    <motion.button whileTap={{ scale: 0.95 }} {...p} onClick={(e) => { toque(); p.onClick?.(e); }}
      className={`min-h-12 rounded-2xl px-5 text-sm font-semibold disabled:opacity-40 ${est} ${p.className ?? ""}`}>{children}</motion.button>
  );
}

export function Toast({ msg }: { msg: string }) {
  const ref = useRef(msg);
  ref.current = msg || ref.current;
  return (
    <AnimatePresence>
      {msg && (
        <motion.div initial={{ y: 40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
          className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[95] mx-auto max-w-sm rounded-2xl bg-fg px-4 py-3 text-center text-sm font-semibold text-bg shadow-2xl">
          {ref.current}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
