import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { VeterinariansService } from './application/services/veterinarians.service';
import { VETERINARIAN_REPOSITORY } from './domain/repositories/veterinarian.repository';
import { VeterinarianOrmEntity } from './infrastructure/persistence/typeorm/entities/veterinarian.orm-entity';
import { TypeOrmVeterinarianRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-veterinarian.repository';
import { VeterinariansController } from './interfaces/controllers/veterinarians.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VeterinarianOrmEntity]), UsersModule],
  controllers: [VeterinariansController],
  providers: [
    VeterinariansService,
    {
      provide: VETERINARIAN_REPOSITORY,
      useClass: TypeOrmVeterinarianRepository,
    },
  ],
  exports: [VeterinariansService, VETERINARIAN_REPOSITORY],
})
export class VeterinariansModule {}
