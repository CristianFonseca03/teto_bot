import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { togglePause } from '../musicManager';

const pause: Command = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa o reanuda la reproducción actual'),

  async execute(interaction: ChatInputCommandInteraction) {
    const result = togglePause(interaction.guildId!);

    const configs = {
      paused:      { color: 0xfee75c as number, desc: '⏸  Reproducción pausada.' },
      resumed:     { color: 0x1db954 as number, desc: '▶  Reproducción reanudada.' },
      not_playing: { color: 0xed4245 as number, desc: 'No hay nada reproduciéndose.' },
    };

    const { color, desc } = configs[result];
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(color).setDescription(desc)],
      ephemeral: result === 'not_playing',
    });
  },
};

export default pause;
