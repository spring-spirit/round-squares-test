import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { RoundsService } from './rounds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { Round } from '../entities/round.entity';
import {
  RoundResponseDto,
  RoundDetailsResponseDto,
  TapResponseDto,
} from './dto/round-response.dto';

@ApiTags('rounds')
@ApiCookieAuth('token')
@Controller('rounds')
@UseGuards(JwtAuthGuard)
export class RoundsController {
  constructor(private roundsService: RoundsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rounds' })
  @ApiResponse({
    status: 200,
    description: 'List of rounds',
    type: [RoundResponseDto],
  })
  async findAll() {
    const rounds = await this.roundsService.findAll();
    return rounds.map((round) => ({
      id: round.id,
      startDate: round.startDate.toISOString(),
      endDate: round.endDate.toISOString(),
      createdAt: round.createdAt.toISOString(),
      totalScore: round.totalScore,
      status: this.getRoundStatus(round),
    }));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new round (Admin only)' })
  @ApiResponse({ status: 201, description: 'Round created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createRound(@CurrentUser() user: User) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create rounds');
    }
    return this.roundsService.createRound();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get round details' })
  @ApiParam({ name: 'id', description: 'Round ID' })
  @ApiResponse({
    status: 200,
    description: 'Round details',
    type: RoundDetailsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const result = await this.roundsService.findOne(id, user.id);
    // For Nikita always show 0 points in statistics
    if (user.role === UserRole.NIKITA) {
      return {
        ...result,
        myScore: 0,
      };
    }
    return result;
  }

  @Post(':id/tap')
  @ApiOperation({ summary: 'Tap on the goose' })
  @ApiParam({ name: 'id', description: 'Round ID' })
  @ApiResponse({
    status: 200,
    description: 'Tap successful',
    type: TapResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Round is not active' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async tap(@Param('id') id: string, @CurrentUser() user: User) {
    return this.roundsService.tap(id, user);
  }

  private getRoundStatus(round: Round): 'cooldown' | 'active' | 'finished' {
    const now = new Date();
    if (now < round.startDate) {
      return 'cooldown';
    }
    if (now >= round.startDate && now < round.endDate) {
      return 'active';
    }
    return 'finished';
  }
}
