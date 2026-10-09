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
