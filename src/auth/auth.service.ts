import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import {
  JwtPayload,
  JsonWebTokenError,
  Secret,
  TokenExpiredError,
  sign,
  verify,
} from 'jsonwebtoken';

import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../database/prisma.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthUser } from './interfaces/auth-user.interface';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

type RefreshPayload = AuthUser & JwtPayload;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: AuthCredentialsDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { login: dto.login },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('Login is already taken');
    }

    const passwordHash = await hash(dto.password, 10);

    await this.prisma.user.create({
      data: {
        login: dto.login,
        password: passwordHash,
        role: UserRole.VIEWER,
      },
    });

    return {
      message: 'User created successfully',
    };
  }

  async login(dto: AuthCredentialsDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (!user) {
      throw new ForbiddenException('Invalid login or password');
    }

    const passwordMatches = await compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new ForbiddenException('Invalid login or password');
    }

    return this.issueTokenPair({
      userId: user.id,
      login: user.login,
      role: user.role as UserRole,
    });
  }

  async refresh(refreshToken: unknown): Promise<TokenPair> {
    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      throw new UnauthorizedException('refreshToken is required');
    }

    const payload = this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user?.refreshTokenHash) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    const refreshMatches = await compare(refreshToken, user.refreshTokenHash);

    if (!refreshMatches) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    return this.issueTokenPair({
      userId: user.id,
      login: user.login,
      role: user.role as UserRole,
    });
  }

  async logout(refreshToken: unknown): Promise<{ message: string }> {
    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      throw new UnauthorizedException('refreshToken is required');
    }

    const payload = this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user?.refreshTokenHash) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    const refreshMatches = await compare(refreshToken, user.refreshTokenHash);

    if (!refreshMatches) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: null },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  verifyAccessToken(token: string): AuthUser {
    try {
      const payload = verify(token, this.getRequiredConfig('JWT_SECRET')) as AuthUser;

      return {
        userId: payload.userId,
        login: payload.login,
        role: payload.role,
      };
    } catch (error) {
      throw this.mapJwtError(error, 'Access token is invalid or expired');
    }
  }

  private verifyRefreshToken(token: string): RefreshPayload {
    try {
      return verify(
        token,
        this.getRequiredConfig('JWT_REFRESH_SECRET'),
      ) as RefreshPayload;
    } catch (error) {
      throw this.mapJwtError(error, 'Refresh token is invalid or expired', true);
    }
  }

  private async issueTokenPair(payload: AuthUser): Promise<TokenPair> {
    const accessToken = sign(payload, this.getRequiredConfig('JWT_SECRET') as Secret, {
      expiresIn: this.getRequiredConfig('JWT_ACCESS_TTL') as never,
    });
    const refreshToken = sign(
      payload,
      this.getRequiredConfig('JWT_REFRESH_SECRET') as Secret,
      {
        expiresIn: this.getRequiredConfig('JWT_REFRESH_TTL') as never,
      },
    );

    await this.prisma.user.update({
      where: { id: payload.userId },
      data: {
        refreshTokenHash: await hash(refreshToken, 10),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private mapJwtError(
    error: unknown,
    fallbackMessage: string,
    isRefresh = false,
  ): UnauthorizedException | ForbiddenException {
    const message =
      error instanceof TokenExpiredError
        ? `${isRefresh ? 'Refresh' : 'Access'} token has expired`
        : fallbackMessage;

    if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
      return isRefresh
        ? new ForbiddenException(message)
        : new UnauthorizedException(message);
    }

    return isRefresh
      ? new ForbiddenException(fallbackMessage)
      : new UnauthorizedException(fallbackMessage);
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }

    return value;
  }
}
