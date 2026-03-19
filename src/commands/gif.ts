import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../types";

interface GiphyImage {
  url: string;
}
interface GiphyResult {
  images: { original: GiphyImage };
  title: string;
}
interface GiphyResponse {
  data: GiphyResult[];
}

const gif: Command = {
  data: new SlashCommandBuilder()
    .setName("gif")
    .setDescription("Busca un GIF aleatorio en Giphy")
    .addStringOption((option) =>
      option
        .setName("busqueda")
        .setDescription("Texto para buscar")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              "❌ `GIPHY_API_KEY` no está configurada en el entorno.",
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const query = interaction.options.getString("busqueda", true);

    try {
      // La API de Giphy v1 solo acepta autenticación via query param; no soporta header Authorization.
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=25&rating=pg-13&lang=es`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5_000);
      let response: Response;
      try {
        response = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      const json = (await response.json()) as GiphyResponse;

      if (!json.data.length) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfee75c)
              .setDescription(`No se encontraron GIFs para: **${query}**`),
          ],
        });
        return;
      }

      const result = json.data[Math.floor(Math.random() * json.data.length)];

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(query)
        .setImage(result.images.original.url)
        .setFooter({ text: "Powered by GIPHY" });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription("❌ Error al contactar con la API de Giphy."),
        ],
      });
    }
  },
};

export default gif;
