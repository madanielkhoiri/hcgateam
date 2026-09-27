import {
  Body,
  Controller,
  Delete,
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
import { OrderPackMealMiningService } from './order-pack-meal-mining.service';

type MiningRequest = { user: { id: number } };

@Controller('order-pack-meal-mining')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('GA_ORDER_PACK_MEAL')
export class OrderPackMealMiningController {
  constructor(private readonly service: OrderPackMealMiningService) {}

  @Get()
  findByMonth(@Query('month') month: string) {
    return this.service.findByMonth(month);
  }

  @Post('bulk')
  saveMany(@Body() dto: SaveMiningPackMealDto, @Req() request: MiningRequest) {
    return this.service.saveMany(dto, request.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
