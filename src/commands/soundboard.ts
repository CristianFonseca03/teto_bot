import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { generateToken } from '../server/auth';

const soundboard: Command = {
  data: new SlashCommandBuilder()
    .setName('soundboard')
    .setDescription('Obtén tu enlace personal al soundboard')
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('Debes estar en un canal de voz para usar el soundboard.'),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const token = generateToken(interaction.user.id, interaction.guildId!);
    const port = process.env.SOUNDBOARD_PORT ?? '3000';
    const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;
    const soundboardUrl = process.env.SOUNDBOARD_URL ?? baseUrl;
    const url = `${soundboardUrl}/soundboard/#token=${token}&api=${encodeURIComponent(baseUrl)}`;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🎵 Tu Soundboard')
          .setDescription(`[Abrir Soundboard](${url})\n\n> El enlace expira en **15 minutos**.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default soundboard;
