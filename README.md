# Control de pesos - Filling Pouch (Android)

App para registrar muestras de peso de fundas y ver el porcentaje fuera de control. Datos guardados en el dispositivo.

**Stack:** React 19 + Vite 8 + TypeScript, Tailwind CSS 4, Motion 14 (animaciones), Recharts 3 (graficos), Capacitor 8 (Android).

## Desarrollo
```
npm install
npm run dev        # http://localhost:5173
npm run build
```

## Generar el APK
**Opcion A - GitHub Actions (sin instalar nada):** pestana *Actions* > *Build Android APK* > *Run workflow*. Descarga `control-pesos-debug-apk` al terminar.

**Opcion B - local** (Node 22, JDK 21, Android SDK):
```
npm install
npx cap add android
npm run android:apk      # android/app/build/outputs/apk/debug/app-debug.apk
```
O `npm run android:open` para abrir Android Studio.

## Dinamicas Android
- Haptics nativo (Capacitor): toque, exito/advertencia/error al guardar segun el % obtenido.
- Boton "atras": vuelve a Registrar; en Registrar sale de la app.
- Hoja de compartir de Android para exportar CSV y copia de respaldo.
- Barra de estado integrada, areas seguras, objetivos tactiles de 48 px.
- Gestos: deslizar una muestra reciente para borrarla; arrastrar hacia abajo para cerrar paneles.
- Respeta modo oscuro y "reducir animaciones" del sistema.

`legacy-pwa/` conserva la version anterior en HTML unico.

## Supabase (datos compartidos)
- Proyecto: `https://wqrtmkxtrzblghviumsd.supabase.co` (la clave publicable esta en `src/supabase.ts`; puede sobreescribirse con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`). **Nunca** pongas la clave `sb_secret_...` en el codigo.
- Ejecuta `supabase/schema.sql` en el SQL Editor de Supabase (crea tablas, politicas RLS y tiempo real).
- Crea usuarios en *Authentication > Users* (un correo y contrasena por persona).
- Da rol admin a quien edita/borra: ver la ultima linea comentada de `schema.sql`.
- La app guarda primero en el celular y sube a Supabase cuando hay internet (indicador en la cabecera). El panel se actualiza en tiempo real.
- Permisos: todos registran muestras; solo el admin edita, borra, cambia el limite, reinicia y restaura respaldos.
