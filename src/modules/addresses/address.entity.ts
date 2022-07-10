import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class Address {
  @PrimaryColumn()
  ownerAddress: string;

  @Column('int', { array: true })
  operatorIds: number[];

  @Column({ default: null })
  burnRate: number;

  @Column({ default: null })
  balance: number;

  @Column({ default: false })
  isLiquidated: boolean;

  @Column({ default: null })
  liquidateLastBlock: number;

  @Column({ default: null })
  liquidateFirstBlock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
