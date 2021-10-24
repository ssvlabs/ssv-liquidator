import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type SystemDocument = System & mongoose.Document;

@Schema({ collection: 'system' })
export class System {
  @Prop({ type: mongoose.SchemaTypes.Mixed, default: {} })
  payload: any;

  @Prop()
  type: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SystemSchema = SchemaFactory.createForClass(System);
