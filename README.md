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
- Permisos: todos registran muestras; solo el admin borra (deslizando una muestra reciente). La pestana Datos se retiro; la conexion con Excel se hara mas adelante.

### Usuarios
La app pide **usuario y contrasena**. Crea cada usuario en Supabase (*Authentication > Users > Add user*) con el correo `usuario@galapesca.local` (ej. `xbarzallo@galapesca.local`), una contrasena y **Auto Confirm User** marcado. Tambien se puede entrar con un correo real escribiendolo completo.

### Gestion de usuarios y aprobacion de accesos
Las personas nuevas usan **"No tengo usuario: solicitar acceso"** en la pantalla de inicio. Su cuenta queda bloqueada hasta que un administrador la apruebe, por correo (enlace Aprobar/Rechazar a `diegobarzallo1992@gmail.com`) o desde la pestana **Usuarios** de la app.

Configuracion (una vez):
1. Supabase > **Edge Functions** > **Deploy a new function** > **Via Editor**. Nombre: `admin-usuarios`. Pega `supabase/functions/admin-usuarios/index.ts`. En los ajustes de la funcion **desactiva "Verify JWT"** y pulsa **Deploy**.
2. Para recibir el correo: crea una cuenta gratis en resend.com **con el correo diegobarzallo1992@gmail.com**, crea una API Key y guardala en Supabase > Edge Functions > **Secrets** como `RESEND_API_KEY`. (Con el remitente de prueba de Resend, solo se puede enviar al correo de la propia cuenta, que es justo este caso.) Opcional: secreto `ADMIN_EMAIL` para cambiar el destinatario.
3. Sin `RESEND_API_KEY` todo funciona igual, pero la aprobacion se hace solo desde la pestana Usuarios.
