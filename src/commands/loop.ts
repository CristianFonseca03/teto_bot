import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { setLoopMode, getLoopMode, getCurrentTrack } from '../musicManager';
import { requireSameVoiceChannel } from '../utils/voiceCheck';

const LABELS: Record<string, string> = {
  none: '⏹ Desactivado',
  track: '🔂 Canción actual',
  queue: '🔁 Cola completa',
};

const loop: Command = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Activa o cambia el modo de repetición')
    .addStringOption(opt =>
      opt
        .setName('modo')
        .setDescription('Modo de repetición')
        .setRequired(true)
        .addChoices(
          { name: 'Desactivado', value: 'none' },
          { name: 'Canción actual', value: 'track' },
          { name: 'Cola completa', value: 'queue' },
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!await requireSameVoiceChannel(interaction)) return;

    const guildId = interaction.guildId!;
    const mode = interaction.options.getString('modo', true) as 'none' | 'track' | 'queue';
    const current = getCurrentTrack(guildId);

    if (!current && mode !== 'none') {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('No hay ninguna canción reproduciéndose.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    setLoopMode(guildId, mode);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(mode === 'none' ? 0xfee75c : 0x1db954)
          .setDescription(`Modo de repetición: **${LABELS[mode]}**`),
      ],
    });
  },
};

export default loop;
