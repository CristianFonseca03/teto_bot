import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { cleanQueue, getQueue } from '../musicManager';

const clean: Command = {
  data: new SlashCommandBuilder()
    .setName('clean')
    .setDescription('Elimina todas las canciones de la cola (sin detener la actual)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;

    if (getQueue(guildId).length === 0) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('La cola ya está vacía.')],
        ephemeral: true,
      });
      return;
    }

    cleanQueue(guildId);
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setDescription('🗑  Cola limpiada. La canción actual seguirá reproduciéndose.')],
    });
  },
};

export default clean;
