import { AnimalSex } from '../enums/animal-sex.enum';
import { AnimalStatus } from '../enums/animal-status.enum';
import { Animal } from './animal.entity';

describe('Animal', () => {
  it('stores the breed when it is known', () => {
    const animal = new Animal(
      'animal-id',
      'Luna',
      'dog',
      'mixed',
      AnimalSex.FEMALE,
      AnimalStatus.ADMITTED,
      new Date('2026-01-01'),
    );

    expect(animal.breed).toBe('mixed');
  });

  it('allows a null breed when it is unknown', () => {
    const animal = new Animal(
      'animal-id',
      'Luna',
      'dog',
      null,
      AnimalSex.FEMALE,
      AnimalStatus.ADMITTED,
      new Date('2026-01-01'),
    );

    expect(animal.breed).toBeNull();
  });
});
