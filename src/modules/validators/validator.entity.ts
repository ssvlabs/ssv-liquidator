import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Validator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerAddress: string;

  @Column()
  publicKey: string;

  @Column()
  operatorPublicKeys: string;

  @Column()
  burnRate: number;

  @Column({ type: 'date' })
  liquidateAt: Date;

  @Column({ type: 'date' })
  createdAt: Date;
}
