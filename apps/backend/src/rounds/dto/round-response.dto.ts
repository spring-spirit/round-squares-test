import { ApiProperty } from '@nestjs/swagger';

export class RoundResponseDto {
  @ApiProperty({ example: 'uuid-here' })
  id: string;

  @ApiProperty({ example: '2025-05-18T06:28:17.000Z' })
  startDate: string;

  @ApiProperty({ example: '2025-05-18T06:29:17.000Z' })
  endDate: string;

  @ApiProperty({ example: '2025-05-18T06:27:17.000Z' })
  createdAt: string;

  @ApiProperty({ example: 12345 })
  totalScore: number;

  @ApiProperty({ example: 'active', enum: ['cooldown', 'active', 'finished'] })
  status: string;
}

export class RoundDetailsResponseDto extends RoundResponseDto {
  @ApiProperty({ example: 123 })
  myScore: number;

  @ApiProperty({ example: 15 })
  myTaps: number;

  @ApiProperty({
    example: { username: 'Ivan', score: 100500 },
    required: false,
  })
  winner?: {
    username: string;
    score: number;
  };
}

export class TapResponseDto {
  @ApiProperty({ example: 123 })
  score: number;

  @ApiProperty({ example: 15 })
  taps: number;
}
