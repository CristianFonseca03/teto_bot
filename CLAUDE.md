# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos de desarrollo

revisar `package.json` para scripts disponibles.

> Para desarrollo, usar siempre `npm run dev`. El script `deploy` solo se necesita al añadir o modificar comandos slash.

## Requisitos del sistema

- Node.js >= 22.12.0 (gestionar con nvm: `nvm use 22`)
- `yt-dlp` instalado en el sistema: `brew install yt-dlp`

## Variables de entorno

Crear `.env` basado en `.env.example`:

- `DISCORD_TOKEN` — token del bot (obligatorio)
- `CLIENT_ID` — application client ID (obligatorio para deploy)
- `GUILD_ID` — ID del servidor para registro de comandos en desarrollo (opcional; sin él, los comandos se registran globalmente y tardan ~1h en propagarse)
- `JOIN_SOUND_URL` — ruta relativa a `cwd` o URL HTTP del audio que se reproduce al entrar a un canal de voz (ej. `assets/teto.mp3`; opcional)
- `GIPHY_API_KEY` — API key de Giphy para el comando `/gif` (opcional; sin ella el comando devuelve error)
- `NODE_ENV` — si es distinto de `production`, el logger usa `pino-pretty` con colores en consola; en producción emite JSON puro

## Arquitectura

### Carga dinámica

`src/index.ts` recorre `src/commands/` y `src/events/` al iniciar y registra todo automáticamente. Para añadir un comando o evento, basta con crear el archivo en la carpeta correspondiente.

### Comandos disponibles

revisar `src/commands/` para la lista completa.

### Sistema de audio (`src/musicManager.ts`)

Módulo singleton que gestiona por guild:

- **Cola de reproducción** (`queue: Track[]`)
- **Conexión de voz** (`VoiceConnection`)
- **Reproductor** (`AudioPlayer`)
- **Estado actual** (canción en curso, volumen, canal de texto)

Flujo de reproducción:

1. `/play` llama a `addTrack()` → resuelve el input:
   - URLs con `?v=` + `&list=`: se extrae solo el video (`v=`) ignorando la playlist
   - URL de playlist pura: se usa `playdl.playlist_info()` y se encolan todos los videos
   - URL de video: se obtienen metadatos con `playdl.video_info()`
   - Texto libre: búsqueda con `playdl.search()`
   - Nombre de archivo: se busca en `assets/`
2. Si es una conexión nueva, `ensureConnection()` llama a `playJoinSound()` que reproduce el audio de `JOIN_SOUND_URL` antes de empezar la cola
3. Si el player está idle, llama a `playNext()` con `notify: false` (el reply de la interaction ya notifica)
4. Al terminar una canción, el evento `AudioPlayerStatus.Idle` llama a `playNext()` con `notify: true` (envía embed al canal)
5. `playNext()` hace spawn de `yt-dlp` con `--extractor-args "youtube:player_client=android"` para obtener el stream y lo pasa a `createAudioResource` con `StreamType.Arbitrary`
6. `/skip` llama a `player.stop()` sin vaciar la cola; el evento `Idle` dispara `playNext()` automáticamente

Stack de audio:

- **`yt-dlp`** (binario del sistema) — streaming real de YouTube
- **`play-dl`** — búsqueda en YouTube y obtención de metadatos/thumbnails
- **`@discordjs/voice`** + **`ffmpeg-static`** — reproducción y transcodificación
- **`opusscript`** — fallback de codificador Opus

### Estructura de un comando

```ts
// src/commands/ejemplo.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../types";

const comando: Command = {
  data: new SlashCommandBuilder()
    .setName("ejemplo")
    .setDescription("Descripción"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Hola");
  },
};

export default comando;
```

### Estructura de un evento

```ts
// src/events/nombreEvento.ts
import { Events } from "discord.js";

export default {
  name: Events.SomeEvent,
  once: false,
  async execute(...args: any[]) {
    /* ... */
  },
};
```

### Flujo de interacciones

1. Usuario invoca slash command → Discord emite `interactionCreate`
2. `src/events/interactionCreate.ts` enruta al handler en `client.commands`
3. Errores son capturados y retornados al usuario como embed efímero; el handler de error está envuelto en try-catch para evitar crashes si el token de interacción ya expiró

### Intents activos

Solo `Guilds` y `GuildVoiceStates` (sin privileged intents).

### Sistema de logging (`src/logger.ts`)

Singleton de `pino` con dos streams simultáneos:

- **Consola** — `pino-pretty` con colores si `NODE_ENV !== 'production'`; JSON puro en producción
- **Archivo** — `logs/<ISO-timestamp>.log` con JSON estructurado; un archivo nuevo por sesión

Cada ejecución de un comando se loguea automáticamente en `src/events/interactionCreate.ts` con:
- `command` — nombre del comando
- `user` / `userId` — tag e ID del usuario
- `options` — argumentos pasados al comando

Los stderr de `yt-dlp` se loguean como `warn` (no son errores fatales del bot).
La carpeta `logs/` está en `.gitignore`.

### Embeds y colores

Sistema de colores consistente en todas las respuestas:

- `0x1db954` verde — reproduciendo / acción positiva
- `0x5865f2` blurple — informativo / cola
- `0x57f287` verde claro — éxito
- `0xfee75c` amarillo — pausa / advertencia
- `0xed4245` rojo — detenido / error
