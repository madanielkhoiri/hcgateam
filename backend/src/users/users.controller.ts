import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

type AuthRequest = {
  user: {
    id: number;
    role: UserRole;
    username?: string;
    nama?: string;
  };
};

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('access-options')
  getAccessOptions(@Req() request: AuthRequest) {
    return this.usersService.getAccessCatalog(request.user);
  }

  @Get()
  findAll(@Req() request: AuthRequest, @Query('search') search?: string) {
    return this.usersService.findAll(request.user, search);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.usersService.findOneForAdmin(id, request.user);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() request: AuthRequest) {
    return this.usersService.create(dto, request.user);
  }

  @Patch(':id/access')
  updateAccess(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserAccessDto,
    @Req() request: AuthRequest,
  ) {
    return this.usersService.updateAccess(id, dto, request.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() request: AuthRequest,
  ) {
    return this.usersService.update(id, dto, request.user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.usersService.remove(id, request.user);
  }
}
