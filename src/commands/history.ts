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
import { getHistory } from '../musicManager';
import type { Track } from '../musicManager';

const PAGE_SIZE = 10;

function trackLine(track: Track, index: number): string {
  const title = track.url.startsWith('http') ? `[${track.title}](${track.url})` : track.title;
  return `**${index + 1}.** ${title} — pedida por ${track.requestedBy}`;
}

function buildPage(tracks: Track[], page: number): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * PAGE_SIZE;
  const slice = tracks.slice(start, start + PAGE_SIZE);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Historial de reproducción')
    .setDescription(slice.map((t, i) => trackLine(t, start + i)).join('\n'))
    .setFooter({ text: `Página ${clampedPage + 1}/${totalPages} · ${tracks.length} canción(es)` });

  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (tracks.length > PAGE_SIZE) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('history_prev')
          .setLabel('◀ Anterior')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(clampedPage === 0),
        new ButtonBuilder()
          .setCustomId('history_next')
          .setLabel('Siguiente ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(clampedPage >= totalPages - 1),
      ),
    );
  }

  return { embeds: [embed], components };
}

const history: Command = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Muestra el historial de canciones reproducidas en esta sesión'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const tracks = getHistory(guildId);

    if (tracks.length === 0) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription('El historial de esta sesión está vacío.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let page = 0;
    await interaction.reply(buildPage(tracks, page));
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({
      time: 120_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      if (!i.isButton()) return;
      if (i.customId === 'history_prev') page = Math.max(0, page - 1);
      else if (i.customId === 'history_next') page++;
      await i.update(buildPage(tracks, page));
    });

    collector.on('end', async () => {
      const { embeds } = buildPage(tracks, page);
      await reply.edit({ embeds, components: [] }).catch(() => {});
    });
  },
};

export default history;
