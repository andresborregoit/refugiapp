import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalsModule } from '../animals/animals.module';
import { MediaModule } from '../media/media.module';
import { MediaAssetOrmEntity } from '../media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { VeterinariansModule } from '../veterinarians/veterinarians.module';
import { MedicalRecordsService } from './application/services/medical-records.service';
import { MEDICAL_RECORD_REPOSITORY } from './domain/repositories/medical-record.repository';
import { MedicalRecordOrmEntity } from './infrastructure/persistence/typeorm/entities/medical-record.orm-entity';
import { TypeOrmMedicalRecordRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-medical-record.repository';
import { MedicalRecordsController } from './interfaces/controllers/medical-records.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalRecordOrmEntity, MediaAssetOrmEntity]),
    AnimalsModule,
    VeterinariansModule,
    MediaModule,
  ],
  controllers: [MedicalRecordsController],
  providers: [
    MedicalRecordsService,
    {
      provide: MEDICAL_RECORD_REPOSITORY,
      useClass: TypeOrmMedicalRecordRepository,
    },
  ],
  exports: [MedicalRecordsService, MEDICAL_RECORD_REPOSITORY],
})
export class MedicalRecordsModule {}
