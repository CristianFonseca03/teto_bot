<!-- Generated: 2026-05-16 | Files scanned: 23 | Token estimate: ~600 -->

# Comandos — TetoBot

## Referencia rápida

```
/play        → addTrack() → ensureConnection() → playNext()
/pause       → togglePause() [async] → updateNowPlayingButtons()
/skip        → skip() | skipTo(position)
/stop        → stop() → vacía cola + limpia nowPlayingMsg + detiene player
/leave       → disconnect() → destruye conexión + limpia GuildState
/nowplaying  → getCurrentTrack() + getTrackStartedAt() → embed con barra progreso
/queue       → getCurrentTrack() + getQueue() → embed paginado + botones
/remove      → removeTrack(guildId, index)
/move        → moveTrack(guildId, from, to)
/priority    → prioritizeTrack(guildId, index)
/shuffle     → shuffleQueue() → Fisher-Yates in-place
/clean       → awaitMessageComponent (confirmación) → cleanQueue()
/loop        → setLoopMode('none'|'track'|'queue')
/history     → getHistory() → embed paginado (más reciente primero)
/volume      → getVolume() | setVolume() [aplica en tiempo real]
/gif         → Giphy API search → embed con imagen aleatoria
/convert     → fetchRates() → toUSD() → fromUSD() → embed multi-moneda
/8ball       → respuesta aleatoria de array de 15 frases
/choose      → split(',') → elección aleatoria
/coin        → Math.random() < 0.5 → cara/cruz
/help        → client.commands → embed por categorías (4 categorías)
/ping        → mide latency entre interaction y message createdTimestamp
```

## Tabla de comandos

| Archivo | Nombre | Opciones | Dependencias |
|---|---|---|---|
| `8ball.ts` | `/8ball` | `pregunta` (string, req, max 1024) | — |
| `choose.ts` | `/choose` | `opciones` (string, req) | — |
| `clean.ts` | `/clean` | — | `cleanQueue`, `getQueue`, `requireSameVoiceChannel` |
| `coin.ts` | `/coin` | — | — |
| `convert.ts` | `/convert` | `monto` (number, req), `moneda` (string, req, autocomplete) | `currencies.ts`, `EXCHANGE_RATE_API_KEY` |
| `gif.ts` | `/gif` | `busqueda` (string, req) | Giphy REST API, `GIPHY_API_KEY` |
| `help.ts` | `/help` | — | `client.commands` (ExtendedClient), categorías estáticas |
| `history.ts` | `/history` | — | `getHistory` |
| `leave.ts` | `/leave` | — | `disconnect`, `getConnection`, `requireSameVoiceChannel` |
| `loop.ts` | `/loop` | `modo` (string, req: none/track/queue) | `setLoopMode`, `getCurrentTrack`, `requireSameVoiceChannel` |
| `move.ts` | `/move` | `origen` (int, req, min:1), `destino` (int, req, min:1) | `moveTrack`, `getQueue`, `requireSameVoiceChannel` |
| `nowplaying.ts` | `/nowplaying` | — | `getCurrentTrack`, `getTrackStartedAt`, `buildNowPlayingEmbed`, `buildNowPlayingComponents`, `isPaused` |
| `pause.ts` | `/pause` | — | `togglePause`, `updateNowPlayingButtons`, `requireSameVoiceChannel` |
| `ping.ts` | `/ping` | — | Discord.js `withResponse` |
| `play.ts` | `/play` | `entrada` (string, req), `volumen` (int 0-100, opt) | `addTrack`, `setVolume`, `buildNowPlayingEmbed`, `buildNowPlayingComponents`, `getQueue` |
| `priority.ts` | `/priority` | `posicion` (int, req, min:1) | `prioritizeTrack`, `getQueue`, `requireSameVoiceChannel` |
| `queue.ts` | `/queue` | — | `getCurrentTrack`, `getQueue`, `skipTo` + componentes interactivos |
| `remove.ts` | `/remove` | `posicion` (int, req, min:1) | `removeTrack`, `getQueue`, `requireSameVoiceChannel` |
| `shuffle.ts` | `/shuffle` | — | `shuffleQueue`, `getQueue`, `requireSameVoiceChannel` |
| `skip.ts` | `/skip` | `posicion` (int, opt, min:1) | `skip`, `skipTo`, `getCurrentTrack`, `getQueue`, `getLoopMode`, `requireSameVoiceChannel` |
| `stop.ts` | `/stop` | — | `stop`, `getCurrentTrack`, `getQueue`, `requireSameVoiceChannel` |
| `volume.ts` | `/volume` | `nivel` (int 0-100, opt) | `getVolume`, `setVolume`, `getCurrentTrack`, `requireSameVoiceChannel` |

## Guard de canal de voz

`src/utils/voiceCheck.ts` exporta `requireSameVoiceChannel(interaction)`:

```ts
// Retorna false y responde con error efímero si el usuario no está en el canal del bot
if (!await requireSameVoiceChannel(interaction)) return;
```

Aplicado a: `/pause`, `/skip`, `/stop`, `/leave`, `/loop`, `/shuffle`, `/clean`, `/priority`, `/move`, `/remove`, `/volume`.

Los botones `np_pause`, `np_skip`, `np_stop` en `interactionCreate.ts` tienen la misma verificación inline.

## Componentes interactivos

### `/queue`

`createMessageComponentCollector` con TTL de 120s, filtro por autor:

```
queue_prev         → page--
queue_next         → page++
queue_skip_<pos>   → skipTo(guildId, pos) → actualiza embed
```

### Botones "now playing" (`np_*`)

Manejados globalmente en `interactionCreate.ts`. Verifican canal de voz antes de ejecutar:

```
np_pause  → togglePause() → interaction.message.edit(buildNowPlayingComponents(paused))
np_skip   → skip(guildId)
np_stop   → stop(guildId)
```

### `/clean` (confirmación)

`reply(ephemeral)` + `fetchReply().awaitMessageComponent(15s)` + `awaitMessageComponent`:

```
clean_confirm → cleanQueue()
clean_cancel  → mensaje "Cancelado"
timeout       → editReply("Tiempo agotado")
```

### `/history`

`createMessageComponentCollector` con TTL de 120s, snapshot estático al invocar:

```
history_prev → page--
history_next → page++
```

## Sistema de cooldowns

Definido en `interactionCreate.ts` como `Map<commandName, Map<userId, expiry>>`.

| Comando | Cooldown |
|---|---|
| `/gif`, `/convert` | 5s |
| `/play`, `/shuffle` | 3s |
| `/skip`, `/priority`, `/remove`, `/move` | 2s |

Las entradas expiradas se eliminan automáticamente con `setTimeout`.

## Autocomplete (`/convert`)

`convert.autocomplete()` filtra `CURRENCIES` por `code` o `name` con `includes()` (case-insensitive), devuelve hasta 25 resultados con formato `emoji code — name`.

`/gif` y `/convert` tienen timeout de 5s en sus fetches a APIs externas (AbortController).

## Sistema de colores (embeds)

| Color | Hex | Uso |
|---|---|---|
| Verde | `0x1db954` | Reproduciendo / acción positiva / moneda real |
| Blurple | `0x5865f2` | Informativo / cola / moneda meme / conectado |
| Verde claro | `0x57f287` | Éxito |
| Amarillo | `0xfee75c` | Pausa / advertencia / última canción / cooldown |
| Rojo | `0xed4245` | Error / detenido / desconectado / sin permisos |
