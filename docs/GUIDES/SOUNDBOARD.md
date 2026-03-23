# Guía del Soundboard

**Última actualización:** 2026-03-23

## Descripción general

El soundboard es una interfaz web para reproducir sonidos del catálogo sin necesidad de escribir comandos. Ofrece una experiencia más ágil y visual con un grid responsive y autenticación JWT segura.

## Requisitos

- Estar en un canal de voz
- Ejecutar `/soundboard` desde un servidor donde el bot está activo
- Enlace válido (expira en 15 minutos)

## Cómo usar como usuario

### Paso 1: Obtener el enlace

1. Estando en un canal de voz de Discord, ejecuta `/soundboard`
2. El bot responderá con un embed azul (ephemeral) que contiene un enlace clickeable
3. Haz clic en "Abrir Soundboard"

### Paso 2: Usar la interfaz web

- El soundboard se abre en tu navegador
- Verás un grid con botones de sonidos (cada uno tiene un emoji)
- Haz clic en cualquier sonido para reproducirlo en tu canal de voz actual
- El bot debe estar online — si no lo está, verás una pantalla offline

### Notas

- El enlace expira en **15 minutos**
- Si expira, ejecuta `/soundboard` de nuevo para obtener un nuevo enlace
- Debes estar en un canal de voz cuando hagas clic en los sonidos
- La interface es completamente responsiva (funciona en móvil)

## Cómo administrar el catálogo

### Estructura de sonidos.json

Archivo: `/Users/cristianfonseca03/vscode/teto_bot/src/sounds.json`

```json
[
  {
    "id": "bruh",
    "name": "Bruh",
    "url": "https://www.youtube.com/watch?v=2ZIpFytCSVc",
    "emoji": "😐"
  },
  {
    "id": "ta_da",
    "name": "Ta-Da",
    "url": "https://www.youtube.com/watch?v=6zXDo4dL7SU",
    "emoji": "🎉"
  }
]
```

**Campos:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | string | Sí | Identificador único (minúsculas, sin espacios, slugificado) |
| `name` | string | Sí | Nombre mostrado en la UI del soundboard |
| `url` | string | Sí | URL de YouTube (solo de videos individuales) |
| `emoji` | string | Sí | Emoji Unicode (recomendado un carácter per sonido) |

### Agregar un nuevo sonido

1. Abre `/Users/cristianfonseca03/vscode/teto_bot/src/sounds.json`
2. Agrega un nuevo objeto al array:

```json
{
  "id": "metal_pipe",
  "name": "Metal Pipe",
  "url": "https://www.youtube.com/watch?v=iDLmYZ5HqgM",
  "emoji": "🔩"
}
```

3. Guarda el archivo
4. Compila: `npm run build`
5. Haz push a main → el workflow automático redeploya a GitHub Pages (si está configurado)

**Tips:**

- Usa URLs directas de videos YouTube (no playlists)
- Los emojis Unicode funcionan mejor que códigos personalizados
- El `id` se usa internamente — mantenlo único y consistente
- Los cambios se reflejan después de redeploy

### Editar un sonido existente

1. Localiza el sonido en `src/sounds.json`
2. Modifica `name`, `url` o `emoji`
3. **NO cambies `id`** (se usa como referencia en la API)
4. Guarda, compila (`npm run build`) y haz push a main

### Eliminar un sonido

1. Abre `src/sounds.json`
2. Elimina el objeto completo del array
3. Guarda, compila y push

## Arquitectura técnica

### Stack

| Componente | Propósito |
|---|---|
| **Backend** | Fastify + TypeScript |
| **Autenticación** | JWT (HS256, TTL 15 min) |
| **API** | REST con CORS restringido |
| **Rate limiting** | 10 req/min por usuario |
| **Frontend** | Next.js 15 (React 19) |
| **Emojis** | twemoji-parser para fallback |
| **Hosting** | GitHub Pages (frontend), servidor bot (API) |

### Endpoints REST

#### GET /api/soundboard/health
Health check para verificar que el bot está online.

**Respuesta:**
```json
{ "status": "ok" }
```

#### GET /api/soundboard/sounds
Lista los sonidos disponibles (sin exponer URLs de YouTube).

**Respuesta:**
```json
[
  { "id": "bruh", "name": "Bruh", "emoji": "😐" },
  { "id": "ta_da", "name": "Ta-Da", "emoji": "🎉" }
]
```

#### POST /api/soundboard/play
Reproduce un sonido en el canal de voz del usuario.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{ "soundId": "bruh" }
```

**Respuesta (200):**
```json
{ "success": true, "title": "Bruh Sound Effect #2" }
```

**Errores comunes:**

- `401 Token requerido` — No se envió token
- `401 Token inválido o expirado` — Token expirado o malformado
- `400 Sonido no encontrado` — El soundId no existe
- `400 No estás en un canal de voz` — El usuario no está en voz
- `400 Servidor no encontrado` — El servidor fue eliminado
- `500 Error al reproducir` — Error interno (verificar logs del bot)

### Flujo de autenticación

1. Usuario ejecuta `/soundboard` en Discord
2. Bot genera JWT con `userId` + `guildId`, TTL 15 min, secret HS256
3. Bot construye URL con token en hash: `#token=...&api=...`
4. Usuario abre enlace
5. Frontend parsea token del hash (elimina del historial por privacidad)
6. Frontend valida expiración del JWT localmente
7. Frontend envía `Authorization: Bearer <token>` a `/api/soundboard/play`
8. Backend verifica JWT y ejecuta comando

