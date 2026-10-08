import { Model } from 'mongoose';
import { ConflictError } from '../../common/errors/domain.errors';
import type { User } from '../domain/user.entity';
import type {
  CreateUserData,
  UserRepositoryPort,
} from '../domain/user.repository.port';
import type { UserDocument } from './user.schema';

const DUPLICATE_KEY = 11000;

export class UserMongooseRepository implements UserRepositoryPort {
  constructor(private readonly userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel.findOne({ email }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      const doc = await this.userModel.create(data);
      return this.toDomain(doc);
    } catch (error) {
      // The unique index is the source of truth: it also covers the race
      // between the "exists?" check in the use case and the insert.
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConflictError('Email already in use');
      }
      throw error;
    }
  }

  private toDomain(doc: UserDocument): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      password: doc.password,
      role: doc.role,
    };
  }
}
