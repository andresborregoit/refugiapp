import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalRecordsService } from './application/services/medical-records.service';
import { MEDICAL_RECORD_REPOSITORY } from './domain/repositories/medical-record.repository';
import { MedicalRecordOrmEntity } from './infrastructure/persistence/typeorm/entities/medical-record.orm-entity';
import { TypeOrmMedicalRecordRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-medical-record.repository';
import { MedicalRecordsController } from './interfaces/controllers/medical-records.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecordOrmEntity])],
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
