import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { ExtendedClient } from '../index';
import soundboardRoutes from './routes/soundboard';
import logger from '../logger';
import { verifyToken } from './auth';

export async function startServer(client: ExtendedClient): Promise<void> {
  const fastify = Fastify({ logger: false });
  const port = parseInt(process.env.SOUNDBOARD_PORT ?? '3000', 10);
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;
  const soundboardUrl = process.env.SOUNDBOARD_URL ?? baseUrl;
  const allowedOrigins = [...new Set([baseUrl, soundboardUrl])];

  await fastify.register(fastifyCors, { origin: allowedOrigins });

  fastify.addHook('onSend', (_req, reply, _payload, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    done();
  });

  await fastify.register(fastifyRateLimit, {
    max: 10,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      const auth = req.headers['authorization'];
      if (auth?.startsWith('Bearer ')) {
        try {
          return verifyToken(auth.slice(7)).userId;
        } catch {}
      }
      return req.ip;
    },
  });

  await fastify.register(soundboardRoutes, { client });

  await fastify.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'Servidor soundboard API escuchando');
}
