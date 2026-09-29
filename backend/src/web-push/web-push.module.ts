import { Module } from '@nestjs/common';
import { WebPushController } from './web-push.controller';
import { WebPushService } from './web-push.service';

@Module({ controllers: [WebPushController], providers: [WebPushService], exports: [WebPushService] })
export class WebPushModule {}
