import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Round } from '../entities/round.entity';
import { RoundParticipant } from '../entities/round-participant.entity';
import { User, UserRole } from '../entities/user.entity';
import { getGameConfig } from '../config/game.config';

@Injectable()
export class RoundsService {
  constructor(
    @InjectRepository(Round)
    private roundRepository: Repository<Round>,
    @InjectRepository(RoundParticipant)
    private participantRepository: Repository<RoundParticipant>,
    private dataSource: DataSource,
  ) {}

  async createRound(): Promise<Round> {
    const config = getGameConfig();
    const now = new Date();
    const startDate = new Date(now.getTime() + config.cooldownDuration * 1000);
    const endDate = new Date(startDate.getTime() + config.roundDuration * 1000);

    const round = this.roundRepository.create({
      startDate,
      endDate,
      totalScore: 0,
    });

    return this.roundRepository.save(round);
  }

  async findAll(): Promise<Round[]> {
    return this.roundRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<{
    id: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    totalScore: number;
    status: 'cooldown' | 'active' | 'finished';
    myScore: number;
    myTaps: number;
    winner?: {
      username: string;
      score: number;
    };
  }> {
    const round = await this.roundRepository.findOne({
      where: { id },
      relations: ['participants', 'participants.user'],
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    const now = new Date();
    let status: 'cooldown' | 'active' | 'finished';
    if (now < round.startDate) {
      status = 'cooldown';
    } else if (now >= round.startDate && now < round.endDate) {
      status = 'active';
    } else {
      status = 'finished';
    }

    let myScore = 0;
    let myTaps = 0;
    let winner: { username: string; score: number } | undefined;

    if (userId) {
      const participant = round.participants.find((p) => p.userId === userId);
      if (participant) {
        myScore = participant.score;
        myTaps = participant.taps;
      }
    }

    if (status === 'finished' && round.participants.length > 0) {
      const sortedParticipants = [...round.participants].sort(
        (a, b) => b.score - a.score,
      );
      const topParticipant = sortedParticipants[0];
      if (topParticipant.score > 0) {
        winner = {
          username: topParticipant.user.username,
          score: topParticipant.score,
        };
      }
    }

    return {
      id: round.id,
      startDate: round.startDate.toISOString(),
      endDate: round.endDate.toISOString(),
      createdAt: round.createdAt.toISOString(),
      totalScore: round.totalScore,
      status,
      myScore,
      myTaps,
      winner,
    };
  }

  async tap(
    roundId: string,
    user: User,
  ): Promise<{ score: number; taps: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the round row for reading with pessimistic locking
      const round = await queryRunner.manager
        .createQueryBuilder(Round, 'round')
        .setLock('pessimistic_write')
        .where('round.id = :id', { id: roundId })
        .getOne();

      if (!round) {
        throw new NotFoundException('Round not found');
      }

      // Check if the round is active
      const now = new Date();
      if (now < round.startDate) {
        throw new BadRequestException('Round has not started yet');
      }
      if (now >= round.endDate) {
        throw new BadRequestException('Round has already finished');
      }

      // Find or create participant
      let participant = await queryRunner.manager.findOne(RoundParticipant, {
        where: { roundId, userId: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!participant) {
        participant = queryRunner.manager.create(RoundParticipant, {
          roundId,
          userId: user.id,
          taps: 0,
          score: 0,
        });
      }

      // Increase the taps counter
      participant.taps += 1;

      // Calculate points: each 11th tap gives 10 points, others give 1 point
      let pointsToAdd = 1;
      if (participant.taps % 11 === 0) {
        pointsToAdd = 10;
      }

      // If the user is Nikita, points are not counted in the statistics
      // but the tap still works
      if (user.role !== UserRole.NIKITA) {
        participant.score += pointsToAdd;
        round.totalScore += pointsToAdd;
      }

      await queryRunner.manager.save(participant);
      await queryRunner.manager.save(round);

      await queryRunner.commitTransaction();

      // Return points for display (for Nikita always 0)
      return {
        score: user.role === UserRole.NIKITA ? 0 : participant.score,
        taps: participant.taps,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
