export const LINEAS = ["A", "B", "C", "D", "E"] as const;
export const TURNOS = ["Primero", "Segundo"] as const;
export const SUPERVISORES = ["Xavier Barzallo", "Sheyla Martillo"] as const;
export const TIPOS = ["Manual", "Semiautomatica"] as const;
const BALANZAS: Record<string, number> = { A: 12, B: 12, C: 10, D: 6, E: 10 };
const SEMI_ESTACIONES = 14;
export const KEY = "pesos-filling-pouch-v2";

export interface Registro {
  id: string; fecha: string; horaRegistro: string; turno: string; supervisor: string;
  linea: string; tipo: string; balanza: string; controladora: string; pesador: string; producto: string;
  total: number; altas: number; bajas: number; critico: number; fuera: number; pct: number;
}
export interface Datos { registros: Registro[]; umbral: number }

export const tieneSemi = (l: string) => l === "E";
export function balanzasDe(linea: string, tipo: string): string[] {
  const n = tieneSemi(linea) && tipo === "Semiautomatica" ? SEMI_ESTACIONES : BALANZAS[linea] ?? 0;
  return Array.from({ length: n }, (_, i) => String(i + 1));
}
export const estacion = (r: Pick<Registro, "tipo" | "linea" | "balanza">) =>
  r.tipo === "Semiautomatica" ? `${r.linea} semi ${r.balanza}` : `${r.linea}-${r.balanza}`;
const p2 = (x: number) => String(x).padStart(2, "0");
export function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
export function fmtFecha(iso: string) {
  const p = (iso || "").split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : "";
}
export function fmtHora(v: string) {
  if (!v) return "";
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}
export const pctDe = (f: number, t: number) => (!t || t <= 0 ? null : (f / t) * 100);

export type Nivel = "none" | "ok" | "warn" | "bad";
export function estado(pct: number | null | undefined, umbral: number) {
  if (pct == null) return { nivel: "none" as Nivel, color: "var(--mut)", texto: "Sin datos" };
  if (pct > umbral) return { nivel: "bad" as Nivel, color: "var(--bad)", texto: "Fuera de control" };
  if (pct > umbral * 0.6) return { nivel: "warn" as Nivel, color: "var(--warn)", texto: "Cerca del limite" };
  return { nivel: "ok" as Nivel, color: "var(--ok)", texto: "En control" };
}
export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ---------- almacenamiento ---------- */
export function cargarDatos(): Datos {
  try {
    const t = localStorage.getItem(KEY);
    if (t) {
      const d = JSON.parse(t);
      return { registros: d.registros ?? [], umbral: typeof d.umbral === "number" ? d.umbral : 25 };
    }
  } catch { /* sin almacenamiento */ }
  return { registros: [], umbral: 25 };
}
export function guardarDatos(d: Datos) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignorar */ }
}

/* ---------- agrupaciones ---------- */
export function agrupar(datos: Registro[], clave: keyof Registro | ((r: Registro) => string)) {
  const m: Record<string, { total: number; fuera: number; n: number }> = {};
  for (const r of datos) {
    const k = typeof clave === "function" ? clave(r) : String(r[clave]);
    if (!k) continue;
    const a = (m[k] ??= { total: 0, fuera: 0, n: 0 });
    a.total += r.total; a.fuera += r.fuera; a.n += 1;
  }
  return Object.entries(m).map(([nombre, a]) => ({ nombre, pct: +(pctDe(a.fuera, a.total) ?? 0).toFixed(2), n: a.n }));
}

