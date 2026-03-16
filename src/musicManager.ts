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
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import type { VoiceBasedChannel } from 'discord.js';

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
}

const states = new Map<string, GuildState>();

function createState(guildId: string): GuildState {
  const player = createAudioPlayer();
  const state: GuildState = {
    connection: null,
    player,
    queue: [],
    volume: 0.05,
    textChannel: null,
    currentTrack: null,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    state.currentTrack = null;
    void playNext(guildId, true);
  });

  player.on('error', err => {
    console.error(`[MusicManager] Error en guild ${guildId}:`, err.message);
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

async function playNext(guildId: string, notify: boolean): Promise<void> {
  const state = getState(guildId);

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
        track.url,
      ]);
      proc.stderr.on('data', d => console.error('[yt-dlp]', d.toString().trim()));
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
  } catch (err) {
    console.error(`[MusicManager] Error reproduciendo "${track.title}":`, err);
    state.currentTrack = null;
    state.textChannel
      ?.send(`Error al reproducir **${track.title}**. Saltando...`)
      .catch(() => {});
    await playNext(guildId, true);
  }
}

export async function ensureConnection(
  guildId: string,
  voiceChannel: VoiceBasedChannel,
  textChannel: Sendable,
): Promise<VoiceConnection> {
  const state = getState(guildId);
  state.textChannel = textChannel;

  if (
    !state.connection ||
    state.connection.state.status === VoiceConnectionStatus.Destroyed
  ) {
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

  await entersState(state.connection, VoiceConnectionStatus.Ready, 10_000);
  return state.connection;
}

export async function addTrack(
  guildId: string,
  input: string,
  requestedBy: string,
  voiceChannel: VoiceBasedChannel,
  textChannel: Sendable,
): Promise<{ track: Track; position: number }> {
  await ensureConnection(guildId, voiceChannel, textChannel);

  const state = getState(guildId);
  let track: Track;

  const ytValidation = playdl.yt_validate(input);

  if (ytValidation === 'video') {
    const info = await playdl.video_info(input);
    const thumbs = info.video_details.thumbnails;
    track = {
      title: info.video_details.title ?? input,
      url: input,
      type: 'youtube',
      requestedBy,
      thumbnail: thumbs?.at(-1)?.url,
    };
  } else {
    const filePath = join(process.cwd(), 'assets', input);
    if (existsSync(filePath)) {
      track = { title: input, url: filePath, type: 'file', requestedBy };
    } else {
      const results = await playdl.search(input, { limit: 1 });
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
  state.player.stop(true);
}

export function cleanQueue(guildId: string) {
  getState(guildId).queue = [];
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
