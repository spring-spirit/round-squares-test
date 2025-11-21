export interface RoundDetailsDto {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  totalScore: number;
  status: 'cooldown' | 'active' | 'finished';
  myScore: number;
  myTaps: number;
  winner?: {
    username: string;
    score: number;
  };
}
