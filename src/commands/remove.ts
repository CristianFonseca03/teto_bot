import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { removeTrack, getQueue } from '../musicManager';
import { requireSameVoiceChannel } from '../utils/voiceCheck';

const remove: Command = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Elimina una canción de la cola')
    .addIntegerOption(opt =>
      opt
        .setName('posicion')
        .setDescription('Posición de la canción a eliminar')
        .setRequired(true)
        .setMinValue(1),
    ) as SlashCommandBuilder,

  cooldown: 2,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!await requireSameVoiceChannel(interaction)) return;

    const guildId = interaction.guildId!;
    const position = interaction.options.getInteger('posicion', true);
    const queue = getQueue(guildId);

    if (queue.length === 0) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('La cola está vacía.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (position > queue.length) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`La cola solo tiene **${queue.length}** canción(es).`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const track = removeTrack(guildId, position - 1);
    if (!track) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Posición inválida.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const title = track.url.startsWith('http') ? `[${track.title}](${track.url})` : track.title;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`🗑️ Eliminada de la cola: **${title}**`),
      ],
    });
  },
};

export default remove;
