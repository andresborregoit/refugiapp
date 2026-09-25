import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpeciesService } from './application/services/species.service';
import { BREED_REPOSITORY } from './domain/repositories/breed.repository';
import { SPECIES_REPOSITORY } from './domain/repositories/species.repository';
import { BreedOrmEntity } from './infrastructure/persistence/typeorm/entities/breed.orm-entity';
import { SpeciesOrmEntity } from './infrastructure/persistence/typeorm/entities/species.orm-entity';
import { TypeOrmBreedRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-breed.repository';
import { TypeOrmSpeciesRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-species.repository';
import { SpeciesController } from './interfaces/controllers/species.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpeciesOrmEntity, BreedOrmEntity])],
  controllers: [SpeciesController],
  providers: [
    SpeciesService,
    {
      provide: SPECIES_REPOSITORY,
      useClass: TypeOrmSpeciesRepository,
    },
    {
      provide: BREED_REPOSITORY,
      useClass: TypeOrmBreedRepository,
    },
  ],
})
export class SpeciesModule {}