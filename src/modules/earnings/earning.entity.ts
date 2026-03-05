import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class Earning {
  @PrimaryColumn()
  hash: string;

  @Column({ type: 'text', default: null })
  gasPrice: string;

  @Column({ default: null })
  gasUsed: number;

  @Column({ type: 'text', default: null })
  earned: string;

  @Column({ default: null })
  earnedAtBlock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
