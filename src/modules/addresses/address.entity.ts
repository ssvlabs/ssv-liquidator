import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Address {
  @PrimaryColumn()
  ownerAddress: string;

  operatorPublicKeys: [];

  @Column({ default: null })
  burnRate: number;

  @Column({ default: null })
  liquidateAtBlock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
