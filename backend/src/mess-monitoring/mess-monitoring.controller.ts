import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Aktor, type AktorPostingan } from '../postingan/postingan-aktor';
import { CreateMessRoomDto, MessOccupantDto, UpdateMessOccupantDto, UpdateMessRoomDto } from './dto/mess-monitoring.dto';
import { MessMonitoringService } from './mess-monitoring.service';

@Controller('mess-monitoring')
@UseGuards(JwtAuthGuard)
export class MessMonitoringController {
  constructor(private readonly service: MessMonitoringService) {}
  @Get('dashboard') dashboard(@Aktor() a: AktorPostingan) { return this.service.dashboard(a); }
  @Get('rooms') rooms(@Aktor() a: AktorPostingan) { return this.service.list(a); }
  @Get('operations') operations(@Aktor() a: AktorPostingan) { return this.service.operations(a); }
  @Post('rooms') create(@Aktor() a: AktorPostingan, @Body() d: CreateMessRoomDto) { return this.service.createRoom(a, d); }
  @Patch('rooms/:id') update(@Aktor() a: AktorPostingan, @Param('id', ParseIntPipe) id: number, @Body() d: UpdateMessRoomDto) { return this.service.updateRoom(a, id, d.number); }
  @Delete('rooms/:id') remove(@Aktor() a: AktorPostingan, @Param('id', ParseIntPipe) id: number) { return this.service.deleteRoom(a, id); }
  @Post('rooms/:id/occupants') addOccupant(@Aktor() a: AktorPostingan, @Param('id', ParseIntPipe) id: number, @Body() d: MessOccupantDto) { return this.service.addOccupant(a, id, d); }
  @Patch('occupants/:id') updateOccupant(@Aktor() a: AktorPostingan, @Param('id', ParseIntPipe) id: number, @Body() d: UpdateMessOccupantDto) { return this.service.updateOccupant(a, id, d); }
  @Delete('occupants/:id') removeOccupant(@Aktor() a: AktorPostingan, @Param('id', ParseIntPipe) id: number) { return this.service.deleteOccupant(a, id); }
  @Post('rooms/:id/start') start(@Aktor() a: AktorPostingan, @Param('id', ParseIntPipe) id: number) { return this.service.start(a, id); }
  @Post('rooms/:id/finish') finish(@Aktor() a: AktorPostingan, @Param('id', ParseIntPipe) id: number) { return this.service.finish(a, id); }
}
