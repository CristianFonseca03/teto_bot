import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../types";
import { ExtendedClient } from "../index";

const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Muestra todos los comandos disponibles"),

  async execute(interaction: ChatInputCommandInteraction) {
    const commands = (interaction.client as ExtendedClient).commands;

    const embed = new EmbedBuilder()
      .setTitle("Comandos disponibles")
      .setColor(0x5865f2)
      .setDescription(
        commands
          .map((cmd) => `**/${cmd.data.name}** — ${cmd.data.description}`)
          .join("\n"),
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default help;
