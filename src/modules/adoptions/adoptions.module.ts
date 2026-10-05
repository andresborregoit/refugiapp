import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalsModule } from '../animals/animals.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdoptionsService } from './application/services/adoptions.service';
import { ADOPTION_REPOSITORY } from './domain/repositories/adoption.repository';
import { AdopterOrmEntity } from './infrastructure/persistence/typeorm/entities/adopter.orm-entity';
import { AdoptionApplicationOrmEntity } from './infrastructure/persistence/typeorm/entities/adoption-application.orm-entity';
import { AdoptionOrmEntity } from './infrastructure/persistence/typeorm/entities/adoption.orm-entity';
import { TypeOrmAdoptionRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-adoption.repository';
import { AdoptersController } from './interfaces/controllers/adopters.controller';
import { AdoptionsController } from './interfaces/controllers/adoptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdopterOrmEntity,
      AdoptionApplicationOrmEntity,
      AdoptionOrmEntity,
    ]),
    AnimalsModule,
    AuditLogsModule,
  ],
  controllers: [AdoptersController, AdoptionsController],
  providers: [
    AdoptionsService,
    { provide: ADOPTION_REPOSITORY, useClass: TypeOrmAdoptionRepository },
  ],
  exports: [AdoptionsService, ADOPTION_REPOSITORY],
})
export class AdoptionsModule {}
