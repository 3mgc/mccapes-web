# ⚡ MCCapes Web Panel

Panel web moderno para gestionar y subir capas cosméticas estáticas (`.png`) y animadas (`.gif`) para el mod **MCCape (Minecraft 1.8.9 Forge)**, sincronizadas en tiempo real con GitHub.

---

## ✨ Características

1. **Catálogo de Capas Globales:**
   - Visualización de todas las capas públicas con texturas en vivo y soporte para GIFs animados.
   - Equipar capas a cualquier usuario de Minecraft con 1 solo clic.

2. **Subida de Capas (.PNG y .GIF):**
   - Drag & drop con vista previa y comprobación de relación de aspecto 2:1 (64x32, 128x64, 256x128, 512x256).
   - **Opción de Capa Privada:**
     - Al marcarla como privada, la capa solo estará disponible para tu Nick y **no aparecerá** en el catálogo para tus amigos.
     - Si la dejas pública, se suma al catálogo global para que cualquiera se la pueda poner.

3. **Límite y Contador de Almacenamiento de GitHub:**
   - Barra de progreso que mide el peso total de las capas vs el 1 GB recomendado por GitHub.
   - Contador de capas totales vs límite visual sugerido (200 capas).
   - Límite máximo de 5 MB por archivo para evitar GIFs pesados que laguen el juego.

4. **Auto-registro de Nuevos Jugadores:**
   - Endpoint `/api/register` que el mod en Minecraft llama silenciosamente cuando un nuevo jugador entra al juego para asignarle `tux.png` y registrarlo en GitHub.

---

## 🚀 Despliegue en Vercel (Gratis y Seguro)

1. Sube esta carpeta `mccapes-web` a un repositorio nuevo en tu cuenta de GitHub (ej. `3mgc/mccapes-web`).
2. Entra a [vercel.com](https://vercel.com) e inicia sesión con GitHub.
3. Haz clic en **"Add New Project"** e importa el repositorio `mccapes-web`.
4. En **Environment Variables**, añade:
   - `GITHUB_TOKEN`: Tu Personal Access Token de GitHub con permisos de escritura en el repo `3mgc/mccapes`.
   - `GITHUB_REPO`: `3mgc/mccapes`
   - `GITHUB_BRANCH`: `main`
5. Haz clic en **Deploy**. ¡Listo! Vercel te dará un enlace como `https://mccapes.vercel.app` para compartir con tus amigos.

---

## 🛠️ Prueba Local

```bash
# Copia las variables de entorno
cp .env.example .env

# Edita .env con tu GITHUB_TOKEN
nano .env

# Inicia el servidor
node server.js
```
Abre en tu navegador: `http://localhost:3000`
