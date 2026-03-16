import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { addTrack, setVolume, buildNowPlayingEmbed } from '../musicManager';

const play: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce o añade a la cola un audio de YouTube o de assets/')
    .addStringOption(option =>
      option
        .setName('entrada')
        .setDescription('URL de YouTube, término de búsqueda o nombre de archivo en assets/')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('volumen')
        .setDescription('Volumen del audio de 0 a 100 (por defecto: 5)')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Debes estar en un canal de voz.')],
        ephemeral: true,
      });
      return;
    }

    const input = interaction.options.getString('entrada', true);
    const volumePercent = interaction.options.getInteger('volumen') ?? 5;
    setVolume(interaction.guildId!, volumePercent / 100);

    await interaction.deferReply();

    try {
      const { track, position } = await addTrack(
        interaction.guildId!,
        input,
        interaction.user.username,
        voiceChannel,
        interaction.channel as any,
      );

      if (position === 0) {
        await interaction.editReply({ embeds: [buildNowPlayingEmbed(track)] });
      } else {
        const embed = buildNowPlayingEmbed(track)
          .setColor(0x5865f2)
          .setAuthor({ name: `📋  Añadido a la cola · #${position}` });
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err: any) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`Error: ${err.message}`)],
      });
    }
  },
};

export default play;
