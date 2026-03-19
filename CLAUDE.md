# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Requisitos del sistema

- Node.js >= 22.12.0 (gestionar con nvm: `nvm use 22`)
- `yt-dlp` instalado en el sistema: `brew install yt-dlp`

## Comandos de desarrollo

Revisar `package.json` para scripts disponibles:

- `npm run build` — Compila TypeScript a JavaScript en `dist/`
- `npm run start` — Ejecuta el bot compilado
- `npm run dev` — Modo desarrollo con `tsx watch` y recarga automática
- `npm run deploy` — Registra comandos slash en Discord (ver notas abajo)

Para desarrollo, usar siempre `npm run dev`. El script `deploy` solo se necesita al añadir o modificar comandos slash.

## Variables de entorno

Crear `.env` basado en `.env.example`:

| Variable | Requerida | Descripción |
|---|---|---|
| `DISCORD_TOKEN` | Sí | Token del bot (obtener de Discord Developer Portal) |
| `CLIENT_ID` | Sí | Application client ID (necesario para deploy de comandos) |
| `GUILD_ID` | No | ID del servidor para registro de comandos en desarrollo; sin él, se registran globalmente (tardan ~1h) |
| `JOIN_SOUND_URL` | No | Ruta relativa a `cwd` o URL HTTP del audio al entrar a canal (ej. `assets/teto.mp3`) |
| `GIPHY_API_KEY` | No | API key de Giphy para `/gif` (sin ella, el comando devuelve error) |
| `EXCHANGE_RATE_API_KEY` | No | API key de [ExchangeRate-API](https://www.exchangerate-api.com) para `/convert` (sin ella, devuelve error) |
| `NODE_ENV` | No | Si es distinto de `production`, usa `pino-pretty` con colores; en producción emite JSON puro |

## Arquitectura

### Carga dinámica de comandos y eventos

`src/index.ts` recorre `src/commands/` y `src/events/` al iniciar y registra todo automáticamente usando `readdirSync` y `require` dinámico.

Para añadir un comando nuevo:
1. Crear archivo en `src/commands/nombre.ts`
2. Exportar por defecto un objeto que implemente la interfaz `Command`
3. Ejecutar `npm run deploy` para registrar los comandos en Discord

Para añadir un evento nuevo:
1. Crear archivo en `src/events/nombre.ts`
2. Exportar por defecto un objeto con propiedades `name`, `once` y `execute`

### Tipos y interfaces

**src/types.ts** define la interfaz `Command`:

```ts
export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}
```

La propiedad `autocomplete` es opcional y se invoca antes de `execute` cuando el usuario interactúa con el autocomplete de una opción.

### Sistema de audio (src/musicManager.ts)

Módulo singleton que gestiona el estado de reproducción por guild usando un `Map<guildId, GuildState>`.

**GuildState almacena:**
- `connection: VoiceConnection | null` — conexión activa al canal de voz
- `player: AudioPlayer` — reproductor de discord.js/voice
- `queue: Track[]` — cola de reproducción
- `volume: number` — volumen actual (0 a 1)
- `textChannel: Sendable | null` — canal de texto para notificaciones
- `currentTrack: Track | null` — canción en reproducción
- `ytdlpProc: ChildProcess | null` — proceso de yt-dlp activo

**Track representa una canción:**

```ts
export interface Track {
  title: string;
  url: string;
  type: 'youtube' | 'file';
  requestedBy: string;
  thumbnail?: string;
}
```

**Funciones exportadas:**

| Función | Descripción |
|---|---|
| `ensureConnection(guildId, voiceChannel, textChannel)` | Crea o reutiliza conexión de voz, reproduce JOIN_SOUND_URL si es nueva |
| `addTrack(guildId, input, requestedBy, voiceChannel, textChannel)` | Resuelve input (URL/búsqueda/archivo), encola track, retorna posición |
| `playNext(guildId, notify)` | Reproduce siguiente track, spawn de yt-dlp si es YouTube, notifica si notify=true |
| `getCurrentTrack(guildId)` | Retorna Track actual o null |
| `getQueue(guildId)` | Retorna copia de la cola |
| `togglePause(guildId)` | Pausa/reanuda, retorna 'paused' \| 'resumed' \| 'not_playing' |
| `stop(guildId)` | Detiene reproducción y vacía cola |
| `skip(guildId)` | Salta canción actual (la cola avanza automáticamente) |
| `cleanQueue(guildId)` | Vacía la cola sin detener actual |
| `prioritizeTrack(guildId, index)` | Mueve track en posición index al inicio |
| `skipTo(guildId, position)` | Salta a posición específica, retorna tracks saltados y destino |
| `shuffleQueue(guildId)` | Mezcla la cola con Fisher-Yates |
| `disconnect(guildId)` | Desconecta, limpia estado, destruye conexión |
| `getConnection(guildId)` | Retorna VoiceConnection activa o null |
| `setVolume(guildId, volume)` | Establece volumen (0-1) |
| `buildNowPlayingEmbed(track)` | Construye embed verde (0x1db954) con info de track |

**Flujo de reproducción:**

1. Usuario ejecuta `/play entrada` → handler llama `addTrack()`
2. `addTrack()` resuelve el input:
   - URL con `?v=` + `&list=` → extrae solo video (`v=`), ignora playlist
   - URL de playlist pura → usa `playdl.playlist_info()` y encola todos los videos
   - URL de video → obtiene metadatos con `playdl.video_info()`
   - Texto libre → búsqueda con `playdl.search()` (límite 1 resultado)
   - Nombre de archivo → busca en `assets/` (ruta relativa a `process.cwd()`)
3. Si es conexión nueva, `ensureConnection()` reproduce `JOIN_SOUND_URL` antes de la cola
4. Si player está idle, llama `playNext(guildId, false)` (reply ya notifica)
5. Al terminar cada canción, evento `AudioPlayerStatus.Idle` llama `playNext(guildId, true)` (notifica al canal)
6. `playNext()` mata proceso yt-dlp anterior, obtiene siguiente track
7. Para YouTube: spawn `yt-dlp` con argumentos de cliente Android, pasa stdout a `createAudioResource`
8. Para archivos locales: crea recurso de audio del archivo
9. `/skip` llama `player.stop()` sin vaciar cola; `Idle` dispara `playNext()` automáticamente

**Stack de audio:**

- **yt-dlp** (binario del sistema) — streaming de YouTube
- **play-dl** — búsqueda en YouTube, metadatos, thumbnails
- **@discordjs/voice** + **ffmpeg-static** — reproducción y transcodificación
- **opusscript** — fallback de codificador Opus

**Notas de seguridad:**

- En `addTrack()` línea 285, los nombres de archivo se construyen con `join(process.cwd(), 'assets', resolvedInput)`. No validar `resolvedInput` contra path traversal podría permitir acceso fuera de `assets/`. Los nombres de archivo en assets no deben contener rutas relativas (`../`, `../../`, etc.).

### Sistema de logging (src/logger.ts)

Singleton de `pino` con dos streams simultáneos:

- **Consola** — `pino-pretty` con colores si `NODE_ENV !== 'production'`; JSON puro en producción
- **Archivo** — `logs/<ISO-timestamp>.log` con JSON estructurado; un archivo nuevo por sesión

El logger se instancia una sola vez al cargar `src/logger.ts`. Cada interacción se loguea automáticamente en `src/events/interactionCreate.ts` con:

```ts
logger.info(
  { command: interaction.commandName, user: interaction.user.tag, userId: interaction.user.id, options },
  'Comando ejecutado',
);
```

Los stderr de `yt-dlp` se loguean como `warn` (no son errores fatales).

La carpeta `logs/` está en `.gitignore`.

### Conversión de monedas (src/currencies.ts)

Módulo con datos y lógica para el comando `/convert`.

**CURRENCIES array** contiene 8 monedas:
- 3 reales: USD, COP, MXN
- 5 meme: GNS (Gansito, 1 USD), BAL (Balatro, 10 USD), SLK (Silksong, 20 USD), SPX (Sub Proxy, 3.9 USD), AKC (AK-cartel, 19.4 USD)

```ts
export interface Currency {
  code: string;
  name: string;
  emoji: string;
  fictional: boolean;
  usdEquivalent?: number;
}
```

**fetchRates()** — obtiene tasas COP y MXN desde ExchangeRate-API v6:

```ts
export async function fetchRates(): Promise<ExchangeRates>
```

- Cache en memoria de 1h (CACHE_TTL = 60 * 60 * 1000)
- Si API falla y hay cache expirado, lo reutiliza con `logger.warn`
- Si API falla y no hay cache, lanza error

**toUSD(amount, code, rates)** — convierte cualquier moneda a USD:

```ts
export function toUSD(amount: number, code: string, rates: ExchangeRates): number
```

- Monedas meme: `amount * usdEquivalent`
- USD: sin cambio
- COP/MXN: `amount / rates[code]`

**fromUSD(amountUSD, code, rates)** — convierte USD a cualquier moneda:

```ts
export function fromUSD(amountUSD: number, code: string, rates: ExchangeRates): number
```

- Monedas meme: `amountUSD / usdEquivalent`
- USD: sin cambio
- COP/MXN: `amountUSD * rates[code]`

### Flujo de interacciones (src/events/interactionCreate.ts)

1. Usuario invoca slash command → Discord emite `interactionCreate`
2. Handler comprueba si es `isAutocomplete()`:
   - Si es autocomplete, invoca `command.autocomplete()` si existe y retorna
3. Luego comprueba si es `isChatInputCommand()`:
   - Si no, retorna sin hacer nada
4. Extrae comando de `client.commands`
5. Loguea comando, usuario, opciones
6. Try/catch alrededor de `command.execute()`
7. Si error:
   - Loguea error
   - Si interacción ya fue respondida/deferred, usa `followUp()`
   - Si no, usa `reply()`
   - Mensaje es efímero (MessageFlags.Ephemeral)
   - Catch adicional ignora excepciones si token expiró

### Intents activos

Solo `Guilds` y `GuildVoiceStates` (sin privileged intents).

```ts
intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
```

No se accede a permisos privilegiados como `MessageContent`, `GuildMembers`, etc.

### Sistema de colores en embeds

Colores consistentes en todas las respuestas:

| Color | Hex | Uso |
|---|---|---|
| Verde | 0x1db954 | Reproduciendo, acción positiva, moneda real en `/convert` |
| Blurple | 0x5865f2 | Informativo, cola, moneda meme en `/convert`, búsquedas |
| Verde claro | 0x57f287 | Éxito, operaciones completadas |
| Amarillo | 0xfee75c | Pausa, advertencia, estado ambiguo |
| Rojo | 0xed4245 | Detenido, error, estado crítico |

### Registro de comandos (src/deploy-commands.ts)

Script ejecutado con `npm run deploy`:

1. Lee todos los archivos de `src/commands/`
2. Extrae `command.data.toJSON()` de cada uno
3. Si `GUILD_ID` está definida: registra en esa guild (disponibles inmediato)
4. Si no: registra globalmente (tardan ~1h en propagarse)

Nota: Debe ejecutarse después de cambiar opciones de comandos. Los cambios en `execute()` no requieren redeploy.

## Estructura de un comando

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../types";

const miComando: Command = {
  data: new SlashCommandBuilder()
    .setName("nombre")
    .setDescription("Descripción del comando"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Respuesta");
  },
};

export default miComando;
```

Con opciones:

```ts
const miComando: Command = {
  data: new SlashCommandBuilder()
    .setName("nombre")
    .setDescription("Descripción")
    .addStringOption(opt =>
      opt.setName("texto").setDescription("Descripción de opción").setRequired(true)
    ) as SlashCommandBuilder,
  async execute(interaction: ChatInputCommandInteraction) {
    const valor = interaction.options.getString("texto", true);
    await interaction.reply(valor);
  },
};
```

Con autocomplete:

```ts
const miComando: Command = {
  data: new SlashCommandBuilder()
    .setName("nombre")
    .setDescription("Descripción")
    .addStringOption(opt =>
      opt.setName("opcion").setDescription("Desc").setRequired(true).setAutocomplete(true)
    ),
  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = ["opcion1", "opcion2"]
      .filter(c => c.includes(focused))
      .slice(0, 25)
      .map(c => ({ name: c, value: c }));
    await interaction.respond(choices);
  },
  async execute(interaction: ChatInputCommandInteraction) {
    const valor = interaction.options.getString("opcion", true);
    await interaction.reply(valor);
  },
};
```

## Estructura de un evento

```ts
import { Events } from "discord.js";

