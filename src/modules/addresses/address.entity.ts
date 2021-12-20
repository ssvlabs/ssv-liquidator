import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Address {
  @PrimaryColumn()
  ownerAddress: string;

  @Column({ default: null })
  burnRate: number;

  @Column({ default: false })
  isLiquidated: boolean;

  @Column({ default: null })
  liquidateAtBlock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
