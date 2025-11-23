import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { Round } from '../entities/round.entity';
import { RoundParticipant } from '../entities/round-participant.entity';
import { User, UserRole } from '../entities/user.entity';
import { getGameConfig } from '../config/game.config';
import {
  RoundDetailsResponse,
  TapResponse,
  PaginatedRoundsResponse,
} from './interfaces/round.interface';
import { RoundStatus } from './interfaces/round-status.enum';
import { RoundValidator } from './validators/round.validator';

@Injectable()
export class RoundsService {
  constructor(
    @InjectRepository(Round)
    private roundRepository: Repository<Round>,
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

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedRoundsResponse> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.roundRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string): Promise<RoundDetailsResponse> {
    const round = await this.roundRepository.findOne({
      where: { id },
      relations: ['participants', 'participants.user'],
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    const now = new Date();
    let status: RoundStatus;
    if (now < round.startDate) {
      status = RoundStatus.COOLDOWN;
    } else if (now >= round.startDate && now < round.endDate) {
      status = RoundStatus.ACTIVE;
    } else {
      status = RoundStatus.FINISHED;
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

    if (status === RoundStatus.FINISHED && round.participants.length > 0) {
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

  async tap(roundId: string, user: User): Promise<TapResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const round = await this.getRoundWithLock(queryRunner, roundId);
      RoundValidator.validateRoundExists(round);
      RoundValidator.validateRoundIsActive(round);

      const participant = await this.getOrCreateParticipant(
        queryRunner,
        roundId,
        user.id,
      );

      const tapResult = this.processTap(participant, round, user);

      await queryRunner.manager.save(participant);
      await queryRunner.manager.save(round);

      await queryRunner.commitTransaction();

      return tapResult;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async getRoundWithLock(
    queryRunner: QueryRunner,
    roundId: string,
  ): Promise<Round | null> {
    return await queryRunner.manager
      .createQueryBuilder(Round, 'round')
      .setLock('pessimistic_write')
      .where('round.id = :id', { id: roundId })
      .getOne();
  }

  private async getOrCreateParticipant(
    queryRunner: QueryRunner,
    roundId: string,
    userId: string,
  ): Promise<RoundParticipant> {
    let participant = await queryRunner.manager.findOne(RoundParticipant, {
      where: { roundId, userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!participant) {
      participant = queryRunner.manager.create(RoundParticipant, {
        roundId,
        userId,
        taps: 0,
        score: 0,
      });
    }

    return participant;
  }

  private processTap(
    participant: RoundParticipant,
    round: Round,
    user: User,
  ): TapResponse {
    participant.taps += 1;

    const pointsToAdd = this.calculatePoints(participant.taps);

    if (!this.shouldCountPoints(user.role)) {
      participant.score += pointsToAdd;
      round.totalScore += pointsToAdd;
    }

    return {
      score: this.shouldCountPoints(user.role) ? 0 : participant.score,
      taps: participant.taps,
    };
  }

  private calculatePoints(taps: number): number {
    return taps % 11 === 0 ? 10 : 1;
  }

  private shouldCountPoints(role: UserRole): boolean {
    return [UserRole.NIKITA].includes(role);
  }
}
