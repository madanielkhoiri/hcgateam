import { UseInterceptors, Controller, UseGuards } from '@nestjs/common';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';


@UseInterceptors(SnakeCaseInterceptor)
@Controller('karyawan')
@UseGuards(JwtAuthGuard)
export class KaryawanController {}
