import { Client, Events } from 'discord.js';
import logger from '../logger';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    logger.info(`Bot listo: ${client.user?.tag}`);
  },
};
