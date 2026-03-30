import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DroneEntity } from './entities/drone.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { DronesController } from './drones.controller';
import { DronesService } from './drones.service';

@Module({
  imports: [TypeOrmModule.forFeature([DroneEntity, MissionEntity])],
  controllers: [DronesController],
  providers: [DronesService],
  exports: [DronesService],
})
export class DronesModule {}
