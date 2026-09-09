export class CreateVeterinarian {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly licenseNumber: string,
    public readonly userId: string | null = null,
    public readonly email: string | null = null,
    public readonly phone: string | null = null,
    public readonly notes: string | null = null,
  ) {}
}
