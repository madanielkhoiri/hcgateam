// ==================================================
// FILE: backend/src/travel/travel.controller.ts
// FUNGSI: Endpoint modul Travel (admin GA, self-service karyawan, Driver)
// ==================================================

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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TravelService } from './travel.service';
import { BuatDriverDto, BuatJadwalDto, RatingTravelDto, UbahDriverDto, UbahJadwalDto } from './dto/travel.dto';

@Controller('travel')
@UseGuards(JwtAuthGuard)
export class TravelController {
  constructor(private readonly service: TravelService) {}

  // ---------- Admin (digerbang accessKey GA_TRANSPORT_TRAVEL) ----------

  @Get('admin/driver')
  daftarDriver() {
    return this.service.daftarDriver();
  }

  @Post('admin/driver')
  buatDriver(@Body() dto: BuatDriverDto) {
    return this.service.buatDriver(dto);
  }

  @Patch('admin/driver/:id')
  ubahDriver(@Param('id', ParseIntPipe) id: number, @Body() dto: UbahDriverDto) {
    return this.service.ubahDriver(id, dto);
  }

  @Delete('admin/driver/:id')
  hapusDriver(@Param('id', ParseIntPipe) id: number) {
    return this.service.hapusDriver(id);
  }

  @Get('admin/karyawan')
  karyawanRingkas(@Query('search') search?: string) {
    return this.service.karyawanRingkas(search);
  }

  @Get('admin/jadwal')
  daftarJadwalAdmin() {
    return this.service.daftarJadwalAdmin();
  }

  @Get('admin/jadwal/:id')
  detailJadwalAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.service.detailJadwalAdmin(id);
  }

  @Post('admin/jadwal')
  buatJadwal(@Body() dto: BuatJadwalDto, @Req() req: any) {
    return this.service.buatJadwal(dto, req.user.id);
  }

  @Patch('admin/jadwal/:id')
  ubahJadwal(@Param('id', ParseIntPipe) id: number, @Body() dto: UbahJadwalDto) {
    return this.service.ubahJadwal(id, dto);
  }

  @Delete('admin/jadwal/:id')
  hapusJadwal(@Param('id', ParseIntPipe) id: number) {
    return this.service.hapusJadwal(id);
  }

  // ---------- Self-service karyawan (tanpa accessKey, cukup login) ----------

  @Get('saya')
  daftarSaya(@Req() req: any) {
    return this.service.daftarSaya(req.user.id);
  }

  @Get('saya/:id')
  detailSaya(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.detailSaya(req.user.id, id);
  }

  @Post('saya/:id/checkin')
  checkin(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.checkin(req.user.id, id);
  }

  @Post('saya/:id/checkout')
  checkout(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.checkout(req.user.id, id);
  }

  @Post('saya/:id/rating')
  rating(@Param('id', ParseIntPipe) id: number, @Body() dto: RatingTravelDto, @Req() req: any) {
    return this.service.rating(req.user.id, id, dto);
  }

  // ---------- Driver (tanpa accessKey, cukup login sebagai role DRIVER) ----------

  @Get('driver')
  daftarTripSaya(@Req() req: any) {
    return this.service.daftarTripSaya(req.user.id);
  }

  @Get('driver/:id')
  detailTrip(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.detailTrip(req.user.id, id);
  }

  @Post('driver/:id/checkin')
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  driverCheckin(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @UploadedFile() foto?: Express.Multer.File,
  ) {
    return this.service.driverCheckin(req.user.id, id, foto);
  }

  @Post('driver/:id/checkout')
  driverCheckout(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.driverCheckout(req.user.id, id);
  }
}
