import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  StreamType,
} from '@discordjs/voice';
import { ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle, Client, EmbedBuilder } from 'discord.js';
import playdl from 'play-dl';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join, sep } from 'path';
import type { VoiceBasedChannel } from 'discord.js';
import logger from './logger';

type Sendable = { send(options: any): Promise<unknown> };

export interface Track {
  title: string;
  url: string;
  type: 'youtube' | 'file';
  requestedBy: string;
  thumbnail?: string;
  duration?: number;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

interface GuildState {
  connection: VoiceConnection | null;
  player: AudioPlayer;
  queue: Track[];
  volume: number;
  textChannel: Sendable | null;
  currentTrack: Track | null;
  ytdlpProc: ChildProcess | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
  loopMode: 'none' | 'track' | 'queue';
  history: Track[];
  nowPlayingMsg: any | null;
  trackStartedAt: number | null;
  currentResource: AudioResource | null;
}

const states = new Map<string, GuildState>();
let discordClient: Client | null = null;

export function setClient(client: Client) {
  discordClient = client;
}

function createState(guildId: string): GuildState {
  const player = createAudioPlayer();
  const state: GuildState = {
    connection: null,
    player,
    queue: [],
    volume: 0.75,
    textChannel: null,
    currentTrack: null,
    ytdlpProc: null,
    idleTimer: null,
    loopMode: 'none',
    history: [],
    nowPlayingMsg: null,
    trackStartedAt: null,
    currentResource: null,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    if (state.currentTrack && state.currentTrack.requestedBy !== 'bot' && state.loopMode !== 'track') {
      state.history.push(state.currentTrack);
      if (state.history.length > 50) state.history.shift();
    }
    if (state.loopMode === 'track' && state.currentTrack) {
      state.queue.unshift(state.currentTrack);
    }
    state.currentTrack = null;
    void playNext(guildId, true);
  });

  player.on('error', err => {
    logger.error({ err, guildId }, '[MusicManager] Error en player');
    if (state.currentTrack && state.currentTrack.requestedBy !== 'bot') {
      state.history.push(state.currentTrack);
      if (state.history.length > 50) state.history.shift();
    }
    state.currentTrack = null;
    void playNext(guildId, true);
  });

  return state;
}

function getState(guildId: string): GuildState {
  if (!states.has(guildId)) {
    states.set(guildId, createState(guildId));
  }
  return states.get(guildId)!;
}

export function buildNowPlayingComponents(paused = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('np_pause')
      .setLabel(paused ? '▶ Reanudar' : '⏸ Pausar')
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np_skip').setLabel('⏭ Saltar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np_stop').setLabel('⏹ Detener').setStyle(ButtonStyle.Danger),
  );
}

export function buildNowPlayingEmbed(track: Track): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setAuthor({ name: '▶  Reproduciendo ahora' })
    .setTitle(track.title.slice(0, 256))
    .setFooter({ text: `Pedido por ${track.requestedBy}` });

  if (track.url.startsWith('http')) {
    embed.setURL(track.url);
    embed.setDescription(`[Ver en YouTube](${track.url})`);
  }

  if (track.thumbnail) embed.setThumbnail(track.thumbnail);

  return embed;
}

function startIdleTimer(guildId: string, state: GuildState): void {
  clearIdleTimer(state);
  state.idleTimer = setTimeout(() => {
    state.textChannel?.send('Sin actividad por 5 minutos. Saliendo del canal de voz.').catch(() => {});
    disconnect(guildId);
  }, IDLE_TIMEOUT_MS);
}

function clearIdleTimer(state: GuildState): void {
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }
}

function killYtdlp(state: GuildState): void {
  if (state.ytdlpProc) {
    state.ytdlpProc.stdout?.destroy();
    state.ytdlpProc.kill('SIGKILL');
    state.ytdlpProc = null;
  }
}

const MAX_CONSECUTIVE_ERRORS = 5;

