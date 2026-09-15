import { validate } from 'class-validator';
import { AnimalHistoryEventType } from '../../domain/enums/animal-history-event-type.enum';
import { MANUAL_ANIMAL_HISTORY_EVENT_TYPES } from '../../domain/enums/animal-history-event-type.enum';
import { CreateAnimalHistoryEventDto } from './create-animal-history-event.dto';

describe('CreateAnimalHistoryEventDto', () => {
  function createDto(
    overrides: Partial<CreateAnimalHistoryEventDto> = {},
  ): CreateAnimalHistoryEventDto {
    return Object.assign(new CreateAnimalHistoryEventDto(), {
      eventType: AnimalHistoryEventType.GENERAL_NOTE,
      description: 'Moved to foster home.',
      ...overrides,
    });
  }

  it('accepts a valid general_note event', async () => {
    const errors = await validate(createDto());

    expect(errors).toHaveLength(0);
  });

  it('accepts all manual event types', async () => {
    for (const eventType of MANUAL_ANIMAL_HISTORY_EVENT_TYPES) {
      const errors = await validate(createDto({ eventType }));

      expect(errors).toHaveLength(0);
    }
  });

  it('rejects the intake event type', async () => {
    const errors = await validate(createDto({ eventType: AnimalHistoryEventType.INTAKE }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'eventType',
          constraints: expect.objectContaining({ isIn: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects the status_change event type', async () => {
    const errors = await validate(createDto({ eventType: AnimalHistoryEventType.STATUS_CHANGE }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'eventType',
          constraints: expect.objectContaining({ isIn: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects the adoption event type', async () => {
    const errors = await validate(createDto({ eventType: AnimalHistoryEventType.ADOPTION }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'eventType',
          constraints: expect.objectContaining({ isIn: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects an empty description', async () => {
    const errors = await validate(createDto({ description: '' }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'description',
        }),
      ]),
    );
  });

  it('accepts a description at the max length', async () => {
    const errors = await validate(createDto({ description: 'a'.repeat(1000) }));

    expect(errors).toHaveLength(0);
  });

  it('rejects a description exceeding max length', async () => {
    const errors = await validate(createDto({ description: 'a'.repeat(1001) }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'description',
          constraints: expect.objectContaining({ maxLength: expect.any(String) }),
        }),
      ]),
    );
  });
});
