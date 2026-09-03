import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { verifyPassword } from '../../../../common/security/password-hasher';
import { UsersService } from '../../../users/application/services/users.service';
import { JwtPayload } from '../../domain/interfaces/jwt-payload.interface';
import { AuthResponseDto } from '../../interfaces/dto/auth-response.dto';
import { LoginDto } from '../../interfaces/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findCredentialsByEmail(email);

    if (!user?.isActive) {
      throw this.invalidCredentials();
    }

    const passwordMatches = await verifyPassword(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw this.invalidCredentials();
    }

    return this.issueAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
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

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException('Invalid email or password.');
  }
}
