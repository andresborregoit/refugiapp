export class UpdateVeterinarian {
  constructor(
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly licenseNumber?: string,
    public readonly userId?: string | null,
    public readonly email?: string | null,
    public readonly phone?: string | null,
    public readonly notes?: string | null,
  ) {}
}
