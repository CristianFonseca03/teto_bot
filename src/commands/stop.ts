import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { stop, getCurrentTrack, getQueue } from '../musicManager';

const stopCmd: Command = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene la reproducción y limpia la cola'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;

    if (!getCurrentTrack(guildId) && getQueue(guildId).length === 0) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('No hay nada reproduciéndose.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    stop(guildId);
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('⏹  Reproducción detenida y cola limpiada.')],
    });
  },
};

export default stopCmd;
