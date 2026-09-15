export class Veterinarian {
  constructor(
    public readonly id: string,
    public readonly userId: string | null,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly licenseNumber: string,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly notes: string | null,
    public readonly isActive: boolean,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
