export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly familyId: string,
    public readonly tokenHash: string,
    public readonly expiresAt: Date,
    public readonly revokedAt: Date | null,
    public readonly replacedById: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}