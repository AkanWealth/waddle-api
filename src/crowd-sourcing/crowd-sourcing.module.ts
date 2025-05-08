import { Module } from '@nestjs/common';
import { CrowdSourcingService } from './crowd-sourcing.service';
import { CrowdSourcingController } from './crowd-sourcing.controller';

@Module({
  controllers: [CrowdSourcingController],
  providers: [CrowdSourcingService],
})
export class CrowdSourcingModule {}
