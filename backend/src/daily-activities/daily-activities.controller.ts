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
import {
  DailyActivityStatus,
  DailyActivityType,
  UserRole,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DailyActivitiesService } from './daily-activities.service';
import { CreateDailyActivityDto } from './dto/create-daily-activity.dto';
import { EditDailyActivityDto } from './dto/edit-daily-activity.dto';
import { RejectDailyActivityDto } from './dto/reject-daily-activity.dto';
import { UpdateDailyActivityProgressDto } from './dto/update-daily-activity-progress.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    username: string;
    role: UserRole;
  };
};

@Controller('daily-activities')
@UseGuards(JwtAuthGuard)
export class DailyActivitiesController {
  constructor(
    private readonly dailyActivitiesService: DailyActivitiesService,
  ) {}

  @Get()
  findAll(
    @Query('type') type?: DailyActivityType,
    @Query('status') status?: DailyActivityStatus,
  ) {
    return this.dailyActivitiesService.findAll(type, status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dailyActivitiesService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateDailyActivityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dailyActivitiesService.create(dto, request.user);
  }

  @Patch(':id')
  edit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditDailyActivityDto,
  ) {
    return this.dailyActivitiesService.edit(id, dto);
  }

  @Post(':id/progress')
  addProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: UpdateDailyActivityProgressDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dailyActivitiesService.addProgress(
      id,
      body,
      body.photoPaths,
      request.user,
    );
  }

  @Post(':id/request-close')
  requestClose(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dailyActivitiesService.requestClose(id, request.user);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dailyActivitiesService.approve(id, request.user);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDailyActivityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dailyActivitiesService.reject(id, dto.comment, request.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.dailyActivitiesService.remove(id);
  }
}