export default {
  name: Events.SomeEvent,
  once: false,
  async execute(...args: any[]) {
    console.log("Evento disparado");
  },
};
```

- `name` — Constante de evento de discord.js (ej. `Events.Ready`, `Events.MessageCreate`)
- `once: true` — Se ejecuta una sola vez
- `once: false` — Se ejecuta cada vez que se dispara

## Archivos de audio locales

Los archivos locales deben estar en `assets/` relativo a `process.cwd()` (la carpeta raíz del proyecto).

Ejemplo:
- Archivo: `assets/mi_cancion.mp3`
- Comando: `/play mi_cancion.mp3`

El sistema resuelve automáticamente la ruta relativa. Nota: Los nombres de archivo no deben contener `../` u otras rutas relativas que escapen del directorio `assets/`.

## MCP Servers

Servidores MCP opcionales para agentes:

| Servidor | Agente | Instalación |
|---|---|---|
| `context7` | `docs-lookup` | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |

## Testing

No hay directorio de tests en el proyecto. Las pruebas pueden realizarse manualmente invocando los comandos en Discord durante desarrollo.

## Notas adicionales

- `interaction.user.tag` es deprecado en discord.js v14+ pero se sigue usando en logging; considerar migrar a `interaction.user.username` en futuro
- El collector de `/queue` no tiene restricción de usuario: cualquiera puede navegar la cola (limitación conocida)
- Los errores de ejecución de comandos se capturan en try/catch y se devuelven como embeds efímeros rojo; si el token ya expiró, se ignoran
