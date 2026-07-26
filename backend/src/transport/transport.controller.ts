import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTransportDto, UpdateTransportDto } from './dto/transport.dto';
import { TransportService } from './transport.service';

@Controller('transport')
@UseGuards(JwtAuthGuard)
export class TransportController {
  constructor(private readonly service: TransportService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('dashboard') dashboard(@Query('month') month?: string, @Query('year') year?: string) { return this.service.dashboard(month ? Number(month) : undefined, year ? Number(year) : undefined); }
  @Post() create(@Body() dto: CreateTransportDto, @Req() req: any) { return this.service.create(dto, req.user.id); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransportDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
