import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto, UserResponseDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(
      loginDto.username,
      loginDto.password,
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Current user info',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    });
    return { message: 'Logged out successfully' };
  }
}
