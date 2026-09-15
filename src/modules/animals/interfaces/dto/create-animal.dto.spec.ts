import { validate } from 'class-validator';
import { CreateAnimalDto } from './create-animal.dto';

describe('CreateAnimalDto', () => {
  function createDto(overrides: Partial<CreateAnimalDto> = {}): CreateAnimalDto {
    return Object.assign(new CreateAnimalDto(), {
      name: 'Luna',
      species: 'dog',
      intakeDate: '2026-01-10',
      ...overrides,
    });
  }

  it('accepts an optional breed', async () => {
    const errors = await validate(createDto({ breed: 'mixed' }));

    expect(errors).toHaveLength(0);
  });

  it('accepts birthDate when it is on or before intakeDate', async () => {
    const errors = await validate(createDto({ birthDate: '2026-01-10' }));

    expect(errors).toHaveLength(0);
  });

  it('rejects birthDate when it is after intakeDate', async () => {
    const errors = await validate(createDto({ birthDate: '2026-01-11' }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'birthDate',
          constraints: expect.objectContaining({
            isDateOnOrBefore: 'birthDate must be on or before intakeDate',
          }),
        }),
      ]),
    );
  });
});
