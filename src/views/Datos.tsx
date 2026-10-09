import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Boton, Campo, Et, Modal, Tarjeta } from "../components/ui";
import { CLAVE_ADMIN, LINEAS, SUPERVISORES, TIPOS, TURNOS, aCSV, desdeCSV, estado, estacion, fmtFecha, fmtHora, hoyLocal, ordenar, pctDe, type Registro } from "../lib";
import { entregarArchivo, resultado } from "../native";

interface Props {
  registros: Registro[]; umbral: number; setUmbral: (n: number) => void; setRegistros: (r: Registro[]) => void;
  onEjemplo: () => void; aviso: (m: string) => void;
}
type Pendiente = { msg: string; ok: () => void } | null;

export function VistaDatos({ registros, umbral, setUmbral, setRegistros, onEjemplo, aviso }: Props) {
  const [pend, setPend] = useState<Pendiente>(null);
  const [clave, setClave] = useState(""); const [errClave, setErrClave] = useState(false);
  const [edit, setEdit] = useState<Registro | null>(null);
  const [errEdit, setErrEdit] = useState("");
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const fCsv = useRef<HTMLInputElement>(null); const fJson = useRef<HTMLInputElement>(null);
  const vacio = registros.length === 0;

  const pedirClave = (msg: string, ok: () => void) => { setClave(""); setErrClave(false); setPend({ msg, ok }); };
  const verificar = () => {
    if (clave !== CLAVE_ADMIN) { setErrClave(true); resultado("bad"); return; }
    const ok = pend!.ok; setPend(null); ok();
  };

  const importarCSV = async (file?: File) => {
    if (!file) return;
    const nuevos = desdeCSV(await file.text(), registros);
    setRegistros([...registros, ...nuevos].sort(ordenar));
    aviso(`${nuevos.length} registros importados. Los repetidos se omitieron.`);
  };
  const restaurar = async (file?: File) => {
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.registros)) throw new Error();
      const reemplazar = vacio || confirm(`Ya existen ${registros.length} registros.\n\nAceptar: REEMPLAZAR todo.\nCancelar: combinar ambos conjuntos.`);
      const base = reemplazar ? [] : registros;
      const ids = new Set(base.map((r) => r.id));
      setRegistros([...base, ...(d.registros as Registro[]).filter((r) => !ids.has(r.id))].sort(ordenar));
      if (typeof d.umbral === "number") setUmbral(d.umbral);
      aviso("Copia de respaldo restaurada.");
    } catch { aviso("El archivo de respaldo no es valido."); }
  };
  const respaldo = () => entregarArchivo(`respaldo-control-pesos-${hoyLocal()}.json`,
    JSON.stringify({ tipo: "respaldo-control-pesos", version: 1, generado: new Date().toISOString(), umbral, registros }), "application/json");

  const guardarEdicion = () => {
    if (!edit) return;
    const { controladora, pesador, balanza, total, altas, bajas, critico } = edit;
    const fuera = altas + bajas + critico;
    if (!controladora.trim()) return setErrEdit("Escribe el nombre de la controladora de linea.");
    if (!pesador.trim()) return setErrEdit("Escribe el nombre del pesador.");
    if (!String(balanza).trim()) return setErrEdit("Escribe la balanza o estacion.");
    if (!(total > 0)) return setErrEdit("El total de fundas revisadas debe ser mayor que cero.");
    if (fuera > total) return setErrEdit("Las fundas fuera de peso no pueden superar el total revisado.");
    setRegistros(registros.map((r) => (r.id === edit.id ? { ...edit, fuera, pct: pctDe(fuera, total) ?? 0 } : r)));
    setEdit(null); setErrEdit(""); aviso("Registro actualizado.");
  };
  const sel = (k: keyof Registro, ops: readonly string[]) => (
    <label className="block"><Et>{k === "turno" ? "Turno" : k === "supervisor" ? "Supervisor" : k === "linea" ? "Linea" : "Tipo de llenado"}</Et>
      <select className="min-h-12 w-full rounded-2xl bg-bg px-3 ring-1 ring-line" value={String(edit![k])} onChange={(e) => setEdit({ ...edit!, [k]: e.target.value })}>{ops.map((o) => <option key={o}>{o}</option>)}</select></label>
  );
  const txt = (k: "controladora" | "pesador" | "producto" | "balanza", et: string) => <Campo etiqueta={et} value={edit![k]} onChange={(e) => setEdit({ ...edit!, [k]: e.target.value })} />;
  const nm = (k: "total" | "altas" | "bajas" | "critico", et: string) => <Campo etiqueta={et} type="number" min={0} value={edit![k]} className="text-center font-bold" onChange={(e) => setEdit({ ...edit!, [k]: parseInt(e.target.value, 10) || 0 })} />;

  return (
    <div className="space-y-4">
      <Tarjeta className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Et>Limite operativo</Et>
          <div className="flex items-center gap-2">
            <Boton aria-label="Menos" onClick={() => setUmbral(Math.max(1, umbral - 1))}>-</Boton>
            <motion.span key={umbral} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="w-16 text-center text-3xl font-bold tabular">{umbral}%</motion.span>
            <Boton aria-label="Mas" onClick={() => setUmbral(Math.min(100, umbral + 1))}>+</Boton>
          </div>
          <p className="mt-1 text-xs text-mut">maximo de fundas separadas por muestra</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton variante="pri" disabled={vacio} onClick={() => entregarArchivo(`control-pesos-${hoyLocal()}.csv`, aCSV(registros), "text/csv;charset=utf-8")}>Exportar a Excel (CSV)</Boton>
          <Boton onClick={() => fCsv.current?.click()}>Importar CSV</Boton>
          <Boton disabled={vacio} onClick={respaldo}>Copia de respaldo</Boton>
          <Boton onClick={() => fJson.current?.click()}>Restaurar copia</Boton>
          <Boton disabled={vacio} onClick={() => window.print()}>Imprimir</Boton>
          {vacio && <Boton onClick={onEjemplo}>Datos de ejemplo</Boton>}
          <Boton variante="peligro" disabled={vacio} onClick={() => pedirClave("Esta accion eliminara TODOS los registros guardados de este dispositivo. No se puede deshacer.", () => setConfirmarBorrado(true))}>Reiniciar proceso</Boton>
        </div>
        <input ref={fCsv} type="file" accept=".csv,text/csv" hidden onChange={(e) => { importarCSV(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={fJson} type="file" accept=".json,application/json" hidden onChange={(e) => { restaurar(e.target.files?.[0]); e.target.value = ""; }} />
      </Tarjeta>

      {vacio ? <p className="rounded-3xl border border-dashed border-line p-10 text-center text-mut">No hay registros guardados todavia.</p> : (
        <div className="overflow-x-auto rounded-3xl bg-card ring-1 ring-line">
          <table className="w-full text-[0.85rem] tabular">
            <thead><tr className="bg-linear-to-r from-deep to-deep2 text-left text-white">
              {["Fecha", "Hora", "Turno", "Supervisor", "Linea", "Tipo", "Balanza", "Controladora", "Pesador", "Producto", "Revisadas", "Alto", "Bajo", "Critico", "%", ""].map((h, i) => <th key={i} className={`px-3 py-3 whitespace-nowrap ${i >= 10 && i <= 14 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
                {registros.map((r) => (
                  <motion.tr key={r.id} layout exit={{ opacity: 0, x: 80 }} className="border-t border-line even:bg-bg/60">
                    <td className="px-3 py-2">{fmtFecha(r.fecha)}</td><td className="px-3 text-mut">{fmtHora(r.horaRegistro)}</td><td className="px-3">{r.turno}</td><td className="px-3 whitespace-nowrap">{r.supervisor}</td>
                    <td className="px-3">{r.linea}</td><td className="px-3">{r.tipo}</td><td className="px-3 whitespace-nowrap">{estacion(r)}</td><td className="px-3 whitespace-nowrap">{r.controladora}</td>
                    <td className="px-3 whitespace-nowrap">{r.pesador}</td><td className="px-3">{r.producto}</td>
                    <td className="px-3 text-right">{r.total}</td><td className="px-3 text-right">{r.altas}</td><td className="px-3 text-right">{r.bajas}</td><td className="px-3 text-right">{r.critico || 0}</td>
                    <td className="px-3 text-right font-bold" style={{ color: estado(r.pct, umbral).color }}>{r.pct.toFixed(1)}%</td>
                    <td className="px-3 whitespace-nowrap">
                      <button className="min-h-11 px-2 text-xs font-semibold text-deep" onClick={() => pedirClave("Vas a editar un registro ya guardado.", () => setEdit({ ...r }))}>Editar</button>
                      <button aria-label="Eliminar" className="min-h-11 min-w-11 text-xl text-mut" onClick={() => setRegistros(registros.filter((x) => x.id !== r.id))}>&times;</button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={!!pend} onClose={() => setPend(null)} titulo="Autorizacion requerida">
        <p className="mb-4 text-sm text-mut">{pend?.msg}</p>
        <motion.div animate={errClave ? { x: [0, -10, 10, -6, 6, 0] } : {}}>
          <Campo etiqueta="Clave de autorizacion" type="password" autoFocus value={clave} onChange={(e) => { setClave(e.target.value); setErrClave(false); }} onKeyDown={(e) => e.key === "Enter" && verificar()} />
        </motion.div>
        {errClave && <p className="mt-2 text-sm font-medium text-bad">Clave incorrecta.</p>}
        <div className="mt-5 flex justify-end gap-2"><Boton onClick={() => setPend(null)}>Cancelar</Boton><Boton variante="pri" onClick={verificar}>Continuar</Boton></div>
      </Modal>

      <Modal abierto={confirmarBorrado} onClose={() => setConfirmarBorrado(false)} titulo="Ultima confirmacion">
        <p className="mb-5 text-sm">¿Deseas reiniciar el proceso y borrar todos los registros?</p>
        <div className="flex justify-end gap-2"><Boton onClick={() => setConfirmarBorrado(false)}>Cancelar</Boton>
          <Boton variante="peligro" onClick={() => { setRegistros([]); setConfirmarBorrado(false); aviso("Registros eliminados."); }}>Borrar todo</Boton></div>
      </Modal>

      <Modal abierto={!!edit} onClose={() => { setEdit(null); setErrEdit(""); }} titulo="Editar registro">
        {edit && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2"><Campo etiqueta="Fecha" type="date" value={edit.fecha} onChange={(e) => setEdit({ ...edit, fecha: e.target.value })} />{sel("turno", TURNOS)}</div>
            <div className="grid gap-3 sm:grid-cols-2">{sel("supervisor", SUPERVISORES)}{sel("linea", LINEAS)}</div>
            <div className="grid gap-3 sm:grid-cols-2">{sel("tipo", TIPOS)}{txt("balanza", "Balanza / estacion")}</div>
            <div className="grid gap-3 sm:grid-cols-2">{txt("controladora", "Controladora de linea")}{txt("pesador", "Pesador")}</div>
            {txt("producto", "Producto")}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{nm("total", "Revisadas")}{nm("altas", "Alto")}{nm("bajas", "Bajo")}{nm("critico", "Critico")}</div>
            {errEdit && <p className="text-sm font-medium text-bad">{errEdit}</p>}
            <div className="flex justify-end gap-2 pt-2"><Boton onClick={() => setEdit(null)}>Cancelar</Boton><Boton variante="pri" onClick={guardarEdicion}>Guardar cambios</Boton></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
