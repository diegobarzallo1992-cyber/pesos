import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Anillo, Boton, Campo, Et, Numero, Seg, Tarjeta } from "../components/ui";
import { SUPERVISORES, TIPOS, TURNOS, LINEAS, balanzasDe, estado, estacion, fmtFecha, hoyLocal, pctDe, tieneSemi, uid, type Registro } from "../lib";
import { resultado } from "../native";

interface Props { registros: Registro[]; umbral: number; onGuardar: (r: Registro) => void; onBorrar: (id: string) => void; puedeBorrar: boolean; aviso: (m: string) => void }

export function VistaRegistro({ registros, umbral, onGuardar, onBorrar, puedeBorrar, aviso }: Props) {
  const [f, setF] = useState({ fecha: hoyLocal(), turno: "Primero", supervisor: SUPERVISORES[0] as string, linea: "C", tipo: "Manual", balanza: "1" });
  const [txt, setTxt] = useState({ controladora: "", pesador: "", producto: "" });
  const [n, setN] = useState({ total: "", altas: "", bajas: "", critico: "" });
  const [error, setError] = useState("");
  const totalRef = useRef<HTMLInputElement>(null);

  const num = (s: string) => parseInt(s, 10) || 0;
  const fuera = num(n.altas) + num(n.bajas) + num(n.critico);
  const total = parseInt(n.total, 10);
  const pct = pctDe(fuera, total);
  const e = estado(pct, umbral);
  const balanzas = balanzasDe(f.linea, f.tipo);

  const sugerencias = useMemo(() => ({
    c: [...new Set(registros.map((r) => r.controladora).filter(Boolean))].sort(),
    p: [...new Set(registros.map((r) => r.pesador).filter(Boolean))].sort(),
  }), [registros]);

  const setLinea = (linea: string) => {
    const tipo = tieneSemi(linea) ? f.tipo : "Manual";
    const d = balanzasDe(linea, tipo);
    setF({ ...f, linea, tipo, balanza: d.includes(f.balanza) ? f.balanza : d[0] ?? "" });
  };
  const setTipo = (tipo: string) => {
    const d = balanzasDe(f.linea, tipo);
    setF({ ...f, tipo, balanza: d.includes(f.balanza) ? f.balanza : d[0] ?? "" });
  };

  const guardar = () => {
    const fallo = (m: string) => { setError(m); resultado("bad"); };
    if (!txt.controladora.trim()) return fallo("Escribe el nombre de la controladora de linea.");
    if (!txt.pesador.trim()) return fallo("Escribe el nombre del pesador.");
    if (!f.balanza) return fallo("Selecciona la balanza o la estacion.");
    if (isNaN(total) || total <= 0) return fallo("El total de fundas revisadas debe ser mayor que cero.");
    if (fuera > total) return fallo("Las fundas fuera de peso no pueden superar el total revisado.");
    setError("");
    const p = pctDe(fuera, total) ?? 0;
    onGuardar({ id: uid(), ...f, horaRegistro: new Date().toISOString(), controladora: txt.controladora.trim(), pesador: txt.pesador.trim(),
      producto: txt.producto.trim(), total, altas: num(n.altas), bajas: num(n.bajas), critico: num(n.critico), fuera, pct: p });
    resultado(estado(p, umbral).nivel === "none" ? "ok" : (estado(p, umbral).nivel as "ok" | "warn" | "bad"));
    aviso(`Muestra guardada: ${p.toFixed(1)}%`);
    setN({ total: "", altas: "", bajas: "", critico: "" });
    totalRef.current?.focus();
  };

  const numInput = (k: keyof typeof n, et: string, ref?: React.Ref<HTMLInputElement>) => (
    <Campo etiqueta={et} ref={ref} type="number" inputMode="numeric" min={0} placeholder="0" value={n[k]}
      onChange={(ev) => setN({ ...n, [k]: ev.target.value })} className="text-center text-2xl font-bold tabular" />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Tarjeta className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha" type="date" value={f.fecha} onChange={(ev) => setF({ ...f, fecha: ev.target.value })} />
          <div><Et>Turno</Et><Seg opciones={TURNOS} valor={f.turno} onChange={(v) => setF({ ...f, turno: v })} /></div>
        </div>
        <div><Et>Linea</Et><Seg opciones={LINEAS} valor={f.linea} onChange={setLinea} /></div>
        <AnimatePresence initial={false}>
          {tieneSemi(f.linea) && (
            <motion.div key="tipo" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Et>Tipo de llenado</Et><Seg compacto opciones={TIPOS} valor={f.tipo} onChange={setTipo} />
            </motion.div>
          )}
        </AnimatePresence>
        <div><Et>{f.tipo === "Semiautomatica" ? "Estacion semiautomatica" : "Balanza"}</Et><Seg compacto opciones={balanzas} valor={f.balanza} onChange={(v) => setF({ ...f, balanza: v })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Et>Supervisor del turno</Et><Seg compacto opciones={SUPERVISORES} valor={f.supervisor} onChange={(v) => setF({ ...f, supervisor: v })} /></div>
          <Campo etiqueta="Controladora de linea" list="lc" placeholder="Nombre y apellido" value={txt.controladora} onChange={(ev) => setTxt({ ...txt, controladora: ev.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Pesador" list="lp" placeholder="Nombre y apellido" value={txt.pesador} onChange={(ev) => setTxt({ ...txt, pesador: ev.target.value })} />
          <Campo etiqueta="Producto" placeholder="Opcional" value={txt.producto} onChange={(ev) => setTxt({ ...txt, producto: ev.target.value })} />
        </div>
        <datalist id="lc">{sugerencias.c.map((x) => <option key={x} value={x} />)}</datalist>
        <datalist id="lp">{sugerencias.p.map((x) => <option key={x} value={x} />)}</datalist>
        <div className="grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-4">
          {numInput("total", "Fundas revisadas", totalRef)}
          {numInput("altas", "Peso alto")}
          {numInput("bajas", "Peso bajo")}
          {numInput("critico", "Peso critico")}
        </div>
        <AnimatePresence>{error && <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: [0, -8, 8, -4, 0] }} exit={{ opacity: 0 }} className="text-sm font-medium text-bad">{error}</motion.p>}</AnimatePresence>
        <Boton variante="pri" className="w-full py-3.5 text-base" onClick={guardar}>Guardar muestra</Boton>
      </Tarjeta>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Tarjeta>
          <p className="text-center text-sm font-semibold text-mut">Fundas fuera de peso</p>
          <Anillo pct={pct} umbral={umbral} color={e.color} />
          <motion.p key={e.texto} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center font-bold" style={{ color: e.color }}>{e.texto}</motion.p>
          <p className="mt-1 text-center text-sm text-mut"><Numero valor={fuera} /> separadas - limite {umbral}%</p>
        </Tarjeta>
        <div>
          <h2 className="mb-2 px-1 text-sm font-semibold text-mut">Ultimas muestras{puedeBorrar && <span className="font-normal"> (desliza para borrar)</span>}</h2>
          {registros.length === 0 && <p className="rounded-3xl border border-dashed border-line p-6 text-center text-sm text-mut">Aun no hay muestras. La primera que guardes aparece aqui.</p>}
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {registros.slice(0, 8).map((r) => {
                const es = estado(r.pct, umbral);
                return (
                  <motion.li key={r.id} layout initial={{ opacity: 0, scale: 0.9, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, x: -120 }}
                    drag={puedeBorrar ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.6, right: 0 }}
                    onDragEnd={(_, i) => { if (i.offset.x < -90) { onBorrar(r.id); resultado("warn"); } }}
                    className="flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5 ring-1 ring-line" style={{ borderLeft: `5px solid ${es.color}` }}>
                    <span className="w-14 font-bold tabular" style={{ color: es.color }}>{r.pct.toFixed(1)}%</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{r.pesador}<span className="text-mut"> - {estacion(r)} - {fmtFecha(r.fecha)}</span></span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      </aside>
    </div>
  );
}
