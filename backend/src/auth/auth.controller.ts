// ==================================================
// FILE: backend/src/auth/auth.controller.ts
// FUNGSI: Endpoint login dan akun pengguna
// ==================================================

import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    username: string;
    role: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================================================
  // POST /api/auth/login
  // ==================================================

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // ==================================================
  // GET /api/auth/profile
  // ==================================================

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.id);
  }

  // ==================================================
  // PATCH /api/auth/profile
  // ==================================================

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(request.user.id, updateProfileDto);
  }

  // ==================================================
  // PATCH /api/auth/change-password
  // ==================================================

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(request.user.id, changePasswordDto);
  }
}

// ==================================================
// SELESAI: backend/src/auth/auth.controller.ts
// ==================================================