async function playNext(guildId: string, notify: boolean): Promise<void> {
  const state = getState(guildId);
  let consecutiveErrors = 0;

  while (true) {
    killYtdlp(state);

    if (state.queue.length === 0) {
      discordClient?.user?.setActivity(undefined);
      await state.nowPlayingMsg?.edit({ components: [] }).catch(() => {});
      state.nowPlayingMsg = null;
      if (notify) {
        state.textChannel?.send('La cola de reproducción está vacía.').catch(() => {});
      }
      startIdleTimer(guildId, state);
      return;
    }

    const track = state.queue.shift()!;
    if (state.loopMode === 'queue') {
      state.queue.push(track);
    }
    state.currentTrack = track;
    state.trackStartedAt = null;

    if (state.queue.length === 1 && state.loopMode === 'none') {
      state.textChannel?.send({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('⚠️ Última canción en cola.')],
      }).catch(() => {});
    }

    try {
      let resource;

      if (track.type === 'youtube') {
        const proc = spawn('yt-dlp', [
          '-f', 'bestaudio/best',
          '--no-playlist',
          '-o', '-',
          '--quiet',
          '--no-warnings',
          '--extractor-args', 'youtube:player_client=tv_embedded',
          track.url,
        ]);
        proc.stderr.on('data', d => logger.warn('[yt-dlp] %s', d.toString().trim()));
        state.ytdlpProc = proc;
        resource = createAudioResource(proc.stdout, {
          inputType: StreamType.Arbitrary,
          inlineVolume: true,
        });
      } else {
        resource = createAudioResource(track.url, { inlineVolume: true });
      }

      resource.volume?.setVolume(state.volume);
      clearIdleTimer(state);
      state.player.play(resource);
      state.currentResource = resource;
      state.trackStartedAt = Date.now();
      discordClient?.user?.setActivity(track.title.slice(0, 128), { type: ActivityType.Listening });

      if (notify) {
        await state.nowPlayingMsg?.edit({ components: [] }).catch(() => {});
        const msg = await state.textChannel
          ?.send({ embeds: [buildNowPlayingEmbed(track)], components: [buildNowPlayingComponents()] })
          .catch(() => undefined);
        state.nowPlayingMsg = msg ?? null;
      }

      return;
    } catch (err) {
      logger.error({ err, title: track.title }, '[MusicManager] Error reproduciendo track');
      state.currentTrack = null;
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        state.textChannel
          ?.send({ content: 'Demasiados errores consecutivos. Deteniendo reproducción.', allowedMentions: { parse: [] } })
          .catch(() => {});
        state.queue = [];
        return;
      }
      state.textChannel
        ?.send({ content: `Error al reproducir **${track.title.slice(0, 200)}**. Saltando...`, allowedMentions: { parse: [] } })
        .catch(() => {});
      notify = true;
    }
  }
}

function playJoinSound(guildId: string): void {
  const url = process.env.JOIN_SOUND_URL;
  if (!url) return;

  const state = getState(guildId);
  const filePath = url.startsWith('http') ? url : join(process.cwd(), url);

  let resource;
  if (url.startsWith('http')) {
    const proc = spawn('yt-dlp', [
      '-f', 'bestaudio/best',
      '--no-playlist',
      '-o', '-',
      '--quiet',
      '--no-warnings',
      url,
    ]);
    proc.stderr.on('data', d => logger.warn('[yt-dlp join] %s', d.toString().trim()));
    resource = createAudioResource(proc.stdout, { inputType: StreamType.Arbitrary, inlineVolume: true });
  } else {
    resource = createAudioResource(filePath, { inlineVolume: true });
  }

  resource.volume?.setVolume(state.volume);
  state.currentTrack = { title: 'join', url, type: 'file', requestedBy: 'bot' };
  state.player.play(resource);
}

