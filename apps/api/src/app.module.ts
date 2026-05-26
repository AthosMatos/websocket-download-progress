import { Module } from '@nestjs/common';
import { Gateway } from './websocket.gateway';

@Module({
  imports: [],
  controllers: [],
  providers: [Gateway],
})
export class AppModule { }
