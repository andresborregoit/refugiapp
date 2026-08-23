import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { JwtPayload } from '../../domain/interfaces/jwt-payload.interface';
import { AuthResponseDto } from '../../interfaces/dto/auth-response.dto';
import { LoginDto } from '../../interfaces/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(_dto: LoginDto): Promise<AuthResponseDto> {
    throw new NotImplementedException(
      'Credential validation and password hashing will be implemented in the next stage.',
    );
  }

  issueAccessToken(user: AuthenticatedUser): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('jwt.expiresIn', '1d'),
    };
  }
}
