import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';
import { MaintenanceLogsService } from './maintenance.service';

@Controller('maintenance-logs')
export class MaintenanceLogsController {
  constructor(
    private readonly maintenanceLogsService: MaintenanceLogsService,
  ) {}

  @Post()
  async create(@Body() dto: CreateMaintenanceLogDto) {
    return this.maintenanceLogsService.create(dto);
  }

  @Get('drone/:droneId')
  async getByDrone(@Param('droneId', new ParseUUIDPipe()) droneId: string) {
    return this.maintenanceLogsService.findByDrone(droneId);
  }
}
