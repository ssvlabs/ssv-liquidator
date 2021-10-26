import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class System {
  @PrimaryColumn()
  payload: string;

  @Column()
  type: string;
}
