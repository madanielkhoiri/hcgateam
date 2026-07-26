import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateHandoverDto } from './dto/create-handover.dto';
import { UpdateHandoverDto } from './dto/update-handover.dto';
import { HandoverPdfService } from './handover-pdf.service';
import { HandoversService } from './handovers.service';

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    username: string;
    role: string;
  };
};

@Controller('handovers')
@UseGuards(JwtAuthGuard)
export class HandoversController {
  constructor(
    private readonly service: HandoversService,
    private readonly pdfService: HandoverPdfService,
  ) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id/pdf')
  pdf(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    return this.pdfService.streamPdf(id, response);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateHandoverDto, @Req() request: AuthenticatedRequest) {
    return this.service.create(dto, request.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHandoverDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
