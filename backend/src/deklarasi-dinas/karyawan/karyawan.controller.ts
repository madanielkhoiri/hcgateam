import { UseInterceptors, Controller } from '@nestjs/common';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';


@UseInterceptors(SnakeCaseInterceptor)
@Controller('karyawan')
export class KaryawanController {}
