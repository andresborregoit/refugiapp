export class CreateVeterinarianUser {
  constructor(
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly firstName: string,
    public readonly lastName: string,
  ) {}
}