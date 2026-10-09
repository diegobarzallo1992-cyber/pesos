import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Boton, Numero, Tarjeta } from "../components/ui";
import { LINEAS, TURNOS, agrupar, estacion, estado, fmtFecha, fueraDeParametro, pctDe, type Registro } from "../lib";

type Filtros = { linea: string; turno: string; desde: string; hasta: string };
const F0: Filtros = { linea: "Todas", turno: "Todos", desde: "", hasta: "" };

function Ranking({ datos, umbral, tope = 10 }: { datos: { nombre: string; pct: number; n: number }[]; umbral: number; tope?: number }) {
  if (!datos.length) return <p className="py-8 text-center text-sm text-mut">No hay muestras con estos filtros.</p>;
  const max = Math.max(umbral, ...datos.map((d) => d.pct)) * 1.08;
  return (
    <div className="space-y-2.5">
      {datos.slice(0, tope).map((d, i) => {
        const e = estado(d.pct, umbral);
        return (
          <div key={d.nombre} title={`${d.nombre} - ${d.n} muestras`} className="grid grid-cols-[110px_1fr_52px] items-center gap-2.5 text-[0.85rem]">
            <span className="truncate">{d.nombre}</span>
            <span className="relative h-5 rounded-full bg-bg">
              <motion.i className="block h-5 rounded-full" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${e.color} 55%, transparent), ${e.color})` }}
                initial={{ width: 0 }} animate={{ width: `${(d.pct / max) * 100}%` }} transition={{ type: "spring", stiffness: 70, damping: 18, delay: i * 0.04 }} />
              <u className="absolute -top-0.5 -bottom-0.5 w-0 border-l border-dashed border-bad" style={{ left: `${(umbral / max) * 100}%` }} />
            </span>
            <span className="text-right font-bold tabular" style={{ color: e.color }}>{d.pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function Kpi({ t, children, nota, color }: { t: string; children: React.ReactNode; nota: string; color?: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="rounded-3xl bg-card p-4 ring-1 ring-line">
      <p className="text-[0.8rem] font-semibold text-mut">{t}</p>
      <p className="mt-1 text-2xl font-bold leading-none sm:text-3xl" style={{ color }}>{children}</p>
      <p className="mt-1.5 text-xs text-mut">{nota}</p>
    </motion.div>
  );
}

export function VistaPanel({ registros, umbral, onEjemplo }: { registros: Registro[]; umbral: number; onEjemplo: () => void }) {
  const [f, setF] = useState<Filtros>(F0);
  const d = useMemo(() => registros.filter((r) =>
    (f.linea === "Todas" || r.linea === f.linea) && (f.turno === "Todos" || r.turno === f.turno) &&
    (!f.desde || r.fecha >= f.desde) && (!f.hasta || r.fecha <= f.hasta)), [registros, f]);

  if (!registros.length) {
    return (
      <Tarjeta className="py-14 text-center">
        <p className="mb-4 text-mut">El panel se arma con las muestras que registres.</p>
        <Boton variante="pri" onClick={onEjemplo}>Ver con datos de ejemplo</Boton>
      </Tarjeta>
    );
  }

  let tot = 0, fue = 0, alt = 0, baj = 0, cri = 0, sobre = 0;
  for (const r of d) { tot += r.total; fue += r.fuera; alt += r.altas; baj += r.bajas; cri += r.critico || 0; if (r.pct > umbral) sobre++; }
  const pctG = pctDe(fue, tot);
  const pctSobre = d.length ? (sobre / d.length) * 100 : null;
  const porFecha: Record<string, { t: number; f: number }> = {};
  for (const r of d) { const a = (porFecha[r.fecha] ??= { t: 0, f: 0 }); a.t += r.total; a.f += r.fuera; }
  const serie = Object.keys(porFecha).sort().map((k) => ({ fecha: fmtFecha(k), pct: +(pctDe(porFecha[k].f, porFecha[k].t) ?? 0).toFixed(1) }));
  const desc = (a: { pct: number }, b: { pct: number }) => b.pct - a.pct;
  const alf = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre);
  const pesadoras = fueraDeParametro(d, umbral);
  const sel = "min-h-11 rounded-2xl bg-card px-3 text-sm ring-1 ring-line";
  const hay = f.linea !== "Todas" || f.turno !== "Todos" || f.desde || f.hasta;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-mut">Linea<br /><select className={sel} value={f.linea} onChange={(e) => setF({ ...f, linea: e.target.value })}>{["Todas", ...LINEAS].map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="text-xs font-semibold text-mut">Turno<br /><select className={sel} value={f.turno} onChange={(e) => setF({ ...f, turno: e.target.value })}>{["Todos", ...TURNOS].map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="text-xs font-semibold text-mut">Desde<br /><input type="date" className={sel} value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></label>
        <label className="text-xs font-semibold text-mut">Hasta<br /><input type="date" className={sel} value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></label>
        {hay && <button className="min-h-11 px-2 text-sm font-semibold text-deep underline" onClick={() => setF(F0)}>Quitar filtros</button>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi t="Fuera de peso" color={estado(pctG, umbral).color} nota={`de ${tot.toLocaleString("es-EC")} fundas revisadas`}>{pctG == null ? "-" : <Numero valor={pctG} decimales={1} sufijo="%" />}</Kpi>
        <Kpi t="Muestras" nota="tomas registradas"><Numero valor={d.length} /></Kpi>
        <Kpi t="Sobre el limite" color={sobre > 0 ? "var(--bad)" : "var(--ok)"} nota={`${sobre} muestras pasan de ${umbral}%`}>{pctSobre == null ? "-" : <Numero valor={pctSobre} sufijo="%" />}</Kpi>
        <Kpi t="Alto / bajo / critico" nota={alt + baj + cri === 0 ? "sin separaciones" : cri > 0 && cri >= alt && cri >= baj ? "predominan los pesos criticos" : alt > baj ? "predomina el sobrellenado" : baj > alt ? "predomina el llenado corto" : "repartido parejo"}>
          <Numero valor={alt} /> / <Numero valor={baj} /> / <Numero valor={cri} />
        </Kpi>
      </div>

      <Tarjeta titulo="Pesadoras fuera del parametro" nota={`Superan el ${umbral}% establecido`}>
        {pesadoras.length === 0 ? <p className="py-6 text-center font-semibold text-ok">Ninguna pesadora supera el {umbral}% en el periodo seleccionado.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.85rem] tabular">
              <thead><tr className="text-left text-xs text-mut">{["Pesadora", "Balanza", "Revisadas", "Alto", "Bajo", "Critico", "Tomas", "Ultima", "Fuera de peso"].map((h, i) => <th key={h} className={`px-2 pb-2 whitespace-nowrap ${i > 1 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {pesadoras.map((p, i) => (
                  <motion.tr key={p.nombre} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="border-t border-line">
                    <td className="px-2 py-2 font-semibold">{p.nombre}</td><td className="px-2 whitespace-nowrap">{p.puesto}</td>
                    <td className="px-2 text-right">{p.total}</td><td className="px-2 text-right">{p.altas}</td><td className="px-2 text-right">{p.bajas}</td><td className="px-2 text-right">{p.critico}</td>
                    <td className="px-2 text-right">{p.sobre} de {p.n}</td><td className="px-2 text-right">{fmtFecha(p.ultima)}</td>
                    <td className="px-2 text-right font-bold text-bad">{p.pct.toFixed(1)}%</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Tendencia diaria" nota={`Linea de referencia: ${umbral}%`}>
        {serie.length < 2 ? <p className="py-10 text-center text-sm text-mut">Se necesitan al menos dos fechas para dibujar la tendencia.</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--deep2)" stopOpacity={0.55} /><stop offset="100%" stopColor="var(--deep2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fill: "var(--mut)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--mut)", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, (m: number) => Math.ceil(Math.max(m, umbral) * 1.15)]} />
                <Tooltip formatter={(v) => [`${v}%`, "Fuera de peso"]} contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, color: "var(--fg)" }} />
                <ReferenceLine y={umbral} stroke="var(--bad)" strokeDasharray="5 4" />
                <Area type="monotone" dataKey="pct" stroke="var(--deep2)" strokeWidth={3} fill="url(#g)" dot={{ r: 4, fill: "var(--deep2)", strokeWidth: 0 }}
                  activeDot={{ r: 7 }} animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Por turno" nota="Primero contra Segundo"><Ranking umbral={umbral} tope={2} datos={agrupar(d, "turno").sort(alf)} /></Tarjeta>
        <Tarjeta titulo="Por linea"><Ranking umbral={umbral} tope={5} datos={agrupar(d, "linea").sort(alf)} /></Tarjeta>
        <Tarjeta titulo="Por balanza" nota="Las 10 mas altas"><Ranking umbral={umbral} datos={agrupar(d, estacion).sort(desc)} /></Tarjeta>
        <Tarjeta titulo="Por pesador" nota="Los 10 mas altos"><Ranking umbral={umbral} datos={agrupar(d, "pesador").sort(desc)} /></Tarjeta>
        <Tarjeta titulo="Por controladora de linea" nota="Las 10 mas altas"><Ranking umbral={umbral} datos={agrupar(d, "controladora").sort(desc)} /></Tarjeta>
        <Tarjeta titulo="Por supervisor del turno"><Ranking umbral={umbral} tope={6} datos={agrupar(d, "supervisor").sort(desc)} /></Tarjeta>
      </div>
    </div>
  );
}
