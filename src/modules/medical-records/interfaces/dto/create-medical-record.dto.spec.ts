import { validate } from 'class-validator';
import { MedicalRecordType } from '../../domain/enums/medical-record-type.enum';
import { CreateMedicalRecordDto } from './create-medical-record.dto';

describe('CreateMedicalRecordDto', () => {
  function createDto(
    overrides: Partial<CreateMedicalRecordDto> = {},
  ): CreateMedicalRecordDto {
    return Object.assign(new CreateMedicalRecordDto(), {
      animalId: '11111111-1111-4111-8111-111111111111',
      recordType: MedicalRecordType.CONSULTATION,
      title: 'Annual checkup',
      occurredAt: '2026-03-10T10:00:00.000Z',
      ...overrides,
    });
  }

  it('accepts a valid minimal DTO', async () => {
    const errors = await validate(createDto());

    expect(errors).toHaveLength(0);
  });

  it('accepts all optional fields populated', async () => {
    const errors = await validate(
      createDto({
        veterinarianId: '22222222-2222-4222-8222-222222222222',
        diagnosis: 'Healthy',
        treatment: 'None',
        notes: 'No issues',
        attachmentMediaIds: ['33333333-3333-4333-8333-333333333333'],
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid recordType', async () => {
    const errors = await validate(createDto({ recordType: 'invalid_type' as MedicalRecordType }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'recordType',
          constraints: expect.objectContaining({ isEnum: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects an empty title', async () => {
    const errors = await validate(createDto({ title: '' }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'title',
        }),
      ]),
    );
  });

  it('rejects a title shorter than 3 characters', async () => {
    const errors = await validate(createDto({ title: 'AB' }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'title',
          constraints: expect.objectContaining({ minLength: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects a title exceeding 160 characters', async () => {
    const errors = await validate(createDto({ title: 'a'.repeat(161) }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'title',
          constraints: expect.objectContaining({ maxLength: expect.any(String) }),
        }),
      ]),
    );
  });

  it('accepts a title at the max length', async () => {
    const errors = await validate(createDto({ title: 'a'.repeat(160) }));

    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid date format', async () => {
    const errors = await validate(createDto({ occurredAt: 'not-a-date' }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'occurredAt',
          constraints: expect.objectContaining({ isDateString: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects an invalid animalId', async () => {
    const errors = await validate(createDto({ animalId: 'not-a-uuid' }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'animalId',
          constraints: expect.objectContaining({ isUuid: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects an invalid veterinarianId', async () => {
    const errors = await validate(createDto({ veterinarianId: 'not-a-uuid' }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'veterinarianId',
          constraints: expect.objectContaining({ isUuid: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects attachmentMediaIds exceeding 10 items', async () => {
    const ids = Array.from({ length: 11 }, (_, i) =>
      `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
    );
    const errors = await validate(createDto({ attachmentMediaIds: ids }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'attachmentMediaIds',
          constraints: expect.objectContaining({ arrayMaxSize: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects non-UUID attachmentMediaIds', async () => {
    const errors = await validate(createDto({ attachmentMediaIds: ['not-a-uuid'] }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'attachmentMediaIds',
        }),
      ]),
    );
  });
});
