import { CreateUserCredentials } from '../entities/create-user-credentials.entity';
import { User } from '../entities/user.entity';
import { UserCredentials } from '../entities/user-credentials.entity';

export interface UserListQuery {
  page: number;
  limit: number;
}

export interface PaginatedUsers {
  items: User[];
  page: number;
  limit: number;
  total: number;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  findMany(query: UserListQuery): Promise<PaginatedUsers>;
  create(input: CreateUserCredentials): Promise<User>;
  softDelete(id: string): Promise<void>;
  activate(id: string): Promise<User | null>;
}
