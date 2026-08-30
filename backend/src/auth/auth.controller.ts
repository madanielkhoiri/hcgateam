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
import { Throttle } from '@nestjs/throttler';
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

  // Percobaan login dibatasi ketat per (IP + username) — lihat HcgaThrottlerGuard.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() request: Request) {
    const ip = (request.ips?.length ? request.ips[0] : request.ip) ?? undefined;
    return this.authService.login(loginDto, ip);
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
