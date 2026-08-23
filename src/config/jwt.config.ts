import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  issuer: process.env.JWT_ISSUER ?? 'refugiapp-api',
  audience: process.env.JWT_AUDIENCE ?? 'refugiapp-mobile',
}));
