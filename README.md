# Teto Bot

Bot de Discord construido con [discord.js](https://discord.js.org/) v14 y TypeScript. Ofrece reproducción de música desde YouTube y archivos locales, con comandos de control, conversión de monedas y búsqueda de GIFs.

## Requisitos

- **Node.js** >= 22.12.0 (gestionar con [nvm](https://github.com/nvm-sh/nvm): `nvm use 22`)
- **yt-dlp** — binario del sistema para streaming de YouTube
  ```bash
  brew install yt-dlp
  ```

## Instalación

1. Clonar el repositorio
   ```bash
   git clone <repositorio>
   cd teto_bot
   ```

2. Instalar dependencias
   ```bash
   npm install
   ```

3. Crear archivo `.env` basado en `.env.example`
   ```bash
   cp .env.example .env
   ```

4. Editar `.env` y completar las variables requeridas (ver tabla abajo)

5. Compilar (opcional, `npm run dev` lo hace automáticamente)
   ```bash
   npm run build
   ```

6. Ejecutar en desarrollo
   ```bash
   npm run dev
   ```

## Variables de entorno

| Variable | Requerida | Descripción | Ejemplo |
|---|---|---|---|
| `DISCORD_TOKEN` | Sí | Token del bot | `OTk1NzQ5NDc1OTUzMDc1NzEy...` |
| `CLIENT_ID` | Sí | Application client ID | `995749475953075712` |
| `GUILD_ID` | No | Server ID para dev (comandos instantáneos) | `123456789` |
| `JOIN_SOUND_URL` | No | Ruta o URL del audio al entrar a canal | `assets/teto.mp3` o `https://...` |
| `GIPHY_API_KEY` | No | API key de Giphy | Requerida para `/gif` |
| `EXCHANGE_RATE_API_KEY` | No | API key de ExchangeRate-API | Requerida para `/convert` |
| `SOUNDBOARD_PORT` | No | Puerto HTTP del servidor | `3000` (default) |
| `BASE_URL` | No | URL pública del bot (para acceder a la API) | `http://localhost:3000` o con ngrok |
| `SOUNDBOARD_URL` | No | URL del frontend (puede diferir de BASE_URL) | Igual que `BASE_URL` o GitHub Pages |
| `JWT_SECRET` | No | Secreto para firmar tokens JWT | Alfanumérico largo; se genera aleatoriamente si no se define |
| `NODE_ENV` | No | Modo ejecución | `development` o `production` |

## Scripts npm

| Script | Descripción |
|---|---|
| `npm run dev` | Desarrollo con recarga automática |
| `npm run build` | Compilar TypeScript a JavaScript |
| `npm run start` | Ejecutar bot compilado |
| `npm run deploy` | Registrar comandos slash en Discord |

Para desarrollo, usar siempre `npm run dev`. El script `deploy` solo es necesario después de añadir o cambiar opciones de comandos.

## Comandos disponibles

### Música

| Comando | Opción | Descripción |
|---|---|---|
| `/play` | `entrada` (requerida) | Reproduce o añade a la cola URL de YouTube, búsqueda o archivo local |
| `/play` | `volumen` (0-100) | Establece volumen (default: 75) |
| `/skip` | (ninguna) | Salta canción actual |
| `/skip` | `posicion` | Salta a una posición específica de la cola |
| `/pause` | (ninguna) | Pausa o reanuda la reproducción |
| `/stop` | (ninguna) | Detiene reproducción y limpia cola |
| `/queue` | (ninguna) | Muestra cola con botones de navegación y salto |
| `/clean` | (ninguna) | Vacía la cola (sin detener actual) |
| `/leave` | (ninguna) | Desconecta bot del canal de voz |
| `/priority` | `posicion` (requerida) | Mueve canción al inicio de la cola |
| `/shuffle` | (ninguna) | Mezcla aleatoriamente la cola |

### Utilidad

| Comando | Opción | Descripción |
|---|---|---|
| `/soundboard` | (ninguna) | Obtén tu enlace personal al soundboard web |
| `/convert` | `monto` (requerida) | Monto a convertir |
| `/convert` | `moneda` (requerida) | Moneda de origen (con autocomplete) |
| `/gif` | `busqueda` (requerida) | Busca GIF aleatorio en Giphy |
| `/ping` | (ninguna) | Muestra latencia del bot |
| `/help` | (ninguna) | Lista todos los comandos |

## Monedas soportadas en `/convert`

### Reales

| Código | Nombre | Símbolo |
|---|---|---|
| USD | US Dollar | 🇺🇸 |
| COP | Peso Colombiano | 🇨🇴 |
| MXN | Peso Mexicano | 🇲🇽 |

### Meme

| Código | Nombre | Símbolo | Equivalencia USD |
|---|---|---|---|
| GNS | Gansito | 🍰 | 1.00 |
| BAL | Balatro | 🃏 | 10.00 |
| SLK | Silksong | 🕷️ | 20.00 |
| SPX | Sub Proxy | 🔌 | 3.90 |
| AKC | AK-cartel | 🐉 | 19.40 |

Las tasas de monedas reales se obtienen de [ExchangeRate-API](https://www.exchangerate-api.com) cada hora. Las monedas meme tienen equivalencia fija.

## Soundboard Web

Interfaz web para reproducir sonidos sin escribir comandos. Requiere estar en un canal de voz.

**Cómo usar:**

1. Ejecuta `/soundboard` en Discord
2. Haz clic en el enlace del embed ephemeral
3. Selecciona un sonido del grid para reproducirlo en tu canal

**Características:**

- Interfaz responsive (grid 4/2/1 columnas según pantalla)
- Tokens JWT con TTL de 15 minutos (seguridad)
- Emojis Unicode con fallback a twemoji
- Pantalla de error si el bot está offline
- Detección automática de token expirado

**Para añadir sonidos:**

Edita `src/sounds.json`:

```json
[
  { "id": "bruh", "name": "Bruh", "url": "https://www.youtube.com/watch?v=2ZIpFytCSVc", "emoji": "😐" }
]
```

Después: `npm run build` y haz push a main. El workflow automático redeploya a GitHub Pages si está configurado.

## Archivos de audio locales

Coloca archivos de audio en el directorio `assets/` en la raíz del proyecto:

```
assets/
├── mi_cancion.mp3
├── sonido.wav
└── voz.ogg
```

Para reproducir:

```
/play mi_cancion.mp3
```

Formatos soportados: MP3, WAV, OGG, FLAC, etc. (cualquier formato que ffmpeg pueda decodificar).

## Logs

Los logs se guardan automáticamente en `logs/` con timestamp ISO:

```
logs/
├── 2026-03-19T15-30-45-123Z.log
├── 2026-03-19T18-22-10-456Z.log
└── ...
```

En desarrollo (`NODE_ENV !== 'production'`), los logs se muestran en consola con colores usando `pino-pretty`. En producción, se emite JSON puro.

Cada interacción incluye:
- `command` — nombre del comando
- `user` — tag del usuario
- `userId` — ID del usuario
- `options` — argumentos pasados

## Arquitectura

### Carga dinámica

Los comandos y eventos se cargan automáticamente al iniciar:

- **Comandos** — `src/commands/*.ts` (cada archivo exporta un comando)
- **Eventos** — `src/events/*.ts` (cada archivo exporta un manejador de evento)

No es necesario registrar comandos manualmente en el código.

### Reproducción de música

El sistema de música gestiona por servidor (guild):

- Cola de reproducción
- Conexión de voz
- Reproductor de audio
- Estado actual (canción, volumen, canal)

**Flujo:**

1. `/play` resuelve entrada (URL/búsqueda/archivo)
2. Si es conexión nueva, reproduce `JOIN_SOUND_URL` (si está configurada)
3. Encola y comienza reproducción si estaba idle
4. Al terminar, pasa automáticamente a siguiente
5. `/skip` salta canción actual y dispara siguiente automáticamente

**Resolución de entrada:**

- URL YouTube con playlist → extrae solo el video, ignora lista
- URL de playlist pura → encola todos los videos
- URL de video → obtiene metadatos y thumbnail
- Texto libre → búsqueda automática en YouTube
- Nombre de archivo → busca en `assets/`

### Stack técnico

| Componente | Propósito | Versión |
|---|---|---|
| discord.js | Client de Discord | ^14.16.3 |
| @discordjs/voice | Reproducción de voz | ^0.19.1 |
| play-dl | Búsqueda y metadatos YouTube | ^1.9.7 |
| yt-dlp | Streaming de YouTube | (binario del sistema) |
| ffmpeg-static | Transcodificación de audio | ^5.3.0 |
| opusscript | Codificador Opus (fallback) | ^0.0.8 |
| fastify | Servidor HTTP para soundboard | ^5.8.2 |
| jsonwebtoken | JWT para autenticación | ^9.0.3 |
| @fastify/cors | CORS para soundboard API | ^11.2.0 |
| @fastify/rate-limit | Rate limiting | ^10.3.0 |
| @fastify/static | Servir static files (web) | ^9.0.0 |
| pino | Logging | ^10.3.1 |
| pino-pretty | Colores en consola (dev) | ^13.1.3 |
| typescript | Tipado estático | ^5.7.2 |
| tsx | Ejecución directa de TS | ^4.19.2 |
| next | Frontend soundboard | ^15.3.0 |
| react | UI para soundboard | ^19.0.0 |
| twemoji-parser | Emojis en soundboard | ^14.0.0 |

## Desarrollo

### Añadir un comando

1. Crear archivo `src/commands/mi_comando.ts`:

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../types";

const miComando: Command = {
  data: new SlashCommandBuilder()
    .setName("micomando")
    .setDescription("Descripción breve"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Respuesta del bot");
  },
};

export default miComando;
```

2. Ejecutar `npm run deploy` para registrar el comando en Discord

3. Reiniciar bot con `npm run dev`

### Añadir un evento

1. Crear archivo `src/events/mi_evento.ts`:

```ts
import { Events } from "discord.js";

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: any) {
    if (message.author.bot) return;
    await message.reply("Echo: " + message.content);
  },
};
```

2. Reiniciar bot — se carga automáticamente

## Limitaciones y notas

- No hay suite de tests — las pruebas se realizan manualmente en Discord
- El collector de `/queue` no restringe a quién puede navegar (cualquiera puede hacerlo)
- Los archivos de audio locales no deben contener rutas relativas (`../`) en sus nombres para evitar escapes de directorio
- `interaction.user.tag` es deprecado en discord.js v14; considerar migrar a `interaction.user.username`

## Solución de problemas

### El bot no inicia
- Verificar que `DISCORD_TOKEN` y `CLIENT_ID` están definidos
- Ejecutar `npm install` para instalar dependencias
- Verificar que Node.js >= 22.12.0: `node --version`

### `/play` no funciona
- Verificar que `yt-dlp` está instalado: `yt-dlp --version`
- Para URLs de YouTube, asegurarse de que YouTube no bloqueó la extracción
- Para archivos locales, verificar que existen en `assets/`

### `/convert` devuelve error
- Verificar que `EXCHANGE_RATE_API_KEY` está definida
- Comprobar que la API key es válida en https://www.exchangerate-api.com

### `/gif` devuelve error
- Verificar que `GIPHY_API_KEY` está definida
- Comprobar que la API key es válida en https://giphy.com/apps

### `/soundboard` no abre o muestra error
- Verificar que estás en un canal de voz
- Comprobar que `BASE_URL` y `SOUNDBOARD_URL` están correctamente configuradas
- En local: usar `ngrok http 3000` y actualizar `BASE_URL=https://xxx.ngrok.io`
- Si el enlace expira: ejecuta `/soundboard` de nuevo para generar un nuevo token (TTL 15 min)

### El soundboard no se deploya a GitHub Pages
- Ir a Settings → Pages → Source: GitHub Actions
- Asegurarse de que `SOUNDBOARD_URL` apunta al repositorio correcto (ej. `https://usuario.github.io/teto-bot`)
- El workflow solo se ejecuta si `web/` o `src/sounds.json` cambian en push a main

### Los comandos tardan 1 hora en aparecer
- Definir `GUILD_ID` en `.env` para registro local instantáneo
- O ejecutar `npm run deploy` para forzar reregistro global

## Licencia

(Especificar licencia si aplica)

## Contacto

(Especificar datos de contacto si aplica)
