import { Round } from 'src/entities/round.entity';
import { RoundStatus } from './round-status.enum';

export interface RoundDetailsResponse {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  totalScore: number;
  status: RoundStatus;
  myScore: number;
  myTaps: number;
  winner?: {
    username: string;
    score: number;
  };
}

export interface TapResponse {
  score: number;
  taps: number;
}

export interface PaginatedRoundsResponse {
  data: Round[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
