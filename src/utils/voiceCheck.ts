import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, MessageFlags } from 'discord.js';
import { getConnection } from '../musicManager';

export async function requireSameVoiceChannel(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const guildId = interaction.guildId!;
  const member = interaction.member as GuildMember;
  const botConnection = getConnection(guildId);

  if (botConnection && member.voice?.channelId !== botConnection.joinConfig.channelId) {
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Debes estar en el canal de voz del bot para usar este comando.')],
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}
