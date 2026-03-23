import { FastifyInstance } from 'fastify';
import { verifyToken } from '../auth';
import sounds from '../../sounds.json';
import { ensureConnection, addTrack } from '../../musicManager';
import { ExtendedClient } from '../../index';
import logger from '../../logger';

const noopSendable: { send(options: unknown): Promise<unknown> } = { send: () => Promise.resolve() };

export default async function soundboardRoutes(fastify: FastifyInstance, opts: { client: ExtendedClient }) {
  const { client } = opts;

  fastify.get('/api/soundboard/health', async (_req, reply) => {
    return reply.send({ status: 'ok' });
  });

  fastify.get('/api/soundboard/sounds', async (_req, reply) => {
    return reply.send(sounds.map(({ id, name, emoji }) => ({ id, name, emoji })));
  });

  fastify.post<{ Body: { soundId: string } }>('/api/soundboard/play', {
    schema: {
      body: {
        type: 'object',
        required: ['soundId'],
        properties: { soundId: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token requerido' });
    }

    let payload;
    try {
      payload = verifyToken(authHeader.slice(7));
    } catch {
      return reply.status(401).send({ error: 'Token inválido o expirado. Ejecuta /soundboard de nuevo.' });
    }

    const { soundId } = req.body;
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) {
      return reply.status(400).send({ error: 'Sonido no encontrado' });
    }

    const guild = client.guilds.cache.get(payload.guildId);
    if (!guild) {
      return reply.status(400).send({ error: 'Servidor no encontrado' });
    }

    let member;
    try {
      member = await guild.members.fetch(payload.userId);
    } catch {
      return reply.status(400).send({ error: 'No se pudo obtener el miembro' });
    }

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      return reply.status(400).send({ error: 'No estás en un canal de voz. Únete a uno primero.' });
    }

    try {
      await ensureConnection(payload.guildId, voiceChannel, noopSendable);
      const { track } = await addTrack(payload.guildId, sound.url, member.user.username, voiceChannel, noopSendable);
      logger.info({ soundId, userId: payload.userId, guildId: payload.guildId }, 'Soundboard: sonido reproducido');
      return reply.send({ success: true, title: track.title });
    } catch (err) {
      logger.error({ err, soundId }, 'Soundboard: error al reproducir');
      return reply.status(500).send({ error: 'Error al reproducir el sonido' });
    }
  });
}