export async function ensureConnection(
  guildId: string,
  voiceChannel: VoiceBasedChannel,
  textChannel: Sendable,
): Promise<VoiceConnection> {
  const state = getState(guildId);
  state.textChannel = textChannel;

  const isNew =
    !state.connection ||
    state.connection.state.status === VoiceConnectionStatus.Destroyed;

  if (isNew) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        disconnect(guildId);
      }
    });

    connection.subscribe(state.player);
    state.connection = connection;
  }

  const conn = state.connection!;
  await entersState(conn, VoiceConnectionStatus.Ready, 10_000);

  if (isNew) {
    textChannel.send({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`Conectado a 🔊 **${voiceChannel.name}**`)],
    }).catch(() => {});
    playJoinSound(guildId);
  }

  return conn;
}

export async function addTrack(
  guildId: string,
  input: string,
  requestedBy: string,
  voiceChannel: VoiceBasedChannel,
  textChannel: Sendable,
): Promise<{ track: Track; position: number; playlistSize?: number }> {
  await ensureConnection(guildId, voiceChannel, textChannel);

  const state = getState(guildId);

  let resolvedInput = input;
  try {
    const parsed = new URL(input);
    const videoId = parsed.searchParams.get('v');
    if (videoId) resolvedInput = `https://www.youtube.com/watch?v=${videoId}`;
  } catch { /* no es una URL válida, se trata como búsqueda */ }

  const ytValidation = playdl.yt_validate(resolvedInput);

  if (ytValidation === 'playlist') {
    const playlist = await playdl.playlist_info(input, { incomplete: true });
    const videos = await playlist.all_videos();
    if (videos.length === 0) throw new Error('La lista de reproducción está vacía o es privada.');

    const wasIdle =
      !state.currentTrack &&
      state.player.state.status === AudioPlayerStatus.Idle;

    for (const video of videos) {
      const thumbs = video.thumbnails;
      state.queue.push({
        title: video.title ?? video.url,
        url: video.url,
        type: 'youtube',
        requestedBy,
        thumbnail: thumbs?.at(-1)?.url,
        duration: video.durationInSec,
      });
    }

    const firstTrack = state.queue[state.queue.length - videos.length];
    if (wasIdle) void playNext(guildId, false);

    return { track: firstTrack, position: wasIdle ? 0 : state.queue.length - videos.length + 1, playlistSize: videos.length };
  }

  let track: Track;

  if (ytValidation === 'video') {
    const info = await playdl.video_info(resolvedInput);
    const thumbs = info.video_details.thumbnails;
    track = {
      title: info.video_details.title ?? resolvedInput,
      url: resolvedInput,
      type: 'youtube',
      requestedBy,
      thumbnail: thumbs?.at(-1)?.url,
      duration: info.video_details.durationInSec,
    };
  } else {
    const assetsDir = join(process.cwd(), 'assets');
    const filePath = join(assetsDir, resolvedInput);
    if (!filePath.startsWith(assetsDir + sep)) throw new Error('Ruta de archivo inválida.');
    if (existsSync(filePath)) {
      track = { title: resolvedInput, url: filePath, type: 'file', requestedBy };
    } else {
      const results = await playdl.search(resolvedInput, { limit: 1 });
      if (results.length === 0)
        throw new Error('No se encontraron resultados para la búsqueda.');
      const thumbs = results[0].thumbnails;
      track = {
        title: results[0].title ?? input,
        url: results[0].url,
        type: 'youtube',
        requestedBy,
        thumbnail: thumbs?.at(-1)?.url,
        duration: results[0].durationInSec,
      };
    }
  }

  const wasIdle =
    !state.currentTrack &&
    state.player.state.status === AudioPlayerStatus.Idle;

  state.queue.push(track);

  if (wasIdle) {
    void playNext(guildId, false);
    return { track, position: 0 };
  }

  return { track, position: state.queue.length };
}

export function getCurrentTrack(guildId: string): Track | null {
  return getState(guildId).currentTrack;
}

export function getQueue(guildId: string): Track[] {
  return [...getState(guildId).queue];
}

