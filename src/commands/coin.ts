import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';

const coin: Command = {
  data: new SlashCommandBuilder()
    .setName('coin')
    .setDescription('Lanza una moneda'),

  async execute(interaction: ChatInputCommandInteraction) {
    const result = Math.random() < 0.5 ? '🪙 Cara' : '🪙 Cruz';

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(result)],
    });
  },
};

export default coin;
