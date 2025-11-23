import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Round } from '../../entities/round.entity';
import { RoundStatus } from '../interfaces/round-status.enum';

export class RoundValidator {
  static validateRoundExists(round: Round | null): asserts round is Round {
    if (!round) {
      throw new NotFoundException('Round not found');
    }
  }

  static validateRoundIsActive(round: Round): void {
    const status = this.getRoundStatus(round);

    if (status === RoundStatus.COOLDOWN) {
      throw new BadRequestException('Round has not started yet');
    }

    if (status === RoundStatus.FINISHED) {
      throw new BadRequestException('Round has already finished');
    }
  }

  static getRoundStatus(round: Round): RoundStatus {
    const now = new Date();
    if (now < round.startDate) {
      return RoundStatus.COOLDOWN;
    }
    if (now >= round.startDate && now < round.endDate) {
      return RoundStatus.ACTIVE;
    }
    return RoundStatus.FINISHED;
  }
}
