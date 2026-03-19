import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { skip, getCurrentTrack } from '../musicManager';

const skipCmd: Command = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta la canción actual y reproduce la siguiente en cola'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const current = getCurrentTrack(guildId);

    if (!current) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('No hay ninguna canción reproduciéndose.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    skip(guildId);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`⏭  Saltando **${current.title}**`),
      ],
    });
  },
};

export default skipCmd;
