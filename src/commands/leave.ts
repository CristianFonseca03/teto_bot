import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { getConnection, removeConnection } from '../voiceManager';

const leave: Command = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Desconecta el bot del canal de voz'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const connection = getConnection(guildId);

    if (!connection) {
      await interaction.reply({ content: 'No estoy en ningún canal de voz.', ephemeral: true });
      return;
    }

    connection.destroy();
    removeConnection(guildId);

    await interaction.reply('Desconectado del canal de voz.');
  },
};

export default leave;
