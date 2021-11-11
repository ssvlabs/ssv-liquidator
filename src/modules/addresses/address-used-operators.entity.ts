import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AddressUsedOperators {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerAddress: string;

  @Column()
  operatorPublicKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
