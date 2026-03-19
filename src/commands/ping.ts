import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../types";

const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Muestra la latencia del bot"),

  async execute(interaction: ChatInputCommandInteraction) {
    const { resource } = await interaction.reply({
      content: "Pinging...",
      withResponse: true,
    });
    const latency =
      resource!.message!.createdTimestamp - interaction.createdTimestamp;

    await interaction.editReply(`Pong! \`${latency}ms\``);
  },
};

export default ping;
