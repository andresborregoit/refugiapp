import { validate } from 'class-validator';
import { CreateAdopterDto } from './create-adopter.dto';

describe('CreateAdopterDto', () => {
  const valid = (): CreateAdopterDto =>
    Object.assign(new CreateAdopterDto(), {
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana@example.com',
      phone: '+5491123456789',
      address: 'Calle 123',
    });

  it('accepts valid contact data', async () => {
    await expect(validate(valid())).resolves.toHaveLength(0);
  });

  it.each([
    ['email', 'not-an-email'],
    ['phone', '123'],
    ['phone', '+00123456789'],
    ['firstName', ''],
    ['lastName', ''],
  ] as const)('rejects invalid %s', async (field, value) => {
    const dto = valid();
    Object.assign(dto, { [field]: value });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
