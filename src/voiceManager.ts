import { VoiceConnection } from '@discordjs/voice';

const connections = new Map<string, VoiceConnection>();

export function setConnection(guildId: string, connection: VoiceConnection) {
  connections.set(guildId, connection);
}

export function getConnection(guildId: string): VoiceConnection | undefined {
  return connections.get(guildId);
}

export function removeConnection(guildId: string) {
  connections.delete(guildId);
}
