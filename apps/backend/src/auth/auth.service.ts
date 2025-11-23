import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { getGameConfig } from '../config/game.config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    let user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      const role = this.determineRole(username);
      const hashedPassword = await bcrypt.hash(password, 10);
      user = this.userRepository.create({
        username,
        password: hashedPassword,
        role,
      });
      await this.userRepository.save(user);
    } else {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const config = getGameConfig();
    const token = this.jwtService.sign(
      { sub: user.id, username: user.username, role: user.role },
      {
        secret: config.jwtSecret,
        expiresIn: config.jwtExpiresIn,
      },
    );

    return { user, token };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  private determineRole(username: string): UserRole {
    const lowerUsername = username.toLowerCase();
    if (lowerUsername === 'admin') {
      return UserRole.ADMIN;
    }
    if (['никита', 'nikita'].includes(lowerUsername)) {
      return UserRole.NIKITA;
    }
    return UserRole.SURVIVOR;
  }
}
