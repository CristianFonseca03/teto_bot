import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { disconnect, getConnection } from '../musicManager';

const leave: Command = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Desconecta el bot del canal de voz y limpia la cola'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;

    if (!getConnection(guildId)) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('No estoy en ningún canal de voz.')],
        ephemeral: true,
      });
      return;
    }

    disconnect(guildId);
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('👋  Desconectado. Cola limpiada.')],
    });
  },
};

export default leave;
