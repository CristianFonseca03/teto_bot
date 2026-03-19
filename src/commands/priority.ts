import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { prioritizeTrack, getQueue } from '../musicManager';

const priorityCmd: Command = {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Mueve una canción de la cola al inicio para que sea la próxima en reproducirse')
    .addIntegerOption(opt =>
      opt
        .setName('posicion')
        .setDescription('Posición de la canción en la cola')
        .setRequired(true)
        .setMinValue(1),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
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

    const track = prioritizeTrack(guildId, position - 1);
    if (!track) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Posición inválida.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const title = track.url.startsWith('http')
      ? `[${track.title}](${track.url})`
      : track.title;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1db954)
          .setDescription(`⬆  ${title} movida al inicio de la cola`),
      ],
    });
  },
};

export default priorityCmd;
