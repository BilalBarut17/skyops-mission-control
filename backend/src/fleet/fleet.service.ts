import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DroneEntity } from '../drones/entities/drone.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { DronesService } from '../drones/drones.service';
import { MissionStatus } from '../common/enums/mission-status.enum';

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(DroneEntity)
    private readonly dronesRepo: Repository<DroneEntity>,
    @InjectRepository(MissionEntity)
    private readonly missionsRepo: Repository<MissionEntity>,
  ) {}

  async getFleetHealth() {
    const drones = await this.dronesRepo.find();
    const totalDrones = drones.length;

    const dronesByStatus: Record<string, number> = {};
    for (const d of drones) {
      dronesByStatus[d.status] = (dronesByStatus[d.status] ?? 0) + 1;
    }

    const now = new Date();
    const overdueMaintenanceDrones = drones.filter((d) => {
      const dueFlags = DronesService.getMaintenanceDueFlags({
        totalFlightHours: d.totalFlightHours ?? 0,
        lastMaintenanceFlightHours: d.lastMaintenanceFlightHours ?? 0,
        nextMaintenanceDueDate: d.nextMaintenanceDueDate,
      });
      return dueFlags.overdue;
    });

    const in24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const missionsInNext24HoursCount = await this.missionsRepo
      .createQueryBuilder('m')
      .where('m.plannedStart >= :now', { now })
      .andWhere('m.plannedStart <= :end', { end: in24hEnd })
      .andWhere('m.status IN (:...activeStatuses)', {
        activeStatuses: [
          MissionStatus.PLANNED,
          MissionStatus.PRE_FLIGHT_CHECK,
          MissionStatus.IN_PROGRESS,
        ],
      })
      .getCount();

    const totalHours = drones.reduce(
      (sum, d) => sum + (d.totalFlightHours ?? 0),
      0,
    );
    const averageFlightHoursPerDrone =
      totalDrones > 0 ? totalHours / totalDrones : 0;

    return {
      totalDrones,
      dronesByStatus,
      overdueMaintenanceDrones,
      missionsInNext24Hours: missionsInNext24HoursCount,
      averageFlightHoursPerDrone,
    };
  }
}
