import { Controller, Get } from '@nestjs/common';
import { FleetService } from './fleet.service';

@Controller('fleet-health')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get()
  async getFleetHealth() {
    return this.fleetService.getFleetHealth();
  }
}
