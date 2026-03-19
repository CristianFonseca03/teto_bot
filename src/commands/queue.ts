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
import { getCurrentTrack, getQueue, skipTo } from '../musicManager';
import type { Track } from '../musicManager';

const PAGE_SIZE = 10;

function truncateTitle(title: string, max = 45): string {
  if (title.length <= max) return title;
  const half = Math.floor((max - 1) / 2);
  return `${title.slice(0, half)}…${title.slice(-half)}`;
}

function trackLine(track: Track, index: number): string {
  const display = truncateTitle(track.title);
  const title = track.url.startsWith('http')
    ? `[${display}](${track.url})`
    : display;
  return `**${index + 1}.** ${title}`;
}

function buildPage(
  current: Track | null,
  tracks: Track[],
  page: number,
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * PAGE_SIZE;

  const embed = new EmbedBuilder().setTitle('Cola de reproducción').setColor(0x5865f2);

  if (current) {
    const title = current.url.startsWith('http')
      ? `[${current.title}](${current.url})`
      : current.title;
    embed.addFields({ name: '▶  Reproduciendo ahora', value: title });
    if (current.thumbnail) embed.setThumbnail(current.thumbnail);
  }

  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (tracks.length > 0) {
    const slice = tracks.slice(start, start + PAGE_SIZE);

    embed.addFields({
      name: 'Próximas',
      value: slice.map((t, i) => trackLine(t, start + i)).join('\n'),
    });

    // Botones de salto: filas de hasta 5 botones
    const firstRow: ButtonBuilder[] = [];
    const secondRow: ButtonBuilder[] = [];
    for (let i = 0; i < slice.length; i++) {
      const pos = start + i + 1;
      const btn = new ButtonBuilder()
        .setCustomId(`queue_skip_${pos}`)
        .setLabel(`▶ ${pos}`)
        .setStyle(ButtonStyle.Secondary);
      if (i < 5) firstRow.push(btn);
      else secondRow.push(btn);
    }
    if (firstRow.length > 0)
      components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...firstRow));
    if (secondRow.length > 0)
      components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...secondRow));
  }

  embed.setFooter({
    text: `Página ${clampedPage + 1}/${totalPages} · ${tracks.length} canción(es) en cola`,
  });

  if (tracks.length > PAGE_SIZE) {
    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('queue_prev')
        .setLabel('◀ Anterior')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(clampedPage === 0),
      new ButtonBuilder()
        .setCustomId('queue_next')
        .setLabel('Siguiente ▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(clampedPage >= totalPages - 1),
    );
    components.push(navRow);
  }

  return { embeds: [embed], components };
}

const queueCmd: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra la cola de reproducción actual'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const current = getCurrentTrack(guildId);
    const tracks = getQueue(guildId);

    if (!current && tracks.length === 0) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('La cola está vacía.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let page = 0;
    await interaction.reply(buildPage(current, tracks, page));
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async i => {
      if (!i.isButton()) return;

      if (i.customId === 'queue_prev') {
        page = Math.max(0, page - 1);
      } else if (i.customId === 'queue_next') {
        page++;
      } else if (i.customId.startsWith('queue_skip_')) {
        const position = parseInt(i.customId.slice('queue_skip_'.length));
        const freshCurrent = getCurrentTrack(guildId);

        if (!freshCurrent) {
          await i.update({
            embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('No hay ninguna canción reproduciéndose.')],
            components: [],
          });
          return;
        }

        const result = skipTo(guildId, position);
        if (!result) {
          await i.reply({
            embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Esa canción ya no está en la cola.')],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const freshTracks = getQueue(guildId);
        const totalPages = Math.max(1, Math.ceil(freshTracks.length / PAGE_SIZE));
        page = Math.min(page, Math.max(0, totalPages - 1));
        await i.update(buildPage(getCurrentTrack(guildId), freshTracks, page));
        return;
      }

      const freshTracks = getQueue(guildId);
      const freshCurrent = getCurrentTrack(guildId);
      const totalPages = Math.max(1, Math.ceil(freshTracks.length / PAGE_SIZE));
      page = Math.min(page, totalPages - 1);
      await i.update(buildPage(freshCurrent, freshTracks, page));
    });

    collector.on('end', async () => {
      const freshTracks = getQueue(guildId);
      const freshCurrent = getCurrentTrack(guildId);
      const { embeds } = buildPage(freshCurrent, freshTracks, page);
      await reply.edit({ embeds, components: [] }).catch(() => {});
    });
  },
};

export default queueCmd;
