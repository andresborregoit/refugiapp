export class Veterinarian {
  constructor(
    public readonly id: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly licenseNumber: string,
    public readonly isActive: boolean,
  ) {}
}
