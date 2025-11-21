import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Round } from './round.entity';

@Entity('round_participants')
@Unique(['roundId', 'userId'])
export class RoundParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  roundId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'int', default: 0 })
  taps: number;

  @Column({ type: 'int', default: 0 })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Round, (round) => round.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roundId' })
  round: Round;

  @ManyToOne(() => User, (user) => user.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
