import { Events, Interaction, MessageFlags } from 'discord.js';
import { ExtendedClient } from '../index';
import logger from '../logger';

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction) {
    if (interaction.isAutocomplete()) {
      const client = interaction.client as ExtendedClient;
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        await command.autocomplete(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as ExtendedClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    const options = interaction.options.data.reduce<Record<string, unknown>>((acc, opt) => {
      acc[opt.name] = opt.value;
      return acc;
    }, {});

    logger.info(
      { command: interaction.commandName, user: interaction.user.tag, userId: interaction.user.id, options },
      'Comando ejecutado',
    );

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error({ err: error, command: interaction.commandName }, 'Error ejecutando comando');
      const content = 'Ocurrió un error al ejecutar este comando.';
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
      } catch {
        // La interacción expiró o ya fue respondida; ignorar
      }
    }
  },
};
