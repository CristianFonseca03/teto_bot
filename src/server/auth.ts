import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import logger from '../logger';

if (!process.env.JWT_SECRET) {
  logger.warn('JWT_SECRET no configurada. Usando secret efímero: los tokens se invalidarán al reiniciar el bot.');
}

const JWT_SECRET = process.env.JWT_SECRET ?? randomBytes(32).toString('hex');
const JWT_TTL = '15m';

export interface TokenPayload {
  userId: string;
  guildId: string;
}

export function generateToken(userId: string, guildId: string): string {
  return jwt.sign({ userId, guildId }, JWT_SECRET, { expiresIn: JWT_TTL });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
}
