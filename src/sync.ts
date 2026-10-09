import { supabase } from "./supabase";
import { ordenar, type Registro } from "./lib";

const COLA = "pesos-cola-v1";
interface Cola { up: Record<string, Registro>; del: string[] }

function leer(): Cola {
  try { const c = JSON.parse(localStorage.getItem(COLA) || ""); return { up: c.up ?? {}, del: c.del ?? [] }; } catch { return { up: {}, del: [] }; }
}
function escribir(c: Cola) { try { localStorage.setItem(COLA, JSON.stringify(c)); } catch { /* ignorar */ } }
export const pendientes = () => { const c = leer(); return Object.keys(c.up).length + c.del.length; };

const horaIso = (r: Registro) => {
  const v = r.horaRegistro; if (!v) return null;
  const d = /^\d{1,2}:\d{2}/.test(v) ? new Date(`${r.fecha}T${v.padStart(v.length === 7 ? 8 : v.length, "0")}`) : new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const aDb = (r: Registro) => ({
  id: r.id, fecha: r.fecha, hora_registro: horaIso(r), turno: r.turno, supervisor: r.supervisor, linea: r.linea, tipo: r.tipo,
  balanza: r.balanza, controladora: r.controladora, pesador: r.pesador, producto: r.producto, total: r.total, altas: r.altas,
  bajas: r.bajas, critico: r.critico || 0, fuera: r.fuera, pct: r.pct, actualizado: new Date().toISOString(),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deDb = (r: any): Registro => ({
  id: r.id, fecha: r.fecha, horaRegistro: r.hora_registro ?? "", turno: r.turno ?? "", supervisor: r.supervisor ?? "", linea: r.linea ?? "",
  tipo: r.tipo ?? "Manual", balanza: r.balanza ?? "", controladora: r.controladora ?? "", pesador: r.pesador ?? "", producto: r.producto ?? "",
  total: r.total, altas: r.altas, bajas: r.bajas, critico: r.critico ?? 0, fuera: r.fuera, pct: Number(r.pct),
});

/** Anota en la cola lo que cambio entre dos listas. */
export function encolar(prev: Registro[], next: Registro[]) {
  const c = leer();
  const antes = new Map(prev.map((r) => [r.id, JSON.stringify(r)]));
  const ahora = new Set(next.map((r) => r.id));
  for (const r of next) if (antes.get(r.id) !== JSON.stringify(r)) { c.up[r.id] = r; c.del = c.del.filter((x) => x !== r.id); }
  for (const r of prev) if (!ahora.has(r.id)) { delete c.up[r.id]; if (!c.del.includes(r.id)) c.del.push(r.id); }
  escribir(c);
}

// Error con codigo = el servidor respondio y rechazo (permisos, datos): no reintentar. Sin codigo = sin red.
const rechazo = (e: unknown) => !!(e as { code?: string })?.code;
const trozos = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
let ocupado = false;

/** Sube a Supabase lo pendiente. Devuelve true si no quedo nada por red. */
export async function vaciarCola(): Promise<boolean> {
  if (ocupado) return false;
  ocupado = true;
  try {
    for (const lote of trozos(Object.values(leer().up), 200)) {
      const { error } = await supabase.from("registros").upsert(lote.map(aDb));
      if (error && !rechazo(error)) return false;
      const c = leer(); lote.forEach((r) => { if (c.up[r.id] === r || JSON.stringify(c.up[r.id]) === JSON.stringify(r)) delete c.up[r.id]; }); escribir(c);
    }
    for (const lote of trozos(leer().del, 200)) {
      const { error } = await supabase.from("registros").delete().in("id", lote);
      if (error && !rechazo(error)) return false;
      const c = leer(); c.del = c.del.filter((x) => !lote.includes(x)); escribir(c);
    }
    return true;
  } finally { ocupado = false; }
}

/** Baja todo de Supabase y le superpone lo que aun esta pendiente de subir. */
export async function descargar(): Promise<Registro[]> {
  const filas: Registro[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from("registros").select("*").order("fecha", { ascending: false }).order("id", { ascending: false }).range(desde, desde + 999);
    if (error) throw error;
    filas.push(...data.map(deDb));
    if (data.length < 1000) break;
  }
  const c = leer();
  const m = new Map(filas.map((r) => [r.id, r]));
  c.del.forEach((id) => m.delete(id));
  Object.values(c.up).forEach((r) => m.set(r.id, r));
  return [...m.values()].sort(ordenar);
}

export async function leerUmbral(): Promise<number | null> {
  const { data } = await supabase.from("ajustes").select("valor").eq("clave", "umbral").maybeSingle();
  const n = Number(data?.valor);
  return isFinite(n) && n > 0 ? n : null;
}
export async function guardarUmbral(n: number) {
  await supabase.from("ajustes").upsert({ clave: "umbral", valor: n });
}
