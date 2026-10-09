# Control de pesos - Filling Pouch (Android)

App web instalable (PWA) empaquetable como APK con Capacitor. Los datos se guardan en el dispositivo (localStorage).

## Opcion rapida: instalar sin APK (PWA)
1. Publica la carpeta `www/` en cualquier hosting HTTPS (GitHub Pages, Netlify...).
2. Abre la URL en Chrome para Android > menu > "Instalar aplicacion". Funciona sin conexion.

## Generar el APK
Requisitos: Node 18+, JDK 17 y Android Studio (SDK).
```
npm install
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`. O usa `npx cap open android` y Build > Build APK.

## Dinamicas Android incluidas
- Vibracion al tocar botones y patron distinto al guardar (corto = en control, largo = sobre el limite, doble = error).
- Boton "atras" navega entre pestanas y cierra el editor.
- Copia de respaldo con la hoja de compartir de Android (WhatsApp, Drive, correo).
- Pantalla encendida mientras se registra.
- Areas seguras, objetivos tactiles de 48 px, teclado numerico y barra de pestanas fija.
- Instalable y sin conexion (service worker).
