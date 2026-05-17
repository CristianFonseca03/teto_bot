import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { getVolume, setVolume, getCurrentTrack } from '../musicManager';
import { requireSameVoiceChannel } from '../utils/voiceCheck';

const volume: Command = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Muestra o ajusta el volumen de reproducción')
    .addIntegerOption(opt =>
      opt
        .setName('nivel')
        .setDescription('Volumen de 0 a 100')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const nivel = interaction.options.getInteger('nivel');

    if (nivel !== null && !await requireSameVoiceChannel(interaction)) return;

    if (nivel === null) {
      const current = Math.round(getVolume(guildId) * 100);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`🔊 Volumen actual: **${current}%**`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    setVolume(guildId, nivel / 100);

    const track = getCurrentTrack(guildId);
    const isPlaying = track && track.requestedBy !== 'bot';

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(
        isPlaying
          ? `🔊 Volumen ajustado a **${nivel}%**`
          : `🔊 Volumen configurado a **${nivel}%** (se aplicará en la próxima canción)`
      )],
      ...(isPlaying ? {} : { flags: MessageFlags.Ephemeral }),
    });
  },
};

export default volume;
