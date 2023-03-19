import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
@Index(['owner', 'operatorIds'], { unique: true })
export class Cluster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  owner: string;

  @Column('int', { array: true })
  operatorIds: number[];

  @Column({ type: 'text' })
  cluster: string;

  @Column({ default: null })
  burnRate: number;

  @Column({ default: null })
  balance: number;

  @Column({ default: false })
  isLiquidated: boolean;

  @Column({ default: null })
  balanceToBlockNumber: number;

  @Column({ default: null })
  liquidationBlockNumber: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
