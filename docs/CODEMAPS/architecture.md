<!-- Generated: 2026-05-16 | Files scanned: 23 | Token estimate: ~650 -->

# Arquitectura — TetoBot

## Tipo de proyecto

Bot de Discord de servidor único. Single-process Node.js app. Sin base de datos.

## Punto de entrada

```
src/index.ts
  → carga comandos de src/commands/ (readdirSync, dinámico)
  → carga eventos de src/events/ (readdirSync, dinámico)
  → client.login(DISCORD_TOKEN)
```

## Flujo de interacciones

```
Discord → interactionCreate event
  isAutocomplete()     → command.autocomplete()  [responde y retorna]
  isButton()           → verifica canal de voz (np_pause/skip/stop)
                       → togglePause() | skip() | stop()
                       → interaction.message.edit(nuevos botones)
  isChatInputCommand() → verifica cooldown por usuario
                       → logger.info(command, user, options)
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
      → nueva conexión: send embed "Conectado a 🔊 canal" + playJoinSound()
  → captura firstTrack (evita race condition en playlists)
  → addTrack() → player idle? → playNext(notify:false)

AudioPlayerStatus.Idle
  → guarda currentTrack en history (si loopMode !== 'track')
  → re-encola si loopMode === 'track' (unshift)
  → playNext(notify:true) → embed + botones en textChannel

playNext():
  → loopMode === 'queue'? → state.queue.push(track) [re-encola al final]
  → queue.length === 1 && loopMode === 'none'? → aviso "⚠️ Última canción"
  → spawn yt-dlp --extractor-args "youtube:player_client=tv_embedded"
  → createAudioResource(stream, StreamType.Arbitrary)
  → state.currentResource = resource  [para setVolume en tiempo real]
  → state.trackStartedAt = Date.now()  [para barra de progreso]
  → clearIdleTimer(state)
  → player.play(resource)
  → client.user.setActivity(track.title)  [actividad del bot]
  → send { embeds: [nowPlayingEmbed], components: [np_pause/skip/stop] }
  → state.nowPlayingMsg = msg
  → si MAX_CONSECUTIVE_ERRORS=5: limpia cola y detiene
  → si queue vacía: startIdleTimer(5 min) → disconnect() si vence
                    + edit(nowPlayingMsg, {components:[]})

stop():
  → queue=[], currentTrack=null
  → nowPlayingMsg.edit({components:[]}) + nowPlayingMsg=null
  → player.stop(true)

disconnect():
  → nowPlayingMsg.edit({components:[]}) + nowPlayingMsg=null
  → history=[], queue=[], currentTrack=null
  → connection.destroy() + states.delete(guildId)
```

## Estado por guild

`Map<guildId, GuildState>` en memoria. Sin persistencia.

```
GuildState {
  queue: Track[]                      // canciones pendientes
  currentTrack: Track | null          // canción en curso
  connection: VoiceConnection | null
  player: AudioPlayer
  volume: number                      // 0.0 – 1.0, default 0.75
  textChannel: Sendable | null
  ytdlpProc: ChildProcess | null      // proceso yt-dlp activo
  idleTimer: Timeout | null           // auto-disconnect tras 5 min
  loopMode: 'none'|'track'|'queue'    // modo de repetición
  history: Track[]                    // hasta 50, más reciente al final
  nowPlayingMsg: any | null           // mensaje para actualizar botones
  trackStartedAt: number | null       // Date.now() al iniciar track
  currentResource: AudioResource|null // para setVolume() en tiempo real
}

Track {
  title: string
  url: string
  type: 'youtube' | 'file'
  requestedBy: string
  thumbnail?: string
  duration?: number  // segundos, obtenido de play-dl
}
```

## Archivos clave

```
src/index.ts              Punto de entrada, carga dinámica
src/types.ts              Interfaz Command (data, execute, autocomplete?, cooldown?)
src/musicManager.ts       Singleton de audio por guild (~560 líneas)
src/currencies.ts         Lógica de conversión, cache de tasas 1h
src/logger.ts             Singleton pino, streams consola+archivo
src/deploy-commands.ts    Registra slash commands en Discord REST API
src/utils/
  voiceCheck.ts           Helper requireSameVoiceChannel()
src/events/
  interactionCreate.ts    Router: cooldowns, botones np_*, slash commands
  ready.ts                setClient(client) para musicManager + log inicio
src/commands/             22 comandos slash (ver commands.md)
assets/                   Archivos de audio locales
logs/                     JSON logs por sesión (excluidos de git)
dist/                     Build TypeScript compilado
```

## Intents activos

`Guilds` + `GuildVoiceStates` — sin privileged intents.

## Seguridad

- **Canal de voz**: `requireSameVoiceChannel()` en 11 comandos de control y en el handler de botones `np_*`
- **Path traversal**: validación `filePath.startsWith(assetsDir + sep)` en `addTrack()`
- **Menciones**: `allowedMentions: { parse: [] }` en mensajes con títulos de YouTube
- **Cooldowns**: `Map<commandName, Map<userId, expiry>>` con limpieza automática via `setTimeout`
- **Embed limits**: `.slice(0, 256)` en títulos, `.slice(0, 128)` en actividad del bot
