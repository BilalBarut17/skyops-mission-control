import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      name: 'SkyOps Mission Control API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        drones: '/drones',
        missions: '/missions',
        maintenanceLogs: '/maintenance-logs',
        fleetHealth: '/fleet-health',
      },
      docs: 'See README.md for full API documentation',
    };
  }
}
