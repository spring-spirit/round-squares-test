import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoundsService } from './rounds.service';
import { RoundsGateway } from './gateways/rounds.gateway';
import { Round } from '../entities/round.entity';
import { RoundParticipant } from '../entities/round-participant.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Round, RoundParticipant]), AuthModule],
  controllers: [],
  providers: [RoundsService, RoundsGateway],
  exports: [RoundsService, RoundsGateway],
})
export class RoundsModule {}
