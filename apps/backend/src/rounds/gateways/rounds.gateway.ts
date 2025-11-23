import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Logger,
  UnauthorizedException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoundsService } from '../rounds.service';
import { AuthService } from '../../auth/auth.service';
import { User, UserRole } from '../../entities/user.entity';
import { Round } from '../../entities/round.entity';
import { getGameConfig } from '../../config/game.config';
import { RoundStatus } from '../interfaces/round-status.enum';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/rounds',
})
export class RoundsGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoundsGateway.name);
  private roundCheckInterval: NodeJS.Timeout | null = null;
  private activeRounds: Map<
    string,
    { startTimeout: NodeJS.Timeout; endTimeout: NodeJS.Timeout }
  > = new Map();

  constructor(
    private roundsService: RoundsService,
    private jwtService: JwtService,
    private authService: AuthService,
    @InjectRepository(Round)
    private roundRepository: Repository<Round>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const config = getGameConfig();
      const payload: unknown = this.jwtService.verify(token, {
        secret: config.jwtSecret,
      });

      if (
        !payload ||
        typeof payload !== 'object' ||
        !('sub' in payload) ||
        typeof (payload as { sub: unknown }).sub !== 'string'
      ) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const userId: string = (payload as { sub: string }).sub;

      const user = await this.authService.validateUser(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      client.user = user;
      this.logger.log(`Client connected: ${user.username} (${user.id})`);

      const rounds = await this.roundsService.findAll(1, 10);
      client.emit('rounds:list', {
        ...rounds,
        data: rounds.data.map((round: Round) => ({
          id: round.id,
          startDate: round.startDate.toISOString(),
          endDate: round.endDate.toISOString(),
          createdAt: round.createdAt.toISOString(),
          totalScore: round.totalScore,
          status: this.getRoundStatus(round),
        })),
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(`Client disconnected: ${client.user.username}`);
    }
  }

  @SubscribeMessage('rounds:get')
  async handleGetRounds(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { page?: number; limit?: number },
  ) {
    if (!client.user) {
      throw new UnauthorizedException();
    }

    const page = data?.page || 1;
    const limit = data?.limit || 10;

    const rounds = await this.roundsService.findAll(page, limit);
    client.emit('rounds:list', {
      ...rounds,
      data: rounds.data.map((round) => ({
        id: round.id,
        startDate: round.startDate.toISOString(),
        endDate: round.endDate.toISOString(),
        createdAt: round.createdAt.toISOString(),
        totalScore: round.totalScore,
        status: this.getRoundStatus(round),
      })),
    });
  }

  @SubscribeMessage('round:get')
  async handleGetRound(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roundId: string },
  ) {
    if (!client.user) {
      throw new UnauthorizedException();
    }

    const roundDetails = await this.roundsService.findOne(
      data.roundId,
      client.user.id,
    );

    if (client.user.role === UserRole.NIKITA) {
      roundDetails.myScore = 0;
    }

    client.emit('round:details', roundDetails);
  }

  @SubscribeMessage('round:tap')
  async handleTap(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roundId: string },
  ) {
    if (!client.user) {
      throw new UnauthorizedException();
    }

    try {
      const tapResult = await this.roundsService.tap(data.roundId, client.user);

      const roundDetails = await this.roundsService.findOne(
        data.roundId,
        client.user.id,
      );

      if (client.user.role === UserRole.NIKITA) {
        roundDetails.myScore = 0;
      }

      // Send tap result to the client with their personal data
      client.emit('round:tap:result', tapResult);

      // Send updated round details to this specific client only
      client.emit('round:details', roundDetails);

      // Broadcast only totalScore update to all clients (without personal data)
      // Each client will request their own data separately
      const round = await this.roundRepository.findOne({
        where: { id: data.roundId },
      });

      if (round) {
        // Send only totalScore update, clients will fetch their own data
        this.server
          .to(`round:${data.roundId}`)
          .emit(`round:${data.roundId}:score-update`, {
            totalScore: round.totalScore,
          });
      }
    } catch (error) {
      client.emit('round:tap:error', {
        message: error instanceof Error ? error.message : 'Tap failed',
      });
    }
  }

  @SubscribeMessage('round:create')
  async handleCreateRound(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user) {
      throw new UnauthorizedException();
    }

    if (client.user.role !== UserRole.ADMIN) {
      client.emit('round:create:error', {
        message: 'Only admins can create rounds',
      });
      return;
    }

    try {
      const round = await this.roundsService.createRound();

      // Broadcast new round to all clients
      const roundData = {
        id: round.id,
        startDate: round.startDate.toISOString(),
        endDate: round.endDate.toISOString(),
        createdAt: round.createdAt.toISOString(),
        totalScore: round.totalScore,
        status: this.getRoundStatus(round),
      };

      this.server.emit('round:created', roundData);

      // Schedule round start and end events
      void this.scheduleRoundEvents(round);
      client.emit('round:create:success', roundData);
    } catch (error) {
      client.emit('round:create:error', {
        message:
          error instanceof Error ? error.message : 'Failed to create round',
      });
    }
  }

  @SubscribeMessage('round:subscribe')
  async handleSubscribeRound(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roundId: string },
  ) {
    if (!client.user) {
      throw new UnauthorizedException();
    }

    // Join room for this round to receive updates
    await client.join(`round:${data.roundId}`);
    this.logger.log(
      `Client ${client.user.username} subscribed to round ${data.roundId}`,
    );

    // Send current round state
    const roundDetails = await this.roundsService.findOne(
      data.roundId,
      client.user.id,
    );

    if (client.user.role === UserRole.NIKITA) {
      roundDetails.myScore = 0;
    }

    client.emit('round:details', roundDetails);
  }

  @SubscribeMessage('round:unsubscribe')
  async handleUnsubscribeRound(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roundId: string },
  ) {
    await client.leave(`round:${data.roundId}`);
    this.logger.log(
      `Client ${client.user?.username} unsubscribed from round ${data.roundId}`,
    );
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from handshake auth
    const auth: unknown = client.handshake.auth;
    if (auth && typeof auth === 'object' && auth !== null && 'token' in auth) {
      const authToken: unknown = (auth as { token: unknown }).token;
      if (authToken && typeof authToken === 'string') {
        return authToken;
      }
    }

    // Try to get token from cookies
    const cookies: unknown = client.handshake.headers.cookie;
    if (cookies) {
      let cookieString: string;
      if (Array.isArray(cookies)) {
        const firstCookie: unknown = cookies[0];
        cookieString = typeof firstCookie === 'string' ? firstCookie : '';
      } else if (typeof cookies === 'string') {
        cookieString = cookies;
      } else {
        return null;
      }

      if (cookieString) {
        const tokenMatch = cookieString.match(/token=([^;]+)/);
        if (tokenMatch && tokenMatch[1]) {
          return tokenMatch[1];
        }
      }
    }

    return null;
  }

  private getRoundStatus(round: {
    startDate: Date;
    endDate: Date;
  }): RoundStatus {
    const now = new Date();
    if (now < round.startDate) {
      return RoundStatus.COOLDOWN;
    }
    if (now >= round.startDate && now < round.endDate) {
      return RoundStatus.ACTIVE;
    }
    return RoundStatus.FINISHED;
  }

  onModuleInit() {
    // Start checking for round state changes
    this.startRoundMonitoring();
  }

  onModuleDestroy() {
    // Clean up intervals and timeouts
    this.stopRoundMonitoring();
  }

  private startRoundMonitoring() {
    // Check every second for round state changes
    this.roundCheckInterval = setInterval(() => {
      void this.checkRoundsState();
    }, 1000);

    // Also check immediately
    void this.checkRoundsState();
  }

  private stopRoundMonitoring() {
    if (this.roundCheckInterval) {
      clearInterval(this.roundCheckInterval);
      this.roundCheckInterval = null;
    }

    // Clear all timeouts
    this.activeRounds.forEach(({ startTimeout, endTimeout }) => {
      clearTimeout(startTimeout);
      clearTimeout(endTimeout);
    });
    this.activeRounds.clear();
  }

  private async checkRoundsState() {
    try {
      const now = new Date();
      const checkWindow = new Date(now.getTime() + 5000);

      const activeRounds = await this.roundRepository
        .createQueryBuilder('round')
        .where('round.endDate > :now', { now })
        .andWhere(
          '(round.startDate <= :checkWindow OR round.endDate <= :checkWindow)',
          { checkWindow },
        )
        .orderBy('round.startDate', 'ASC')
        .getMany();

      for (const round of activeRounds) {
        const roundId = round.id;
        const status = this.getRoundStatus(round);

        if (status === RoundStatus.FINISHED) {
          if (this.activeRounds.has(roundId)) {
            const timeouts = this.activeRounds.get(roundId);
            if (timeouts) {
              clearTimeout(timeouts.startTimeout);
              clearTimeout(timeouts.endTimeout);
            }
            this.activeRounds.delete(roundId);
          }
          continue;
        }

        if (!this.activeRounds.has(roundId)) {
          const startTime = round.startDate.getTime() - now.getTime();
          const endTime = round.endDate.getTime() - now.getTime();

          if (startTime > 0 && startTime <= 5000) {
            const startTimeout = setTimeout(() => {
              void this.broadcastRoundStarted(roundId);
            }, startTime);

            const endTimeout = setTimeout(() => {
              void this.broadcastRoundFinished(roundId);
              this.activeRounds.delete(roundId);
            }, endTime);

            this.activeRounds.set(roundId, { startTimeout, endTimeout });
          } else if (endTime > 0 && endTime <= 5000) {
            const endTimeout = setTimeout(() => {
              void this.broadcastRoundFinished(roundId);
              this.activeRounds.delete(roundId);
            }, endTime);

            this.activeRounds.set(roundId, {
              startTimeout: setTimeout(() => {}, 0),
              endTimeout,
            });

            if (startTime <= 0 && startTime > -1000) {
              void this.broadcastRoundStarted(roundId);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking rounds state:', error);
    }
  }

  private async broadcastRoundStarted(roundId: string) {
    const queryRunner =
      this.roundRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const round = await queryRunner.manager
        .createQueryBuilder(Round, 'round')
        .setLock('pessimistic_write')
        .where('round.id = :id', { id: roundId })
        .getOne();

      if (!round) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const now = new Date();
      const timeDiff = round.startDate.getTime() - now.getTime();
      if (timeDiff > 1000 || timeDiff < -1000) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const roundData = {
        id: round.id,
        startDate: round.startDate.toISOString(),
        endDate: round.endDate.toISOString(),
        createdAt: round.createdAt.toISOString(),
        totalScore: round.totalScore,
        status: RoundStatus.ACTIVE,
      };

      await queryRunner.commitTransaction();

      // Broadcast to all clients (for rounds list update)
      this.server.emit('round:started', roundData);
      // Also broadcast to specific round room
      this.server
        .to(`round:${roundId}`)
        .emit(`round:${roundId}:started`, roundData);

      // Notify all clients to refresh rounds list
      this.server.emit('rounds:list:refresh');

      this.logger.log(`Round ${roundId} started`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error broadcasting round started for ${roundId}:`,
        error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private scheduleRoundEvents(round: Round) {
    const now = new Date();
    const startTime = round.startDate.getTime() - now.getTime();
    const endTime = round.endDate.getTime() - now.getTime();

    if (startTime > 0) {
      const startTimeout = setTimeout(() => {
        void this.broadcastRoundStarted(round.id);
      }, startTime);

      const endTimeout = setTimeout(() => {
        void this.broadcastRoundFinished(round.id);
        this.activeRounds.delete(round.id);
      }, endTime);

      this.activeRounds.set(round.id, { startTimeout, endTimeout });
    } else if (endTime > 0) {
      const endTimeout = setTimeout(() => {
        void this.broadcastRoundFinished(round.id);
        this.activeRounds.delete(round.id);
      }, endTime);

      this.activeRounds.set(round.id, {
        startTimeout: setTimeout(() => {}, 0),
        endTimeout,
      });
    }
  }

  private async broadcastRoundFinished(roundId: string) {
    const queryRunner =
      this.roundRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const round = await queryRunner.manager
        .createQueryBuilder(Round, 'round')
        .setLock('pessimistic_write')
        .where('round.id = :id', { id: roundId })
        .getOne();

      if (!round) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const now = new Date();
      const timeDiff = round.endDate.getTime() - now.getTime();
      if (timeDiff > 1000 || timeDiff < -1000) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const roundWithParticipants = await queryRunner.manager
        .createQueryBuilder(Round, 'round')
        .leftJoinAndSelect('round.participants', 'participants')
        .leftJoinAndSelect('participants.user', 'user')
        .where('round.id = :id', { id: roundId })
        .getOne();

      let winner: { username: string; score: number } | undefined;
      if (
        roundWithParticipants?.participants &&
        roundWithParticipants.participants.length > 0
      ) {
        const sortedParticipants = [...roundWithParticipants.participants].sort(
          (a, b) => b.score - a.score,
        );
        const topParticipant = sortedParticipants[0];
        if (topParticipant.score > 0 && topParticipant.user) {
          winner = {
            username: topParticipant.user.username,
            score: topParticipant.score,
          };
        }
      }

      await queryRunner.commitTransaction();

      const roundData = {
        id: round.id,
        startDate: round.startDate.toISOString(),
        endDate: round.endDate.toISOString(),
        createdAt: round.createdAt.toISOString(),
        totalScore: round.totalScore,
        status: RoundStatus.FINISHED,
        winner,
      };

      // Broadcast to all clients (for rounds list update)
      this.server.emit('round:finished', roundData);
      // Also broadcast to specific round room
      this.server
        .to(`round:${roundId}`)
        .emit(`round:${roundId}:finished`, roundData);

      // Send refresh signal to all clients in the room to fetch their personal data
      this.server.to(`round:${roundId}`).emit(`round:${roundId}:refresh`);

      // Notify all clients to refresh rounds list
      this.server.emit('rounds:list:refresh');

      this.logger.log(`Round ${roundId} finished`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error broadcasting round finished for ${roundId}:`,
        error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
