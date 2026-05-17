import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { cleanQueue, getQueue } from '../musicManager';
import { requireSameVoiceChannel } from '../utils/voiceCheck';

const clean: Command = {
  data: new SlashCommandBuilder()
    .setName('clean')
    .setDescription('Elimina todas las canciones de la cola (sin detener la actual)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;

    if (!await requireSameVoiceChannel(interaction)) return;

    const queue = getQueue(guildId);

    if (queue.length === 0) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('La cola ya está vacía.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('clean_confirm').setLabel('Sí, vaciar').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('clean_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setDescription(`¿Vaciar la cola de **${queue.length}** canción(es)?`),
      ],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    try {
      const reply = await interaction.fetchReply();
      const i = await reply.awaitMessageComponent({
        time: 15_000,
        filter: i => i.user.id === interaction.user.id,
      });

      if (i.customId === 'clean_confirm') {
        cleanQueue(guildId);
        await i.update({
          embeds: [new EmbedBuilder().setColor(0x57f287).setDescription('🗑 Cola limpiada. La canción actual seguirá reproduciéndose.')],
          components: [],
        });
      } else {
        await i.update({
          embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription('Cancelado.')],
          components: [],
        });
      }
    } catch {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription('Tiempo agotado. Operación cancelada.')],
        components: [],
      }).catch(() => {});
    }
  },
};

export default clean;
