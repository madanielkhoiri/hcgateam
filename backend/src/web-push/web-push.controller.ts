import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebPushService } from './web-push.service';

type AuthRequest = Request & { user: { id: number } };

@Controller('web-push')
@UseGuards(JwtAuthGuard)
export class WebPushController {
  constructor(private readonly service: WebPushService) {}

  @Get('public-key') publicKey() { return { publicKey: this.service.publicKey }; }
  @Post('subscribe') subscribe(@Req() req: AuthRequest, @Body() body: { endpoint: string; keys?: { p256dh?: string; auth?: string } }) {
    return this.service.subscribe(req.user.id, body);
  }
  @Delete('subscribe') unsubscribe(@Req() req: AuthRequest, @Body() body: { endpoint: string }) {
    return this.service.unsubscribe(req.user.id, body.endpoint);
  }
}
