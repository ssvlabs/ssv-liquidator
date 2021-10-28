import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Address {
  @PrimaryColumn()
  ownerAddress: string;

  operatorPublicKeys: [];

  @Column({ default: null })
  burnRate: number;

  @Column({ type: 'date', default: null })
  liquidateAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
