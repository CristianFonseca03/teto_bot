# TetoBot

Bot de música para Discord construido con Discord.js v14 y TypeScript. Reproduce audio de YouTube y archivos locales con gestión completa de cola.

## Requisitos

- Node.js >= 22.12.0
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) instalado en el sistema
- Una aplicación de Discord ([Discord Developer Portal](https://discord.com/developers/applications))

## Instalación

### 1. Instalar dependencias del sistema

```bash
# macOS
brew install yt-dlp

# Linux (Debian/Ubuntu)
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 2. Instalar Node.js 22

```bash
# Con nvm
nvm install 22
nvm use 22
```

### 3. Clonar e instalar dependencias

```bash
git clone https://github.com/CristianFonseca03/teto_bot.git
cd teto_bot
npm install
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores del bot:

```env
DISCORD_TOKEN=tu_token_aqui
CLIENT_ID=tu_client_id_aqui
GUILD_ID=id_de_tu_servidor     # opcional, solo para desarrollo
JOIN_SOUND_URL=assets/teto.mp3 # opcional, audio al entrar al canal
GIPHY_API_KEY=tu_api_key_aqui  # opcional, necesaria para el comando /gif
NODE_ENV=development           # opcional, activa pino-pretty en consola
```

Obtener estos valores desde el [Discord Developer Portal](https://discord.com/developers/applications):
- **DISCORD_TOKEN**: sección *Bot → Token*
- **CLIENT_ID**: sección *General Information → Application ID*
- **GUILD_ID**: ID de tu servidor (activa *Developer Mode* en Discord → clic derecho en el servidor → *Copy Server ID*)

### 5. Registrar slash commands

```bash
npm run deploy
```

> Con `GUILD_ID` configurado, los comandos se registran al instante en ese servidor. Sin él, se registran globalmente y pueden tardar hasta 1 hora en aparecer.

### 6. Iniciar el bot

```bash
# Desarrollo (hot reload)
npm run dev

# Producción
npm run build
npm start
```

## Comandos

| Comando | Descripción |
|---|---|
| `/play <entrada>` | Reproduce o encola audio. Acepta URL de YouTube, playlist, término de búsqueda o nombre de archivo en `assets/` |
| `/play <entrada> volumen:[0-100]` | Igual, con volumen personalizado (por defecto 75%) |
| `/queue` | Muestra la cola de reproducción paginada con botones para saltar directamente a cualquier canción |
| `/skip` | Salta la canción actual |
| `/skip posicion:[n]` | Salta hasta la posición indicada de la cola (descarta las anteriores) |
| `/priority posicion:[n]` | Mueve una canción al inicio de la cola para que sea la próxima en reproducirse |
| `/pause` | Pausa o reanuda la reproducción |
| `/stop` | Detiene la reproducción y limpia la cola |
| `/clean` | Limpia la cola sin detener la canción actual |
| `/shuffle` | Mezcla aleatoriamente las canciones en cola |
| `/leave` | Desconecta el bot del canal de voz |
| `/help` | Muestra la lista de comandos disponibles |
| `/ping` | Comprueba la latencia del bot |
| `/gif <busqueda>` | Busca y muestra un GIF aleatorio de Giphy (requiere `GIPHY_API_KEY`) |

## Archivos de audio locales

Coloca archivos de audio en la carpeta `assets/` y úsalos con `/play nombre-del-archivo.mp3`.

## Logs

Cada sesión genera un archivo de log en `logs/<timestamp>.log` con todos los eventos en formato JSON estructurado (útil para debugging y auditoría). En desarrollo, la consola muestra los logs con formato legible a color gracias a `pino-pretty`.

Los archivos de log no se incluyen en git.

## Stack técnico

- [Discord.js v14](https://discord.js.org/) — cliente de Discord
- [@discordjs/voice](https://github.com/discordjs/voice) — conexión y reproducción de voz
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — streaming de YouTube
- [play-dl](https://github.com/play-dl/play-dl) — búsqueda y metadatos de YouTube
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) — transcodificación de audio
- [pino](https://getpino.io/) + [pino-pretty](https://github.com/pinojs/pino-pretty) — logging estructurado
- [TypeScript](https://www.typescriptlang.org/) + [tsx](https://github.com/privatenumber/tsx) — desarrollo con hot reload
