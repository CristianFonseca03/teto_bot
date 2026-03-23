<!-- Generated: 2026-03-19 (actualizado) | Files scanned: 19 | Token estimate: ~700 -->

# Arquitectura — TetoBot

## Tipo de proyecto

Bot de Discord de servidor único. Single-process Node.js app. Sin base de datos.

## Punto de entrada

```
src/index.ts
  → carga comandos de src/commands/ (readdirSync, dinámico)
  → carga eventos de src/events/ (readdirSync, dinámico)
  → client.login(DISCORD_TOKEN)
  → startServer(client)  [Fastify HTTP server para soundboard]
```

## Flujo de interacciones

```
Discord → interactionCreate event
  isAutocomplete() → command.autocomplete()  [responde y retorna]
  isChatInputCommand() → logger.info(command, user.username, options)
                       → command.execute(interaction)
                       → try/catch → embed rojo efímero si error
```

## Sistema de audio (musicManager.ts)

```
/play input
  → resolveInput():
      URL con ?v= + &list=  → extrae solo video
      URL playlist pura     → playdl.playlist_info() → encola todos
      URL video             → playdl.video_info()
      texto libre           → playdl.search()
      nombre de archivo     → busca en assets/
  → ensureConnection(voiceChannel)
      → nueva conexión: playJoinSound() → JOIN_SOUND_URL
  → captura firstTrack (evita race condition en playlists)
  → addTrack() → player idle? → playNext(notify:false)

AudioPlayerStatus.Idle → playNext(notify:true) → embed en textChannel

playNext():
  spawn yt-dlp --extractor-args "youtube:player_client=android"
  → createAudioResource(stream, StreamType.Arbitrary)
  → player.play(resource)
  → si MAX_CONSECUTIVE_ERRORS=5: limpia cola y detiene
```

## Estado por guild

`Map<guildId, GuildState>` en memoria. Sin persistencia.

```
GuildState {
  queue: Track[]          // canciones pendientes
  currentTrack: Track     // canción en curso
  connection: VoiceConnection
  player: AudioPlayer
  volume: number          // 0.0 – 1.0, por defecto 0.75
  textChannel: TextChannel
}
```

## Archivos clave

```
src/index.ts             Punto de entrada, carga dinámica + startServer()
src/types.ts             Interfaz Command (data, execute, autocomplete?)
src/musicManager.ts      Singleton de audio por guild (~400 líneas)
src/currencies.ts        Lógica de conversión, cache de tasas
src/logger.ts            Singleton pino, streams consola+archivo
src/deploy-commands.ts   Registra slash commands en Discord REST API
src/server/
  index.ts               Fastify app con CORS, rate limit, static files
  auth.ts                JWT generateToken() / verifyToken() (HS256, TTL 15m)
  routes/
    soundboard.ts        GET /health, GET /sounds, POST /play (autenticado)
src/sounds.json          Catálogo: [{id, name, url, emoji}]
src/events/
  interactionCreate.ts   Router de interacciones + logging + error handler
  ready.ts               Log de inicio (once: true)
src/commands/
  soundboard.ts          /soundboard → genera JWT, URL con token en hash
  (otros 12+ comandos)
web/                     Next.js 15 frontend (App Router, static export)
  app/
    page.tsx             Parsea token, valida JWT, renderiza grid
    layout.tsx           Shell HTML/CSS
  components/
    SoundGrid.tsx        Grid responsive con onclick → POST /play
  styles/
    globals.css          Tema responsivo, emojis, colores
  next.config.ts         output:'export', basePath:'/soundboard'
  types.ts               type Sound = {id, name, emoji}
assets/                  Archivos de audio locales
logs/                    JSON logs por sesión (excluidos de git)
dist/                    Build TypeScript compilado
dist/web/                Build Next.js estático (servido por Fastify)
.github/workflows/
  deploy-soundboard.yml  GitHub Actions → GitHub Pages en push a main
```

## Servidor HTTP (Soundboard)

```
Fastify escuchando en SOUNDBOARD_PORT (default 3000)

Middleware:
  CORS: orígenes [BASE_URL, SOUNDBOARD_URL]
  Rate limit: 10 req/min por userId (extrae del JWT) o IP
  Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

Rutas:
  GET  /api/soundboard/health      → {status: 'ok'}
  GET  /api/soundboard/sounds      → [{id, name, emoji}]  (sin URLs)
  POST /api/soundboard/play        → requiere Authorization: Bearer JWT
    verifyToken() → valida guildId + userId
    → resuelve sonido de sounds.json
    → obtiene miembro + voiceChannel
    → llama ensureConnection + addTrack de musicManager
    → responde {success: true, title: ...}

Static files:
  /soundboard/*  → Next.js build (dist/web/)
  404 → index.html (SPA)
```

## Flujo del Soundboard

```
1. Usuario ejecuta /soundboard en Discord
   → verifica member.voice.channel (debe estar en voz)
   → generateToken(userId, guildId)
   → construye URL: ${SOUNDBOARD_URL}/soundboard/#token=...&api=...
   → responde embed ephemeral azul con enlace

2. Usuario abre enlace en navegador
   → Next.js frontend carga
   → parsea #token=... del hash (elimina del historial)
   → parseJwtExp(token) → detecta si expiró (15 min)
   → sanitizeApiUrl(raw) → valida https o localhost
   → fetch /api/soundboard/health (verifica bot online)
   → fetch /api/soundboard/sounds (obtiene catálogo)
   → renderiza grid con SoundGrid(sounds, token, apiUrl)

3. Usuario hace clic en un sonido
   → onClick → POST /api/soundboard/play
      body: {soundId}
      headers: {Authorization: 'Bearer ' + token}
   → backend verifyToken() → JWT válido?
   → busca sonido en sounds.json
   → guild.members.fetch(userId) → obtiene voiceChannel
   → ensureConnection(guildId, voiceChannel, noop)
   → addTrack(guildId, sound.url, username, voiceChannel, noop)
   → responde {success, title}
   → frontend muestra confirmación

4. Reproductor de música toma el control
   → musicManager resuelve YouTube URL
   → spawn yt-dlp, crea AudioResource
   → player.play() → audio en voz
```

## Intents activos

`Guilds` + `GuildVoiceStates` — sin privileged intents.
