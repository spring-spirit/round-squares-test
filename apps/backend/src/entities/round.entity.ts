import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoundParticipant } from './round-participant.entity';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'int', default: 0 })
  totalScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => RoundParticipant, (participant) => participant.round)
  participants: RoundParticipant[];
}
