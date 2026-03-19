import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { shuffleQueue, getQueue } from '../musicManager';

const shuffle: Command = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Mezcla aleatoriamente las canciones en la cola'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const q = getQueue(guildId);

    if (q.length < 2) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('Necesitas al menos 2 canciones en la cola para mezclar.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    shuffleQueue(guildId);
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`🔀  Cola mezclada — ${q.length} canciones reordenadas.`)],
    });
  },
};

export default shuffle;