**Seguridad:**

- Tokens no son reutilizables indefinidamente (TTL 15 min)
- CORS restringido a orígenes configurados
- Rate limiting previene abuso
- Headers de seguridad: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`

## Configuración de deploy

### En desarrollo local

```bash
BASE_URL=http://localhost:3000
SOUNDBOARD_URL=http://localhost:3000
SOUNDBOARD_PORT=3000
JWT_SECRET=cualquier-string-aleatorio
```

Ejecutar `npm run dev` — el bot escucha en puerto 3000.

### Exponer a internet (ngrok)

```bash
# En otra terminal:
ngrok http 3000

# Obtener URL (ej: https://abc123.ngrok.io) y actualizar .env:
BASE_URL=https://abc123.ngrok.io
SOUNDBOARD_URL=http://localhost:3000
```

### GitHub Pages + dominio personalizado (producción)

**1. Configurar Pages en GitHub:**
- Settings → Pages → Source: GitHub Actions

**2. Actualizar .env:**
```bash
BASE_URL=https://tu-dominio.com  # o URL de ngrok/servidor
SOUNDBOARD_URL=https://usuario.github.io/teto-bot  # GitHub Pages
JWT_SECRET=generar-string-aleatorio-largo  # Persistir
```

**3. Crear workflow (ya incluido):**
- `.github/workflows/deploy-soundboard.yml` deploya automáticamente a Pages en push a main cuando cambia `web/` o `src/sounds.json`

**4. Hacer push:**
```bash
git add src/sounds.json .env
git commit -m "feat: add soundboard with initial sounds"
git push
```

El workflow se ejecutará automáticamente.

## Solución de problemas

### "Debes estar en un canal de voz para usar el soundboard"
- El usuario no estaba en voz cuando ejecutó `/soundboard`
- Solución: Únete a un canal de voz primero

### Enlace abre pero muestra "offline"
- El bot no está respondiendo a `/api/soundboard/health`
- Solución: Verifica que el bot está online (conectado a Discord)
- Verifica logs: `npm run dev` o revisar logs en `logs/`

### "Token inválido o expirado"
- El token caducó (15 minutos)
- Solución: Ejecuta `/soundboard` de nuevo para obtener uno nuevo

### Sonido no suena
- El usuario ya no está en el canal de voz
- El bot perdió conexión de voz
- Solución: Intenta ejecutar `/play` manualmente para verificar
- Revisa logs del bot

### El soundboard no se ve (cuando desplegado a Pages)
- `SOUNDBOARD_URL` está mal configurada
- Solución: Verificar que apunta a la rama `gh-pages` correcta
- Ejecutar `npm run build` localmente y hacer push

## Logs y debugging

### Habilitar debug mode

En `.env`:
```bash
NODE_ENV=development
```

Los logs mostrarán información sobre:
- Ejecución de comandos (incluyendo `/soundboard`)
- Llamadas a API del soundboard
- Tokens generados y verificados
- Errores al reproducir

### Ver logs

```bash
# Logs en tiempo real:
npm run dev

# Logs históricos:
tail -f logs/*.log
```

### Información útil en logs

Busca líneas como:
```
Soundboard: sonido reproducido { soundId: 'bruh', userId: '123...', guildId: '456...' }
Soundboard: error al reproducir { err: Error(...), soundId: 'bruh' }
```

## Preguntas frecuentes

### ¿Por qué el token expira en 15 minutos?
Es un balance entre comodidad y seguridad. Tokens cortos previenen que alguien con el enlace pueda usarlo indefinidamente.

### ¿Puedo compartir el enlace del soundboard con otros usuarios?
Técnicamente sí, pero no es recomendado. El token identifica tu usuario y guild. Otros podrían reproducir sonidos "como tú" hasta que expire.

### ¿Qué pasa si el bot reinicia?
- Si `JWT_SECRET` no está en `.env`, los tokens existentes se invalidan (el secret cambia)
- Si `JWT_SECRET` está configurado, los tokens siguen siendo válidos (recomendado para producción)

### ¿Puedo usar URLs de Spotify, SoundCloud, etc?
No. El soundboard solo soporta YouTube actualmente. La búsqueda y metadatos se resuelven con `play-dl` que está optimizado para YouTube.

### ¿Hay límite de sonidos en el catálogo?
No hay límite técnico, pero la interfaz frontend es más usable con 10-50 sonidos. Con muchos, considera pagination o búsqueda.

### ¿Puedo personalizar los colores/tema del soundboard?
Sí, editando `/Users/cristianfonseca03/vscode/teto_bot/web/styles/globals.css` y componentes en `web/app/` y `web/components/`.

## Recursos

- **API Discord.js:** https://discord.js.org/
- **Fastify:** https://www.fastify.io/
- **JWT:** https://jwt.io/
- **Next.js:** https://nextjs.org/
- **twemoji-parser:** https://github.com/twitter/twemoji-parser
