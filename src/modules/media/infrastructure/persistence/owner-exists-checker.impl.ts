import { Inject, Injectable } from '@nestjs/common';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { OwnerExistsChecker } from '../../domain/repositories/owner-exists-checker';
import { ANIMAL_REPOSITORY, AnimalRepository } from '../../../animals/domain/repositories/animal.repository';
import { EXPENSE_REPOSITORY, ExpenseRepository } from '../../../expenses/domain/repositories/expense.repository';
import { MEDICAL_RECORD_REPOSITORY, MedicalRecordRepository } from '../../../medical-records/domain/repositories/medical-record.repository';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/repositories/user.repository';
import { VETERINARIAN_REPOSITORY, VeterinarianRepository } from '../../../veterinarians/domain/repositories/veterinarian.repository';

@Injectable()
export class OwnerExistsCheckerImpl implements OwnerExistsChecker {
  constructor(
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: ExpenseRepository,
    @Inject(MEDICAL_RECORD_REPOSITORY)
    private readonly medicalRecordRepository: MedicalRecordRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(VETERINARIAN_REPOSITORY)
    private readonly veterinarianRepository: VeterinarianRepository,
  ) {}

  async exists(ownerType: MediaOwnerType, ownerId: string): Promise<boolean> {
    switch (ownerType) {
      case MediaOwnerType.ANIMAL: {
        const animal = await this.animalRepository.findById(ownerId);
        return animal !== null;
      }
      case MediaOwnerType.EXPENSE_TICKET: {
        const expense = await this.expenseRepository.findById(ownerId);
        return expense !== null;
      }
      case MediaOwnerType.MEDICAL_RECORD: {
        const medicalRecord = await this.medicalRecordRepository.findById(ownerId);
        return medicalRecord !== null;
      }
      case MediaOwnerType.USER: {
        const user = await this.userRepository.findById(ownerId);
        return user !== null;
      }
      case MediaOwnerType.VETERINARIAN: {
        const veterinarian = await this.veterinarianRepository.findById(ownerId);
        return veterinarian !== null;
      }
      default:
        return false;
    }
  }
}
