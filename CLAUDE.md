# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos de desarrollo

```bash
npm run dev        # Modo desarrollo con hot reload (tsx watch)
npm run build      # Compilar TypeScript a dist/
npm start          # Ejecutar bot en producción (requiere build previo)
npm run deploy     # Registrar/actualizar slash commands en Discord
```

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

## Arquitectura

### Carga dinámica

`src/index.ts` recorre `src/commands/` y `src/events/` al iniciar y registra todo automáticamente. Para añadir un comando o evento, basta con crear el archivo en la carpeta correspondiente.

### Comandos disponibles

| Comando | Descripción |
|---|---|
| `/play <entrada> [volumen]` | Reproduce o encola audio de YouTube (URL o búsqueda) o archivo de `assets/` |
| `/queue` | Muestra la cola de reproducción actual |
| `/pause` | Pausa o reanuda la reproducción |
| `/stop` | Detiene la reproducción y limpia la cola |
| `/clean` | Limpia la cola sin detener la canción actual |
| `/shuffle` | Mezcla aleatoriamente las canciones en cola |
| `/leave` | Desconecta el bot del canal de voz |
| `/ping` | Comprueba la latencia del bot |

### Sistema de audio (`src/musicManager.ts`)

Módulo singleton que gestiona por guild:
- **Cola de reproducción** (`queue: Track[]`)
- **Conexión de voz** (`VoiceConnection`)
- **Reproductor** (`AudioPlayer`)
- **Estado actual** (canción en curso, volumen, canal de texto)

Flujo de reproducción:
1. `/play` llama a `addTrack()` → resuelve el input (URL YT, búsqueda o archivo local)
2. Si es una conexión nueva, `ensureConnection()` llama a `playJoinSound()` que reproduce el audio de `JOIN_SOUND_URL` antes de empezar la cola
3. Si el player está idle, llama a `playNext()` con `notify: false` (el reply de la interaction ya notifica)
4. Al terminar una canción, el evento `AudioPlayerStatus.Idle` llama a `playNext()` con `notify: true` (envía embed al canal)
5. `playNext()` hace spawn de `yt-dlp` con `--extractor-args "youtube:player_client=android"` para obtener el stream y lo pasa a `createAudioResource` con `StreamType.Arbitrary`

Stack de audio:
- **`yt-dlp`** (binario del sistema) — streaming real de YouTube
- **`play-dl`** — búsqueda en YouTube y obtención de metadatos/thumbnails
- **`@discordjs/voice`** + **`ffmpeg-static`** — reproducción y transcodificación
- **`opusscript`** — fallback de codificador Opus

### Estructura de un comando

```ts
// src/commands/ejemplo.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';

const comando: Command = {
  data: new SlashCommandBuilder()
    .setName('ejemplo')
    .setDescription('Descripción'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Hola');
  },
};

export default comando;
```

### Estructura de un evento

```ts
// src/events/nombreEvento.ts
import { Events } from 'discord.js';

export default {
  name: Events.SomeEvent,
  once: false,
  async execute(...args: any[]) { /* ... */ },
};
```

### Flujo de interacciones

1. Usuario invoca slash command → Discord emite `interactionCreate`
2. `src/events/interactionCreate.ts` enruta al handler en `client.commands`
3. Errores son capturados y retornados al usuario como embed efímero

### Intents activos

Solo `Guilds` y `GuildVoiceStates` (sin privileged intents).

### Embeds y colores

Sistema de colores consistente en todas las respuestas:
- `0x1db954` verde — reproduciendo / acción positiva
- `0x5865f2` blurple — informativo / cola
- `0x57f287` verde claro — éxito
- `0xfee75c` amarillo — pausa / advertencia
- `0xed4245` rojo — detenido / error
