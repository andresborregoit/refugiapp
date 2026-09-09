import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { AnimalHistoryEventsService } from './application/services/animal-history-events.service';
import { AnimalsService } from './application/services/animals.service';
import { ANIMAL_HISTORY_EVENT_REPOSITORY } from './domain/repositories/animal-history-event.repository';
import { ANIMAL_REPOSITORY } from './domain/repositories/animal.repository';
import { AnimalHistoryEventOrmEntity } from './infrastructure/persistence/typeorm/entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from './infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { TypeOrmAnimalHistoryEventRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-animal-history-event.repository';
import { TypeOrmAnimalRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-animal.repository';
import { AnimalHistoryEventsController } from './interfaces/controllers/animal-history-events.controller';
import { AnimalsController } from './interfaces/controllers/animals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnimalOrmEntity, AnimalHistoryEventOrmEntity]), MediaModule],
  controllers: [AnimalsController, AnimalHistoryEventsController],
  providers: [
    AnimalsService,
    AnimalHistoryEventsService,
    {
      provide: ANIMAL_REPOSITORY,
      useClass: TypeOrmAnimalRepository,
    },
    {
      provide: ANIMAL_HISTORY_EVENT_REPOSITORY,
      useClass: TypeOrmAnimalHistoryEventRepository,
    },
  ],
  exports: [AnimalsService, AnimalHistoryEventsService, ANIMAL_REPOSITORY, ANIMAL_HISTORY_EVENT_REPOSITORY],
})
export class AnimalsModule {}
