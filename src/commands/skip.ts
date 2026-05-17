import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../types";
import { skip, skipTo, getCurrentTrack, getQueue, getLoopMode } from "../musicManager";
import { requireSameVoiceChannel } from "../utils/voiceCheck";

const skipCmd: Command = {
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription(
      "Salta la canción actual o avanza hasta una posición específica de la cola",
    )
    .addIntegerOption((opt) =>
      opt
        .setName("posicion")
        .setDescription(
          "Posición de la cola hasta la que saltar (salta todas las anteriores)",
        )
        .setRequired(false)
        .setMinValue(1),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!await requireSameVoiceChannel(interaction)) return;

    const guildId = interaction.guildId!;
    const position = interaction.options.getInteger("posicion");
    const current = getCurrentTrack(guildId);

    if (!current) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setDescription("No hay ninguna canción reproduciéndose."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (position === null) {
      if (getLoopMode(guildId) === 'track') {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfee75c)
              .setDescription('Estás en modo **loop de canción**. Usa `/loop none` primero para poder saltar.'),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      skip(guildId);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription(`⏭  Saltando **${current.title}**`),
        ],
      });
      return;
    }

    const queue = getQueue(guildId);
    if (position > queue.length) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              `La cola solo tiene **${queue.length}** canción(es).`,
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const result = skipTo(guildId, position);
    if (!result) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription("No se pudo saltar a esa posición."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetTitle = result.target.url.startsWith("http")
      ? `[${result.target.title}](${result.target.url})`
      : result.target.title;

    const skippedCount = result.skipped.length + 1;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(
            `⏭  Saltadas **${skippedCount}** canción(es) → reproduciendo ${targetTitle}`,
          ),
      ],
    });
  },
};

export default skipCmd;
