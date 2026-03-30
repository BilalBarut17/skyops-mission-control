import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DroneEntity } from '../drones/entities/drone.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';

@Module({
  imports: [TypeOrmModule.forFeature([DroneEntity, MissionEntity])],
  controllers: [FleetController],
  providers: [FleetService],
})
export class FleetModule {}
