import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { getCurrentTrack, getQueue } from '../musicManager';
import type { Track } from '../musicManager';

function trackLine(track: Track, index: number): string {
  const title = track.url.startsWith('http')
    ? `[${track.title}](${track.url})`
    : track.title;
  return `**${index + 1}.** ${title}`;
}

const queue: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra la cola de reproducción actual'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const current = getCurrentTrack(guildId);
    const tracks = getQueue(guildId);

    if (!current && tracks.length === 0) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('La cola está vacía.')],
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Cola de reproducción')
      .setColor(0x5865f2);

    if (current) {
      const title = current.url.startsWith('http')
        ? `[${current.title}](${current.url})`
        : current.title;
      embed.addFields({ name: '▶  Reproduciendo ahora', value: title });
      if (current.thumbnail) embed.setThumbnail(current.thumbnail);
    }

    if (tracks.length > 0) {
      const list = tracks.slice(0, 10).map(trackLine).join('\n');
      const extra = tracks.length > 10 ? `\n*...y ${tracks.length - 10} más*` : '';
      embed.addFields({ name: 'Próximas', value: list + extra });
    }

    embed.setFooter({ text: `${tracks.length} canción(es) en cola` });

    await interaction.reply({ embeds: [embed] });
  },
};

export default queue;
