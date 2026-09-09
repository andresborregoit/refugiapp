import { validate } from 'class-validator';
import { ExpenseCategory } from '../../domain/enums/expense-category.enum';
import { CreateExpenseDto } from './create-expense.dto';

describe('CreateExpenseDto', () => {
  function createDto(overrides: Partial<CreateExpenseDto> = {}): CreateExpenseDto {
    return Object.assign(new CreateExpenseDto(), {
      animalId: '11111111-1111-4111-8111-111111111111',
      category: ExpenseCategory.MEDICINE,
      amountCents: 1000,
      currency: 'ARS',
      description: 'Antibiotics',
      incurredAt: '2026-03-10T10:00:00.000Z',
      ...overrides,
    });
  }

  it('accepts zero amountCents', async () => {
    const errors = await validate(createDto({ amountCents: 0 }));

    expect(errors).toHaveLength(0);
  });

  it('accepts positive amountCents', async () => {
    const errors = await validate(createDto({ amountCents: 1 }));

    expect(errors).toHaveLength(0);
  });

  it('rejects negative amountCents', async () => {
    const errors = await validate(createDto({ amountCents: -1 }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'amountCents',
          constraints: expect.objectContaining({ min: expect.any(String) }),
        }),
      ]),
    );
  });
});
