import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { Round } from '../entities/round.entity';
import { RoundParticipant } from '../entities/round-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Round, RoundParticipant])],
  controllers: [RoundsController],
  providers: [RoundsService],
  exports: [RoundsService],
})
export class RoundsModule {}
