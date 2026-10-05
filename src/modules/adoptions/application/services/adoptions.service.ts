import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { ANIMAL_REPOSITORY, AnimalRepository } from '../../../animals/domain/repositories/animal.repository';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import {
  ADOPTION_REPOSITORY,
  AdoptionRepository,
} from '../../domain/repositories/adoption.repository';
import { AdoptionApplicationStatus } from '../../domain/enums/adoption-application-status.enum';
import { ApproveAdoptionDto } from '../../interfaces/dto/approve-adoption.dto';
import { CreateAdopterDto } from '../../interfaces/dto/create-adopter.dto';
import { CreateAdoptionApplicationDto } from '../../interfaces/dto/create-adoption-application.dto';
import { ListAdoptionsQueryDto } from '../../interfaces/dto/list-adoptions.query.dto';

@Injectable()
export class AdoptionsService {
  constructor(
    @Inject(ADOPTION_REPOSITORY)
    private readonly adoptionRepository: AdoptionRepository,
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createAdopter(dto: CreateAdopterDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();
    if (await this.adoptionRepository.findAdopterByEmail(email)) {
      throw new ResourceConflictException(
        'An adopter with this email already exists.',
        'ADOPTER_EMAIL_ALREADY_EXISTS',
      );
    }
    const adopter = await this.adoptionRepository.createAdopter({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      phone: dto.phone.trim(),
      address: dto.address?.trim() || null,
    });
    if (!adopter) {
      throw new ResourceConflictException(
        'An adopter with this email already exists.',
        'ADOPTER_EMAIL_ALREADY_EXISTS',
      );
    }
    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.ADOPTER_CREATE,
      resourceType: AuditResourceType.ADOPTER,
      resourceId: adopter.id,
      metadata: { email: adopter.email },
    });
    return adopter;
  }

  async getAdopter(id: string) {
    const adopter = await this.adoptionRepository.findAdopterById(id);
    if (!adopter) throw new ResourceNotFoundException('Adopter', id);
    return adopter;
  }

  async createApplication(
    animalId: string,
    dto: CreateAdoptionApplicationDto,
    actorId: string,
  ) {
    const animal = await this.animalRepository.findById(animalId);
    if (!animal) throw new ResourceNotFoundException('Animal', animalId);
    if (animal.status !== AnimalStatus.AVAILABLE_FOR_ADOPTION) {
      throw new ResourceConflictException(
        'The animal is not available for adoption.',
        'ANIMAL_NOT_AVAILABLE_FOR_ADOPTION',
      );
    }
    if (!(await this.adoptionRepository.findAdopterById(dto.adopterId))) {
      throw new ResourceNotFoundException('Adopter', dto.adopterId);
    }
    const submittedAt = dto.submittedAt ? new Date(dto.submittedAt) : new Date();
    this.assertDateNotFuture(submittedAt, 'SUBMITTED_AT_IN_FUTURE');
    if (submittedAt.getTime() < animal.intakeDate.getTime()) {
      throw new BadRequestException({
        code: 'SUBMITTED_AT_BEFORE_INTAKE',
        message: 'The application date cannot be before the animal intake date.',
      });
    }
    const application = await this.adoptionRepository.createApplication({
      animalId,
      adopterId: dto.adopterId,
      submittedAt,
      createdByUserId: actorId,
    });
    if (!application) {
      throw new ResourceConflictException(
        'A pending application already exists for this adopter and animal.',
        'ADOPTION_APPLICATION_ALREADY_EXISTS',
      );
    }
    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.ADOPTION_APPLICATION_CREATE,
      resourceType: AuditResourceType.ADOPTION_APPLICATION,
      resourceId: application.id,
      metadata: { animalId, adopterId: dto.adopterId },
    });
    return application;
  }

  async listApplications(animalId: string, query: ListAdoptionsQueryDto) {
    await this.assertAnimalExists(animalId);
    return this.adoptionRepository.listApplicationsByAnimal(animalId, query);
  }

  async approve(applicationId: string, dto: ApproveAdoptionDto, actorId: string) {
    const application = await this.adoptionRepository.findApplicationById(applicationId);
    if (!application) throw new ResourceNotFoundException('Adoption application', applicationId);
    if (application.status !== AdoptionApplicationStatus.PENDING) {
      throw new ResourceConflictException(
        'The adoption application is not pending.',
        'ADOPTION_APPLICATION_NOT_PENDING',
      );
    }
    const adoptedAt = dto.adoptedAt ? new Date(dto.adoptedAt) : new Date();
    this.assertDateNotFuture(adoptedAt, 'ADOPTED_AT_IN_FUTURE');
    if (adoptedAt.getTime() < application.submittedAt.getTime()) {
      throw new BadRequestException({
        code: 'ADOPTED_AT_BEFORE_APPLICATION',
        message: 'The adoption date cannot be before the application date.',
      });
    }
    const result = await this.adoptionRepository.completeAdoption(
      applicationId,
      adoptedAt,
      actorId,
    );
    if (result.status === 'application_not_found' || result.status === 'animal_not_found') {
      throw new ResourceNotFoundException(
        result.status === 'application_not_found' ? 'Adoption application' : 'Animal',
        applicationId,
      );
    }
    if (result.status === 'application_not_pending') {
      throw new ResourceConflictException(
        'The adoption application is not pending.',
        'ADOPTION_APPLICATION_NOT_PENDING',
      );
    }
    if (result.status === 'animal_not_available') {
      throw new ResourceConflictException(
        'The animal is not available for adoption.',
        'ANIMAL_NOT_AVAILABLE_FOR_ADOPTION',
      );
    }
    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.ADOPTION_COMPLETE,
      resourceType: AuditResourceType.ADOPTION,
      resourceId: result.adoption.id,
      metadata: {
        animalId: result.adoption.animalId,
        adopterId: result.adoption.adopterId,
        applicationId,
      },
    });
    return result.adoption;
  }

  async listAdoptions(animalId: string, query: ListAdoptionsQueryDto) {
    await this.assertAnimalExists(animalId);
    return this.adoptionRepository.listAdoptionsByAnimal(animalId, query);
  }

  private async assertAnimalExists(animalId: string): Promise<void> {
    if (!(await this.animalRepository.findById(animalId))) {
      throw new ResourceNotFoundException('Animal', animalId);
    }
  }

  private assertDateNotFuture(value: Date, code: string): void {
    if (value.getTime() > Date.now()) {
      throw new BadRequestException({ code, message: 'The date cannot be in the future.' });
    }
  }
}
