import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DroneEntity } from '../drones/entities/drone.entity';
import { DroneStatus } from '../common/enums/drone-status.enum';
import { MaintenanceLogEntity } from './entities/maintenance-log.entity';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDateOrThrow(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  return d;
}

@Injectable()
export class MaintenanceLogsService {
  constructor(
    @InjectRepository(MaintenanceLogEntity)
    private readonly maintenanceRepo: Repository<MaintenanceLogEntity>,
    @InjectRepository(DroneEntity)
    private readonly dronesRepo: Repository<DroneEntity>,
  ) {}

  async create(dto: CreateMaintenanceLogDto) {
    const datePerformed = parseDateOrThrow(dto.datePerformed);
    const now = new Date();
    const toleranceHours = 0.5;

    const drone = await this.dronesRepo.findOne({ where: { id: dto.droneId } });
    if (!drone) throw new NotFoundException('Drone not found');

    // Flight-hours consistency check (business rule).
    const delta = Math.abs(
      drone.totalFlightHours - dto.flightHoursAtMaintenance,
    );
    if (delta > toleranceHours) {
      throw new BadRequestException(
        `flightHoursAtMaintenance is inconsistent with drone.totalFlightHours (delta=${delta})`,
      );
    }

    // Maintenance is not possible while a mission is running.
    if (drone.status === DroneStatus.IN_MISSION) {
      throw new BadRequestException(
        'Cannot log maintenance while mission is in progress',
      );
    }

    const nextMaintenanceDueDate = addDays(datePerformed, 90);

    // If the maintenance date is in the past, we consider the drone back to service.
    const nextStatus =
      datePerformed.getTime() <= now.getTime()
        ? DroneStatus.AVAILABLE
        : DroneStatus.MAINTENANCE;

    return this.dronesRepo.manager.transaction(async (manager) => {
      drone.lastMaintenanceDate = datePerformed;
      drone.lastMaintenanceFlightHours = dto.flightHoursAtMaintenance;
      drone.nextMaintenanceDueDate = nextMaintenanceDueDate;
      drone.status = nextStatus;

      await manager.save(drone);

      const log = manager.create(MaintenanceLogEntity, {
        drone,
        type: dto.type,
        technicianName: dto.technicianName,
        notes: dto.notes ?? null,
        datePerformed,
        flightHoursAtMaintenance: dto.flightHoursAtMaintenance,
      });

      return manager.save(log);
    });
  }

  async findByDrone(droneId: string) {
    return this.maintenanceRepo.find({
      where: { drone: { id: droneId } },
      order: { datePerformed: 'DESC' },
      take: 20,
    });
  }
}
