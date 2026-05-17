<!-- Generated: 2026-05-16 | Files scanned: 13 | Token estimate: ~550 -->

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
  spawn yt-dlp --extractor-args "youtube:player_client=tv_embedded"
  → createAudioResource(stream, StreamType.Arbitrary)
  → clearIdleTimer(state)
  → player.play(resource)
  → si MAX_CONSECUTIVE_ERRORS=5: limpia cola y detiene
  → si queue vacía: startIdleTimer(5 min) → disconnect() si vence
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
  idleTimer: Timeout | null  // auto-disconnect tras 5 min sin reproducir
}
```

## Archivos clave

```
src/index.ts             Punto de entrada, carga dinámica de comandos y eventos
src/types.ts             Interfaz Command (data, execute, autocomplete?)
src/musicManager.ts      Singleton de audio por guild (~450 líneas)
src/currencies.ts        Lógica de conversión, cache de tasas
src/logger.ts            Singleton pino, streams consola+archivo
src/deploy-commands.ts   Registra slash commands en Discord REST API
src/events/
  interactionCreate.ts   Router de interacciones + logging + error handler
  ready.ts               Log de inicio (once: true)
src/commands/            13 comandos slash (ver commands.md)
assets/                  Archivos de audio locales
logs/                    JSON logs por sesión (excluidos de git)
dist/                    Build TypeScript compilado
```

## Intents activos

`Guilds` + `GuildVoiceStates` — sin privileged intents.
