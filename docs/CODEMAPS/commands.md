<!-- Generated: 2026-03-19 (actualizado) | Files scanned: 13 | Token estimate: ~500 -->

# Comandos — TetoBot

## Referencia rápida

```
/play      → addTrack() → ensureConnection() → playNext()
/queue     → getCurrentTrack() + getQueue() → embed paginado + botones
/skip      → skip() | skipTo(position)
/priority  → prioritizeTrack(guildId, index)
/pause     → togglePause() → 'paused' | 'resumed' | 'not_playing'
/stop      → stop() → vacía cola + detiene player
/clean     → cleanQueue() → vacía cola sin detener current
/shuffle   → shuffleQueue() → Fisher-Yates in-place
/leave     → disconnect() → destruye conexión + limpia GuildState
/gif       → Giphy API search → embed con imagen aleatoria
/convert   → fetchRates() → toUSD() → fromUSD() → embed multi-moneda
/help      → client.commands.map() → embed listado
/ping      → mide latency entre interaction y message createdTimestamp
```

## Tabla de comandos

| Archivo | Nombre | Opciones | Dependencias |
|---|---|---|---|
| `clean.ts` | `/clean` | — | `cleanQueue`, `getQueue` |
| `convert.ts` | `/convert` | `monto` (number, req), `moneda` (string, req, autocomplete) | `currencies.ts`, `EXCHANGE_RATE_API_KEY` |
| `gif.ts` | `/gif` | `busqueda` (string, req) | Giphy REST API, `GIPHY_API_KEY` |
| `help.ts` | `/help` | — | `client.commands` (ExtendedClient) |
| `leave.ts` | `/leave` | — | `disconnect`, `getConnection` |
| `pause.ts` | `/pause` | — | `togglePause` |
| `ping.ts` | `/ping` | — | Discord.js `withResponse` |
| `play.ts` | `/play` | `entrada` (string, req), `volumen` (int 0-100, opt) | `addTrack`, `setVolume`, `buildNowPlayingEmbed` — valida `interaction.channel` antes de uso |
| `priority.ts` | `/priority` | `posicion` (int, req, min:1) | `prioritizeTrack`, `getQueue` |
| `queue.ts` | `/queue` | — | `getCurrentTrack`, `getQueue`, `skipTo` + componentes interactivos |
| `shuffle.ts` | `/shuffle` | — | `shuffleQueue`, `getQueue` |
| `skip.ts` | `/skip` | `posicion` (int, opt, min:1) | `skip`, `skipTo`, `getCurrentTrack`, `getQueue` |
| `stop.ts` | `/stop` | — | `stop`, `getCurrentTrack`, `getQueue` |

## Componentes interactivos (`/queue`)

`/queue` usa `createMessageComponentCollector` con TTL de 120 s y filtro restringido al autor:

```
queue_prev         → page--
queue_next         → page++
queue_skip_<pos>   → skipTo(guildId, pos) → actualiza embed
```

Solo el usuario que ejecutó `/queue` puede usar los botones. Botones desaparecen al expirar el collector (se edita el mensaje sin components).

## Autocomplete (`/convert`)

`convert.autocomplete()` filtra `CURRENCIES` por `code` o `name` con `includes()` (case-insensitive), devuelve hasta 25 resultados con formato `emoji code — name`.

`/gif` y `/convert` tienen timeout de 5s en sus fetches a APIs externas (AbortController).

## Sistema de colores (embeds)

| Color | Hex | Uso |
|---|---|---|
| Verde | `0x1db954` | Reproduciendo / acción positiva / moneda real |
| Blurple | `0x5865f2` | Informativo / cola / moneda meme |
| Verde claro | `0x57f287` | Éxito |
| Amarillo | `0xfee75c` | Pausa / advertencia / cola vacía |
| Rojo | `0xed4245` | Error / detenido / desconectado |
