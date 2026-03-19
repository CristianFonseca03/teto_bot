import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { Command } from './types';
import logger from './logger';

const commands = [];

const commandsPath = join(__dirname, 'commands');
for (const file of readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
  const command: Command = require(join(commandsPath, file)).default;
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID;

(async () => {
  try {
    logger.info(`Registrando ${commands.length} comando(s)...`);

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logger.info('Comandos registrados en el servidor (guild) — disponibles de inmediato.');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.info('Comandos registrados globalmente — pueden tardar hasta 1 hora en propagarse.');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error al registrar comandos');
  }
})();
