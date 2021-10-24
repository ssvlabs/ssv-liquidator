import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ValidatorDocument = Validator & Document;

@Schema()
export class Validator {
  @Prop()
  ownerAddress: string;

  @Prop()
  publicKey: string;

  @Prop()
  operatorPublicKeys: string;

  @Prop()
  burnRate: number;

  @Prop({ type: Date })
  liquidateAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ValidatorSchema = SchemaFactory.createForClass(Validator);
