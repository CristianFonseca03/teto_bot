import {
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  StreamType,
} from '@discordjs/voice';
import { EmbedBuilder } from 'discord.js';
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
}

interface GuildState {
  connection: VoiceConnection | null;
  player: AudioPlayer;
  queue: Track[];
  volume: number;
  textChannel: Sendable | null;
  currentTrack: Track | null;
  ytdlpProc: ChildProcess | null;
}

const states = new Map<string, GuildState>();

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
  };

  player.on(AudioPlayerStatus.Idle, () => {
    state.currentTrack = null;
    void playNext(guildId, true);
  });

  player.on('error', err => {
    logger.error({ err, guildId }, '[MusicManager] Error en player');
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

export function buildNowPlayingEmbed(track: Track): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setAuthor({ name: '▶  Reproduciendo ahora' })
    .setTitle(track.title)
    .setFooter({ text: `Pedido por ${track.requestedBy}` });

  if (track.url.startsWith('http')) {
    embed.setURL(track.url);
    embed.setDescription(`[Ver en YouTube](${track.url})`);
  }

  if (track.thumbnail) embed.setThumbnail(track.thumbnail);

  return embed;
}

function killYtdlp(state: GuildState): void {
  if (state.ytdlpProc) {
    state.ytdlpProc.stdout?.destroy();
    state.ytdlpProc.kill('SIGKILL');
    state.ytdlpProc = null;
  }
}

async function playNext(guildId: string, notify: boolean): Promise<void> {
  const state = getState(guildId);

  while (true) {
    killYtdlp(state);

    if (state.queue.length === 0) {
      if (notify) {
        state.textChannel?.send('La cola de reproducción está vacía.').catch(() => {});
      }
      return;
    }

    const track = state.queue.shift()!;
    state.currentTrack = track;

    try {
      let resource;

      if (track.type === 'youtube') {
        const proc = spawn('yt-dlp', [
          '-f', 'bestaudio/best',
          '--no-playlist',
          '-o', '-',
          '--quiet',
          '--no-warnings',
          '--extractor-args', 'youtube:player_client=android',
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
      state.player.play(resource);

      if (notify) {
        state.textChannel
          ?.send({ embeds: [buildNowPlayingEmbed(track)] })
          .catch(() => {});
      }

      return;
    } catch (err) {
      logger.error({ err, title: track.title }, '[MusicManager] Error reproduciendo track');
      state.currentTrack = null;
      state.textChannel
        ?.send(`Error al reproducir **${track.title}**. Saltando...`)
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
      });
    }

    if (wasIdle) void playNext(guildId, false);

    return { track: state.queue[0] ?? state.currentTrack!, position: wasIdle ? 0 : state.queue.length - videos.length + 1, playlistSize: videos.length };
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

export function togglePause(
  guildId: string,
): 'paused' | 'resumed' | 'not_playing' {
  const state = getState(guildId);

  if (state.player.state.status === AudioPlayerStatus.Playing) {
    state.player.pause();
    return 'paused';
  }

  if (state.player.state.status === AudioPlayerStatus.Paused) {
    state.player.unpause();
    return 'resumed';
  }

  return 'not_playing';
}

export function stop(guildId: string) {
  const state = getState(guildId);
  state.queue = [];
  state.currentTrack = null;
  killYtdlp(state);
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
  killYtdlp(state);
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
  getState(guildId).volume = volume;
}