export async function togglePause(
  guildId: string,
): Promise<'paused' | 'resumed' | 'not_playing'> {
  const state = getState(guildId);
  let result: 'paused' | 'resumed' | 'not_playing';

  if (state.player.state.status === AudioPlayerStatus.Playing) {
    state.player.pause();
    result = 'paused';
  } else if (state.player.state.status === AudioPlayerStatus.Paused) {
    state.player.unpause();
    result = 'resumed';
  } else {
    return 'not_playing';
  }

  return result;
}

export async function updateNowPlayingButtons(guildId: string): Promise<void> {
  const state = getState(guildId);
  const paused = state.player.state.status === AudioPlayerStatus.Paused;
  await state.nowPlayingMsg?.edit({ components: [buildNowPlayingComponents(paused)] }).catch(() => {});
}

export function stop(guildId: string) {
  const state = getState(guildId);
  state.queue = [];
  state.currentTrack = null;
  killYtdlp(state);
  clearIdleTimer(state);
  state.nowPlayingMsg?.edit({ components: [] }).catch(() => {});
  state.nowPlayingMsg = null;
  state.player.stop(true);
}

export function skip(guildId: string): boolean {
  const state = getState(guildId);
  if (!state.currentTrack) return false;
  state.player.stop();
  return true;
}

export function cleanQueue(guildId: string) {
  getState(guildId).queue = [];
}

export function prioritizeTrack(guildId: string, index: number): Track | null {
  const queue = getState(guildId).queue;
  if (index < 0 || index >= queue.length) return null;
  const [track] = queue.splice(index, 1);
  queue.unshift(track);
  return track;
}

export function skipTo(guildId: string, position: number): { skipped: Track[]; target: Track } | null {
  const state = getState(guildId);
  if (!state.currentTrack) return null;
  if (position < 1 || position > state.queue.length) return null;
  const skipped = state.queue.splice(0, position - 1);
  state.player.stop();
  return { skipped, target: state.queue[0] };
}

export function shuffleQueue(guildId: string) {
  const queue = getState(guildId).queue;
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
}

export function disconnect(guildId: string) {
  const state = states.get(guildId);
  if (!state) return;

  state.queue = [];
  state.currentTrack = null;
  state.history = [];
  state.nowPlayingMsg?.edit({ components: [] }).catch(() => {});
  state.nowPlayingMsg = null;
  killYtdlp(state);
  clearIdleTimer(state);
  state.player.stop(true);

  if (
    state.connection &&
    state.connection.state.status !== VoiceConnectionStatus.Destroyed
  ) {
    state.connection.destroy();
  }

  states.delete(guildId);
}

export function getConnection(guildId: string): VoiceConnection | null {
  return states.get(guildId)?.connection ?? null;
}

export function setVolume(guildId: string, volume: number) {
  const state = getState(guildId);
  state.volume = volume;
  state.currentResource?.volume?.setVolume(volume);
}

export function getVolume(guildId: string): number {
  return getState(guildId).volume;
}

export function getTrackStartedAt(guildId: string): number | null {
  return getState(guildId).trackStartedAt;
}

export function isPaused(guildId: string): boolean {
  return getState(guildId).player.state.status === AudioPlayerStatus.Paused;
}

export function setLoopMode(guildId: string, mode: 'none' | 'track' | 'queue') {
  getState(guildId).loopMode = mode;
}

export function getLoopMode(guildId: string): 'none' | 'track' | 'queue' {
  return getState(guildId).loopMode;
}

export function getHistory(guildId: string): Track[] {
  return [...getState(guildId).history].reverse();
}

export function removeTrack(guildId: string, index: number): Track | null {
  const queue = getState(guildId).queue;
  if (index < 0 || index >= queue.length) return null;
  const [track] = queue.splice(index, 1);
  return track;
}

export function moveTrack(guildId: string, from: number, to: number): boolean {
  const queue = getState(guildId).queue;
  if (from < 0 || from >= queue.length || to < 0 || to >= queue.length) return false;
  const [track] = queue.splice(from, 1);
  queue.splice(to, 0, track);
  return true;
}
