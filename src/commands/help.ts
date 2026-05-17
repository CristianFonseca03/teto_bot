import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { ExtendedClient } from '../index';

const CATEGORIES: { label: string; emoji: string; names: string[] }[] = [
  {
    label: 'Reproducción',
    emoji: '🎵',
    names: ['play', 'pause', 'skip', 'stop', 'leave', 'nowplaying'],
  },
  {
    label: 'Cola',
    emoji: '📋',
    names: ['queue', 'remove', 'move', 'priority', 'shuffle', 'clean', 'loop'],
  },
  {
    label: 'Historial & Volumen',
    emoji: '📊',
    names: ['history', 'volume'],
  },
  {
    label: 'Utilidades',
    emoji: '🛠️',
    names: ['convert', 'gif', '8ball', 'choose', 'coin', 'ping'],
  },
];

const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra todos los comandos disponibles por categoría'),

  async execute(interaction: ChatInputCommandInteraction) {
    const commands = (interaction.client as ExtendedClient).commands;

    const embed = new EmbedBuilder()
      .setTitle('Comandos disponibles')
      .setColor(0x5865f2)
      .setFooter({ text: `${commands.size} comandos en total` });

    for (const cat of CATEGORIES) {
      const lines = cat.names
        .map(name => {
          const cmd = commands.get(name);
          return cmd ? `**/${name}** — ${cmd.data.description}` : null;
        })
        .filter(Boolean)
        .join('\n');

      if (lines) embed.addFields({ name: `${cat.emoji} ${cat.label}`, value: lines });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default help;
