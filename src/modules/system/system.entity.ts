import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class System {
  @PrimaryColumn()
  type: string;

  @Column()
  payload: string;
}
