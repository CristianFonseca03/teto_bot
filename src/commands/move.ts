import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { moveTrack, getQueue } from '../musicManager';

const move: Command = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Mueve una canción a otra posición de la cola')
    .addIntegerOption(opt =>
      opt.setName('origen').setDescription('Posición actual de la canción').setRequired(true).setMinValue(1),
    )
    .addIntegerOption(opt =>
      opt.setName('destino').setDescription('Nueva posición de la canción').setRequired(true).setMinValue(1),
    ) as SlashCommandBuilder,

  cooldown: 2,

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const from = interaction.options.getInteger('origen', true);
    const to = interaction.options.getInteger('destino', true);
    const queue = getQueue(guildId);

    if (queue.length === 0) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('La cola está vacía.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (from === to) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('El origen y el destino son la misma posición.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (from > queue.length || to > queue.length) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`La cola solo tiene **${queue.length}** canción(es).`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const trackTitle = queue[from - 1].title;
    const ok = moveTrack(guildId, from - 1, to - 1);

    if (!ok) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('No se pudo mover la canción.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`↕️ **${trackTitle}** movida de la posición **${from}** a la **${to}**`),
      ],
    });
  },
};

export default move;
