import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalsService } from './application/services/animals.service';
import { ANIMAL_REPOSITORY } from './domain/repositories/animal.repository';
import { AnimalHistoryEventOrmEntity } from './infrastructure/persistence/typeorm/entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from './infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { TypeOrmAnimalRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-animal.repository';
import { AnimalsController } from './interfaces/controllers/animals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnimalOrmEntity, AnimalHistoryEventOrmEntity])],
  controllers: [AnimalsController],
  providers: [
    AnimalsService,
    {
      provide: ANIMAL_REPOSITORY,
      useClass: TypeOrmAnimalRepository,
    },
  ],
  exports: [AnimalsService, ANIMAL_REPOSITORY],
})
export class AnimalsModule {}
