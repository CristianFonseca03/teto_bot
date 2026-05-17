import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import {
  getCurrentTrack,
  getTrackStartedAt,
  buildNowPlayingEmbed,
  buildNowPlayingComponents,
  isPaused,
} from '../musicManager';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildProgressBar(elapsed: number, total: number, width = 18): string {
  const pct = Math.min(elapsed / total, 1);
  const filled = Math.round(pct * width);
  const bar = '━'.repeat(filled) + '⬤' + '─'.repeat(width - filled);
  return `${formatTime(elapsed)} ${bar} ${formatTime(total)}`;
}

const nowplaying: Command = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra la canción que se está reproduciendo ahora'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const track = getCurrentTrack(guildId);

    if (!track || track.requestedBy === 'bot') {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('No hay ninguna canción reproduciéndose.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = buildNowPlayingEmbed(track);

    const startedAt = getTrackStartedAt(guildId);
    if (startedAt && track.duration) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      embed.addFields({ name: '​', value: buildProgressBar(elapsed, track.duration) });
    }

    await interaction.reply({
      embeds: [embed],
      components: [buildNowPlayingComponents(isPaused(guildId))],
    });
  },
};

export default nowplaying;
