import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { SaveMiningPackMealDto } from './dto/save-mining-pack-meal.dto';
import { UserRole } from '@prisma/client';
import { OrderPackMealMiningService } from './order-pack-meal-mining.service';

type MiningRequest = { user: { id: number; role: UserRole } };

const ROLE_MINING = new Set([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD]);

@Controller('order-pack-meal-mining')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('GA_ORDER_PACK_MEAL')
export class OrderPackMealMiningController {
  constructor(private readonly service: OrderPackMealMiningService) {}

  @Get()
  findByMonth(@Query('month') month: string, @Req() request: MiningRequest) {
    this.guardMining(request);
    return this.service.findByMonth(month);
  }

  @Post('bulk')
  saveMany(@Body() dto: SaveMiningPackMealDto, @Req() request: MiningRequest) {
    this.guardMining(request);
    return this.service.saveMany(dto, request.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: MiningRequest) {
    this.guardMining(request);
    return this.service.remove(id);
  }

  private guardMining(request: MiningRequest) {
    if (!ROLE_MINING.has(request.user.role)) {
      throw new ForbiddenException('Akses hanya untuk Admin, Admin HC, dan Section Head');
    }
  }
}
