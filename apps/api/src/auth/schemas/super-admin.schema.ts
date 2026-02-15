import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SuperAdminDocument = HydratedDocument<SuperAdmin>;

@Schema({ timestamps: true })
export class SuperAdmin {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ enum: ['super_admin'], default: 'super_admin' })
  role: 'super_admin';

  @Prop({ enum: ['active', 'disabled'], default: 'active' })
  status: 'active' | 'disabled';
}

export const SuperAdminSchema = SchemaFactory.createForClass(SuperAdmin);
