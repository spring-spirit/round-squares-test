export interface User {
  id: string;
  username: string;
  role: 'survivor' | 'admin' | 'nikita';
}

export interface Round {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  totalScore: number;
  status: 'cooldown' | 'active' | 'finished';
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
