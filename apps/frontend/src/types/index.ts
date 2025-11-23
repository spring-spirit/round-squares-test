import { UserRole, RoundStatus } from './enums';

export { UserRole, RoundStatus };

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface Round {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  totalScore: number;
  status: RoundStatus;
  winner?: {
    username: string;
    score: number;
  };
  myScore?: number;
}

export interface RoundDetails extends Round {
  myScore: number;
  myTaps?: number;
}

export interface TapResponse {
  score: number;
  taps: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
