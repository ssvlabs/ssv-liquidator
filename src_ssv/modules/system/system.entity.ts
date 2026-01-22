import { Entity, Column, PrimaryColumn } from 'typeorm';
import { SystemType } from './system.service';

@Entity()
export class System {
  @PrimaryColumn({ enum: SystemType })
  type: SystemType;

  @Column()
  payload: string;
}
