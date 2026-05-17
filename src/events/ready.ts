import { Client, Events } from 'discord.js';
import logger from '../logger';
import { setClient } from '../musicManager';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    setClient(client);
    logger.info(`Bot listo: ${client.user?.tag}`);
  },
};
