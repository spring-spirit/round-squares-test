import type { StringValue } from 'ms';

export const getGameConfig = () => ({
  roundDuration: parseInt(process.env.ROUND_DURATION || '60', 10), // in seconds
  cooldownDuration: parseInt(process.env.COOLDOWN_DURATION || '30', 10), // in seconds
  jwtSecret: process.env.JWT_SECRET || 'secret-key',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as StringValue,
});
