import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { Command } from './types';
import logger from './logger';
import { startServer } from './server';

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
}) as ExtendedClient;

client.commands = new Collection();

const commandsPath = join(__dirname, 'commands');
for (const file of readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
  const command: Command = require(join(commandsPath, file)).default;
  client.commands.set(command.data.name, command);
}

const eventsPath = join(__dirname, 'events');
for (const file of readdirSync(eventsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
  const event = require(join(eventsPath, file)).default;
  if (event.once) {
    client.once(event.name, (...args: unknown[]) => event.execute(...args));
  } else {
    client.on(event.name, (...args: unknown[]) => event.execute(...args));
  }
}

client.login(process.env.DISCORD_TOKEN)
  .then(() => startServer(client))
  .catch(err => {
    logger.error({ err }, 'Error al iniciar sesión en Discord');
    process.exit(1);
  });
