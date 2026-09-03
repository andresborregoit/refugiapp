import { User } from '../entities/user.entity';
import { CreateUserRepositoryInput } from './create-user.repository-input';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserRepositoryInput): Promise<User>;
  activate(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}