export function fueraDeParametro(datos: Registro[], umbral: number) {
  const m: Record<string, { total: number; fuera: number; altas: number; bajas: number; critico: number; n: number; sobre: number; ultima: string; puestos: Record<string, number> }> = {};
  for (const r of datos) {
    if (!r.pesador) continue;
    const a = (m[r.pesador] ??= { total: 0, fuera: 0, altas: 0, bajas: 0, critico: 0, n: 0, sobre: 0, ultima: "", puestos: {} });
    a.total += r.total; a.fuera += r.fuera; a.altas += r.altas; a.bajas += r.bajas; a.critico += r.critico || 0; a.n++;
    if (r.pct > umbral) a.sobre++;
    if (r.fecha > a.ultima) a.ultima = r.fecha;
    const p = estacion(r);
    a.puestos[p] = (a.puestos[p] || 0) + 1;
  }
  return Object.entries(m).map(([nombre, a]) => ({
    nombre, ...a, pct: pctDe(a.fuera, a.total) ?? 0,
    puesto: Object.keys(a.puestos).sort((x, y) => a.puestos[y] - a.puestos[x])[0],
  })).filter((p) => p.pct > umbral).sort((a, b) => b.pct - a.pct);
}

/* ---------- CSV ---------- */
export const CAB = ["Fecha", "Hora registro", "Turno", "Supervisor", "Linea", "Tipo", "Balanza", "Controladora", "Pesador", "Producto",
  "Fundas revisadas", "Peso alto", "Peso bajo", "Peso critico", "Fuera de peso", "Porcentaje"];

export function aCSV(regs: Registro[]) {
  const filas = regs.map((r) =>
    [r.fecha, fmtHora(r.horaRegistro), r.turno, r.supervisor, r.linea, r.tipo, r.balanza, r.controladora, r.pesador, r.producto,
      r.total, r.altas, r.bajas, r.critico || 0, r.fuera, r.pct.toFixed(2)]
      .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"));
  return "﻿" + [CAB.join(";"), ...filas].join("\r\n");
}

function partirCSV(linea: string) {
  const out: string[] = []; let actual = ""; let dentro = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (dentro && linea[i + 1] === '"') { actual += '"'; i++; } else dentro = !dentro;
    } else if (ch === ";" && !dentro) { out.push(actual); actual = ""; } else actual += ch;
  }
  out.push(actual);
  return out;
}

export function desdeCSV(texto: string, existentes: Registro[]): Registro[] {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return [];
  const enc = partirCSV(lineas[0]).map((h) => h.trim().toLowerCase());
  const idx = (n: string) => enc.indexOf(n.toLowerCase());
  const I = { fecha: idx("Fecha"), hora: idx("Hora registro"), turno: idx("Turno"), sup: idx("Supervisor"), linea: idx("Linea"),
    tipo: idx("Tipo"), bal: idx("Balanza"), ctrl: idx("Controladora"), pes: idx("Pesador"), prod: idx("Producto"),
    total: idx("Fundas revisadas"), altas: idx("Peso alto"), bajas: idx("Peso bajo"), crit: idx("Peso critico") };
  const claves = new Set(existentes.map((r) => [r.fecha, r.turno, r.linea, r.balanza, r.pesador, r.total, r.altas, r.bajas].join("|")));
  const nuevos: Registro[] = [];
  for (const l of lineas.slice(1)) {
    const c = partirCSV(l);
    if (c.length < 10) continue;
    const total = parseInt(c[I.total], 10);
    const altas = parseInt(c[I.altas], 10) || 0, bajas = parseInt(c[I.bajas], 10) || 0;
    const critico = I.crit > -1 ? parseInt(c[I.crit], 10) || 0 : 0;
    if (isNaN(total) || total <= 0) continue;
    const k = [c[I.fecha], c[I.turno], c[I.linea], c[I.bal], c[I.pes], total, altas, bajas].join("|");
    if (claves.has(k)) continue;
    claves.add(k);
    const fuera = altas + bajas + critico;
    nuevos.push({ id: uid(), fecha: c[I.fecha], horaRegistro: (I.hora > -1 ? c[I.hora] : "") || "", turno: c[I.turno],
      supervisor: c[I.sup], linea: c[I.linea], tipo: c[I.tipo] || "Manual", balanza: c[I.bal], controladora: c[I.ctrl],
      pesador: c[I.pes], producto: c[I.prod], total, altas, bajas, critico, fuera, pct: pctDe(fuera, total) ?? 0 });
  }
  return nuevos;
}

export const ordenar = (a: Registro, b: Registro) => (b.fecha + b.id).localeCompare(a.fecha + a.id);
