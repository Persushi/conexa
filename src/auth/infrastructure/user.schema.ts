import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../domain/role.enum';

export type UserDocument = HydratedDocument<UserSchemaClass>;

@Schema({ collection: 'users', timestamps: true })
export class UserSchemaClass {
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({
    type: String,
    enum: Object.values(Role),
    default: Role.USER,
    required: true,
  })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(UserSchemaClass);
