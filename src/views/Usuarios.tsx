import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Boton, Campo, Et, Modal, Seg, Tarjeta } from "../components/ui";
import { supabase } from "../supabase";
import { resultado } from "../native";

interface Usuario { id: string; usuario: string; nombre: string; estado: "activo" | "pendiente"; rol: "admin" | "usuario"; creado: string; ultimo: string | null }

async function llamar(cuerpo: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("admin-usuarios", { body: cuerpo });
  if (error) {
    let msg = "No se pudo conectar con el servidor de usuarios.";
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) msg = j.error; } catch { /* sin detalle */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function VistaUsuarios({ yoId, aviso }: { yoId: string; aviso: (m: string) => void }) {
  const [lista, setLista] = useState<Usuario[] | null>(null);
  const [error, setError] = useState("");
  const [nuevo, setNuevo] = useState({ usuario: "", clave: "", rol: "usuario" });
  const [ocupado, setOcupado] = useState(false);
  const [clavePara, setClavePara] = useState<Usuario | null>(null);
  const [claveNueva, setClaveNueva] = useState("");
  const [borrar, setBorrar] = useState<Usuario | null>(null);
  const [errModal, setErrModal] = useState("");

  const cargar = useCallback(async () => {
    try { setError(""); setLista((await llamar({ accion: "listar" })).usuarios); }
    catch (e) { setError((e as Error).message); setLista([]); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const ejecutar = async (cuerpo: Record<string, string>, ok: string, alExito?: () => void) => {
    setOcupado(true); setErrModal("");
    try { await llamar(cuerpo); resultado("ok"); aviso(ok); alExito?.(); await cargar(); }
    catch (e) { resultado("bad"); setError((e as Error).message); setErrModal((e as Error).message); }
    setOcupado(false);
  };

  return (
    <div className="space-y-4">
      {lista?.some((u) => u.estado === "pendiente") && (
        <Tarjeta titulo="Solicitudes pendientes" nota="Esperan tu aprobacion">
          <ul className="space-y-2">
            {lista.filter((u) => u.estado === "pendiente").map((u) => (
              <motion.li key={u.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-warn/10 p-3 ring-1 ring-warn/40">
                <p className="font-bold">{u.nombre || u.usuario} <span className="font-normal text-mut">({u.usuario})</span></p>
                <div className="mt-2 flex gap-2">
                  <Boton variante="pri" disabled={ocupado} onClick={() => ejecutar({ accion: "aprobar", id: u.id }, `${u.usuario} aprobado.`)}>Aprobar</Boton>
                  <Boton variante="peligro" disabled={ocupado} onClick={() => ejecutar({ accion: "eliminar", id: u.id }, "Solicitud rechazada.")}>Rechazar</Boton>
                </div>
              </motion.li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta titulo="Crear usuario" nota="Entra con usuario y contrasena">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Usuario" autoCapitalize="none" autoCorrect="off" placeholder="ej. sheyla" value={nuevo.usuario} onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })} />
          <Campo etiqueta="Contrasena (min. 6)" type="text" autoComplete="off" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} />
        </div>
        <div className="mt-3"><Et>Permisos</Et><Seg opciones={["usuario", "admin"]} valor={nuevo.rol} onChange={(v) => setNuevo({ ...nuevo, rol: v })} /></div>
        <p className="mt-2 text-xs text-mut"><b>usuario</b>: registra muestras y ve el panel. <b>admin</b>: ademas borra muestras y gestiona usuarios.</p>
        <AnimatePresence>{error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-sm font-medium text-bad">{error}</motion.p>}</AnimatePresence>
        <Boton variante="pri" className="mt-4 w-full" disabled={ocupado || !nuevo.usuario || !nuevo.clave}
          onClick={() => ejecutar({ accion: "crear", ...nuevo }, `Usuario ${nuevo.usuario} creado.`, () => setNuevo({ usuario: "", clave: "", rol: "usuario" }))}>Crear usuario</Boton>
      </Tarjeta>

      <Tarjeta titulo="Usuarios" nota={lista ? `${lista.length} en total` : ""}>
        {lista === null && <p className="py-6 text-center text-mut">Cargando...</p>}
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {lista?.filter((u) => u.estado === "activo").map((u) => (
              <motion.li key={u.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60 }} className="rounded-2xl bg-bg p-3 ring-1 ring-line">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-bold">{u.usuario}{u.id === yoId && <span className="font-normal text-mut"> (tu)</span>}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${u.rol === "admin" ? "bg-deep/15 text-deep" : "bg-line text-mut"}`}>{u.rol}</span>
                </div>
                <p className="mt-0.5 text-xs text-mut">Ultimo acceso: {u.ultimo ? new Date(u.ultimo).toLocaleString("es-EC") : "nunca"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {u.id !== yoId && <Boton disabled={ocupado} onClick={() => ejecutar({ accion: "actualizar", id: u.id, rol: u.rol === "admin" ? "usuario" : "admin" }, `Permisos de ${u.usuario} actualizados.`)}>{u.rol === "admin" ? "Quitar admin" : "Hacer admin"}</Boton>}
                  <Boton onClick={() => { setClaveNueva(""); setErrModal(""); setClavePara(u); }}>Cambiar contrasena</Boton>
                  {u.id !== yoId && <Boton variante="peligro" onClick={() => { setErrModal(""); setBorrar(u); }}>Eliminar</Boton>}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <p className="mt-3 text-xs text-mut">Los cambios de permisos se aplican cuando la persona vuelve a iniciar sesion.</p>
      </Tarjeta>

      <Modal abierto={!!clavePara} onClose={() => setClavePara(null)} titulo={`Nueva contrasena para ${clavePara?.usuario}`}>
        <Campo etiqueta="Contrasena (min. 6)" type="text" autoComplete="off" autoFocus value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} />
        {errModal && <p className="mt-2 text-sm font-medium text-bad">{errModal}</p>}
        <div className="mt-5 flex justify-end gap-2"><Boton onClick={() => setClavePara(null)}>Cancelar</Boton>
          <Boton variante="pri" disabled={ocupado || claveNueva.length < 6} onClick={() => ejecutar({ accion: "actualizar", id: clavePara!.id, clave: claveNueva }, "Contrasena actualizada.", () => setClavePara(null))}>Guardar</Boton></div>
      </Modal>

      <Modal abierto={!!borrar} onClose={() => setBorrar(null)} titulo="Eliminar usuario">
        <p className="text-sm">¿Eliminar a <b>{borrar?.usuario}</b>? Ya no podra entrar a la app. Sus muestras registradas se conservan.</p>
        {errModal && <p className="mt-2 text-sm font-medium text-bad">{errModal}</p>}
        <div className="mt-5 flex justify-end gap-2"><Boton onClick={() => setBorrar(null)}>Cancelar</Boton>
          <Boton variante="peligro" disabled={ocupado} onClick={() => ejecutar({ accion: "eliminar", id: borrar!.id }, "Usuario eliminado.", () => setBorrar(null))}>Eliminar</Boton></div>
      </Modal>
    </div>
  );
}
