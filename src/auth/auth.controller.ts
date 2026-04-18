import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from './decorators/public.decorator';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiCreatedResponse({
    schema: {
      example: {
        message: 'User created successfully',
      },
    },
  })
  signup(@Body() dto: AuthCredentialsDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: 'jwt_access_token',
        refreshToken: 'jwt_refresh_token',
      },
    },
  })
  login(@Body() dto: AuthCredentialsDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: 'jwt_access_token',
        refreshToken: 'jwt_refresh_token',
      },
    },
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
