import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';

const choose: Command = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Elige aleatoriamente entre varias opciones separadas por coma')
    .addStringOption(opt =>
      opt
        .setName('opciones')
        .setDescription('Opciones separadas por coma (ej: pizza, sushi, tacos)')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const raw = interaction.options.getString('opciones', true);
    const options = raw.split(',').map(o => o.trim()).filter(o => o.length > 0 && o.length <= 100);

    if (options.length < 2) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('Necesitas al menos 2 opciones separadas por coma.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const chosen = options[Math.floor(Math.random() * options.length)];

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1db954)
          .setTitle('🎲 Elijo...')
          .setDescription(`**${chosen}**`)
          .setFooter({ text: `Entre: ${options.join(', ')}`.slice(0, 2048) }),
      ],
    });
  },
};

export default choose;
