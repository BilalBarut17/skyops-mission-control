import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DroneEntity } from '../drones/entities/drone.entity';
import { MaintenanceLogEntity } from './entities/maintenance-log.entity';
import { MaintenanceLogsController } from './maintenance.controller';
import { MaintenanceLogsService } from './maintenance.service';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceLogEntity, DroneEntity])],
  controllers: [MaintenanceLogsController],
  providers: [MaintenanceLogsService],
  exports: [MaintenanceLogsService],
})
export class MaintenanceModule {}
