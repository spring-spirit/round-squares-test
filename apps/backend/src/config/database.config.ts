import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Round } from '../entities/round.entity';
import { RoundParticipant } from '../entities/round-participant.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'guss_game_user',
  password: process.env.DB_PASSWORD || 'guss_game_password',
  database: process.env.DB_DATABASE || 'guss_game_database',
  entities: [User, Round, RoundParticipant],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.DB_LOGGING === 'true',
});
