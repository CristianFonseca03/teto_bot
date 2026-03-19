<!-- Generated: 2026-03-19 (actualizado) | Files scanned: 19 | Token estimate: ~400 -->

# Dependencias — TetoBot

## Servicios externos

| Servicio | Variable | Uso | Fallo sin clave |
|---|---|---|---|
| Discord API | `DISCORD_TOKEN`, `CLIENT_ID` | Conexión del bot, slash commands | Bot no arranca |
| ExchangeRate-API v6 | `EXCHANGE_RATE_API_KEY` | Tasas COP/MXN en `/convert` | `/convert` devuelve error |
| Giphy API | `GIPHY_API_KEY` | Búsqueda de GIFs en `/gif` | `/gif` devuelve error |
| YouTube (vía yt-dlp) | — (binario del sistema) | Streaming de audio | `/play` falla en URLs de YouTube |

## Dependencias de producción

| Paquete | Versión | Rol |
|---|---|---|
| `discord.js` | ^14.16.3 | Cliente Discord, builders, embeds, componentes |
| `@discordjs/voice` | ^0.19.1 | Conexión de voz, AudioPlayer, AudioResource |
| `@discordjs/opus` | ^0.10.0 | Codificador Opus nativo |
| `play-dl` | ^1.9.7 | Búsqueda YouTube, metadatos, thumbnails |
| `ffmpeg-static` | ^5.3.0 | Binario ffmpeg empaquetado para transcodificación |
| `opusscript` | ^0.0.8 | Codificador Opus en JS (fallback) |
| `pino` | ^10.3.1 | Logging estructurado JSON |
| `dotenv` | ^16.4.5 | Carga de variables de entorno desde `.env` |

## Dependencias de desarrollo

| Paquete | Versión | Rol |
|---|---|---|
| `typescript` | ^5.7.2 | Compilador TypeScript |
| `tsx` | ^4.19.2 | Ejecución directa de TS + hot reload (`npm run dev`) |
| `pino-pretty` | ^13.1.3 | Formato legible de logs en consola (desarrollo) |
| `@types/node` | ^22.10.0 | Tipos de Node.js para TypeScript |

## Binario del sistema

- **`yt-dlp`** — debe estar instalado y accesible en `$PATH`. No está incluido en `node_modules`. TetoBot hace spawn de este proceso para obtener streams de YouTube.
