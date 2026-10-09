import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

export const esNativa = Capacitor.isNativePlatform();

export async function toque() {
  try { esNativa ? await Haptics.impact({ style: ImpactStyle.Light }) : navigator.vibrate?.(10); } catch { /* sin vibracion */ }
}
export async function resultado(tipo: "ok" | "warn" | "bad") {
  try {
    if (esNativa) {
      await Haptics.notification({ type: tipo === "ok" ? NotificationType.Success : tipo === "warn" ? NotificationType.Warning : NotificationType.Error });
    } else navigator.vibrate?.(tipo === "ok" ? 30 : tipo === "warn" ? [40, 30, 40] : [60, 40, 60, 40, 120]);
  } catch { /* sin vibracion */ }
}

/** Guarda/comparte un archivo: hoja de compartir en Android, descarga en navegador. */
export async function entregarArchivo(nombre: string, contenido: string, mime: string) {
  if (esNativa) {
    const r = await Filesystem.writeFile({ path: nombre, data: contenido, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: nombre, url: r.uri, dialogTitle: "Guardar o compartir" });
    return;
  }
  const archivo = new File([contenido], nombre, { type: mime });
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: nombre }); return; } catch { /* cancelado */ }
  }
  const url = URL.createObjectURL(archivo);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function iniciarNativo(alAtras: () => boolean) {
  if (!esNativa) return;
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#0B2A31" }).catch(() => {});
  App.addListener("backButton", () => { if (!alAtras()) App.exitApp(); });
}
