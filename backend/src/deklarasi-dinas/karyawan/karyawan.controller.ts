import { UseInterceptors, Controller, UseGuards } from '@nestjs/common';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';


@UseInterceptors(SnakeCaseInterceptor)
@Controller('karyawan')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_DEKLARASI')
export class KaryawanController {}
