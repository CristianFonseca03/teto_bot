import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { existsSync } from 'fs';
import { join } from 'path';
import { Command } from '../types';
import { setConnection, getConnection } from '../voiceManager';

const play: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce un audio en tu canal de voz')
    .addStringOption(option =>
      option
        .setName('archivo')
        .setDescription('Nombre del archivo en la carpeta assets/ (ej: audio.mp3)')
        .setRequired(false)
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
      await interaction.reply({ content: 'Debes estar en un canal de voz.', ephemeral: true });
      return;
    }

    const fileName = interaction.options.getString('archivo') ?? 'audio.mp3';
    const filePath = join(process.cwd(), 'assets', fileName);

    if (!existsSync(filePath)) {
      await interaction.reply({
        content: `No se encontró el archivo \`${fileName}\` en la carpeta \`assets/\`.`,
        ephemeral: true,
      });
      return;
    }

    const volumePercent = interaction.options.getInteger('volumen') ?? 5;
    const volume = volumePercent / 100;

    await interaction.deferReply();

    let connection = getConnection(voiceChannel.guild.id);

    if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
      setConnection(voiceChannel.guild.id, connection);
    }

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    } catch {
      connection.destroy();
      await interaction.editReply('No se pudo conectar al canal de voz.');
      return;
    }

    const player = createAudioPlayer();
    const resource = createAudioResource(filePath, { inlineVolume: true });
    resource.volume?.setVolume(volume);

    connection.subscribe(player);
    player.play(resource);

    await interaction.editReply(
      `Reproduciendo \`${fileName}\` en **${voiceChannel.name}** (volumen: ${volumePercent}%)...`
    );

    await new Promise<void>((resolve, reject) => {
      player.once(AudioPlayerStatus.Idle, () => resolve());
      player.once('error', err => reject(err));
    }).catch(async err => {
      console.error('Error al reproducir audio:', err);
      await interaction.editReply('Ocurrió un error al reproducir el audio.');
    });

    await interaction.editReply(`\`${fileName}\` terminó de reproducirse.`);
  },
};

export default play;
