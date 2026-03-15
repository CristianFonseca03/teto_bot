# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev        # Modo desarrollo con hot reload (tsx watch)
npm run build      # Compilar TypeScript a dist/
npm start          # Ejecutar bot en producción (requiere build previo)
npm run deploy     # Registrar/actualizar slash commands en Discord
```

> Para desarrollo, usar siempre `npm run dev`. El script `deploy` solo se necesita al añadir o modificar comandos slash.

## Variables de entorno

Crear `.env` basado en `.env.example`:
- `DISCORD_TOKEN` — token del bot (obligatorio)
- `CLIENT_ID` — application client ID (obligatorio para deploy)
- `GUILD_ID` — ID del servidor para registro de comandos en desarrollo (opcional; si no está, los comandos se registran globalmente y tardan ~1h en propagarse)

## Arquitectura

El bot usa un sistema de **carga dinámica** para comandos y eventos: `src/index.ts` recorre los directorios `src/commands/` y `src/events/` al iniciar y registra todo automáticamente. Para añadir un nuevo comando o evento, basta con crear el archivo en la carpeta correspondiente.

### Estructura de un comando

```ts
// src/commands/ejemplo.ts
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../types';

const comando: Command = {
  data: new SlashCommandBuilder()
    .setName('ejemplo')
    .setDescription('Descripción'),
  async execute(interaction: CommandInteraction) {
    await interaction.reply('Hola');
  },
};

export default comando;
```

### Estructura de un evento

```ts
// src/events/nombreEvento.ts
import { Events, Client } from 'discord.js';

export default {
  name: Events.SomeEvent,
  once: false, // true si solo debe ejecutarse una vez
  async execute(...args: any[]) { /* ... */ },
};
```

### Flujo de interacciones

1. Usuario invoca slash command → Discord emite `interactionCreate`
2. `src/events/interactionCreate.ts` enruta al handler correspondiente en `client.commands`
3. Errores son capturados y retornados al usuario como respuesta efímera

### Audio

El comando `/play` usa `@discordjs/voice` + `@discordjs/opus` + `ffmpeg-static`. Los archivos de audio van en `assets/`. El bot se conecta al canal de voz del usuario, reproduce el archivo y se desconecta.

### Intents activos

Solo `Guilds` y `GuildVoiceStates` (sin privileged intents).
