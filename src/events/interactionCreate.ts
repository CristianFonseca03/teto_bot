import { EmbedBuilder, Events, GuildMember, Interaction, MessageFlags } from 'discord.js';
import { ExtendedClient } from '../index';
import logger from '../logger';
import { togglePause, skip, stop, getConnection } from '../musicManager';

const cooldowns = new Map<string, Map<string, number>>();

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

    if (interaction.isButton()) {
      const { customId, guildId } = interaction;
      if (!guildId) return;

      if (customId === 'np_pause' || customId === 'np_skip' || customId === 'np_stop') {
        const member = interaction.member as GuildMember;
        const botConnection = getConnection(guildId);
        if (botConnection && member.voice?.channelId !== botConnection.joinConfig.channelId) {
          await interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Debes estar en el canal de voz del bot para usar estos controles.')],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      if (customId === 'np_pause') {
        const result = togglePause(guildId);
        const desc = result === 'paused' ? '⏸ Pausado' : result === 'resumed' ? '▶ Reanudado' : 'No hay ninguna canción reproduciéndose.';
        const color = result === 'paused' ? 0xfee75c : result === 'resumed' ? 0x1db954 : 0xfee75c;
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(color).setDescription(desc)],
          flags: MessageFlags.Ephemeral,
        });
      } else if (customId === 'np_skip') {
        const skipped = skip(guildId);
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(skipped ? 0x57f287 : 0xfee75c)
            .setDescription(skipped ? '⏭ Saltando...' : 'No hay ninguna canción reproduciéndose.')],
          flags: MessageFlags.Ephemeral,
        });
      } else if (customId === 'np_stop') {
        stop(guildId);
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('⏹ Reproducción detenida.')],
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as ExtendedClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    if (command.cooldown) {
      if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());
      const timestamps = cooldowns.get(command.data.name)!;
      const now = Date.now();
      const expiry = timestamps.get(interaction.user.id) ?? 0;
      if (now < expiry) {
        const remaining = ((expiry - now) / 1000).toFixed(1);
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`Espera **${remaining}s** antes de usar este comando de nuevo.`)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      timestamps.set(interaction.user.id, now + command.cooldown * 1000);
      setTimeout(() => timestamps.delete(interaction.user.id), command.cooldown * 1000);
    }

    const options = interaction.options.data.reduce<Record<string, unknown>>((acc, opt) => {
      acc[opt.name] = opt.value;
      return acc;
    }, {});

    logger.info(
      { command: interaction.commandName, user: interaction.user.username, userId: interaction.user.id, options },
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
