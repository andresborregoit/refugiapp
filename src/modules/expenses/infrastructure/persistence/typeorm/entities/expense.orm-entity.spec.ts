import { getMetadataArgsStorage } from 'typeorm';
import { ExpenseOrmEntity } from './expense.orm-entity';

describe('ExpenseOrmEntity', () => {
  it('declares a non-negative amountCents check constraint', () => {
    const check = getMetadataArgsStorage().checks.find(
      ({ target, name }) =>
        target === ExpenseOrmEntity &&
        name === 'CHK_expenses_amountCents_non_negative',
    );

    expect(check).toBeDefined();
    expect(check?.expression).toBe('"amountCents" >= 0');
  });
});
