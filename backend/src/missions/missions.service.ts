import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DroneEntity } from '../drones/entities/drone.entity';
import { DroneStatus } from '../common/enums/drone-status.enum';
import { MissionEntity } from './entities/mission.entity';
import { CreateMissionDto } from './dto/create-mission.dto';
import { ListMissionsQueryDto } from './dto/list-missions-query.dto';
import { MissionStatus } from '../common/enums/mission-status.enum';
import { DronesService } from '../drones/drones.service';
import { CompleteMissionDto } from './dto/complete-mission.dto';
import { AbortMissionDto } from './dto/abort-mission.dto';

function parseDateOrThrow(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  return d;
}

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(MissionEntity)
    private readonly missionsRepo: Repository<MissionEntity>,
    @InjectRepository(DroneEntity)
    private readonly dronesRepo: Repository<DroneEntity>,
  ) {}

  async findAll(query: ListMissionsQueryDto) {
    const { page, limit, status, droneId, from, to } = query;

    const qb = this.missionsRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.drone', 'd')
      .orderBy('m.plannedStart', 'DESC');

    if (status) qb.andWhere('m.status = :status', { status });
    if (droneId) qb.andWhere('d.id = :droneId', { droneId });
    if (from)
      qb.andWhere('m.plannedStart >= :from', { from: parseDateOrThrow(from) });
    if (to) qb.andWhere('m.plannedStart <= :to', { to: parseDateOrThrow(to) });

    const [data, total] = await qb
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getMissionOrThrow(id: string): Promise<MissionEntity> {
    const mission = await this.missionsRepo.findOne({
      where: { id },
      relations: ['drone'],
    });
    if (!mission) throw new NotFoundException('Mission not found');
    return mission;
  }

  async create(dto: CreateMissionDto) {
    const plannedStart = parseDateOrThrow(dto.plannedStart);
    const plannedEnd = parseDateOrThrow(dto.plannedEnd);
    const now = new Date();

    if (plannedStart.getTime() < now.getTime()) {
      throw new BadRequestException('Missions cannot be scheduled in the past');
    }
    if (plannedEnd.getTime() <= plannedStart.getTime()) {
      throw new BadRequestException('plannedEnd must be after plannedStart');
    }

    const drone = await this.dronesRepo.findOne({ where: { id: dto.droneId } });
    if (!drone) throw new NotFoundException('Assigned drone not found');
    if (drone.status !== DroneStatus.AVAILABLE) {
      throw new BadRequestException(
        'Only AVAILABLE drones can be assigned to missions',
      );
    }

    const overlapCount = await this.missionsRepo
      .createQueryBuilder('m')
      .where('m.droneId = :droneId', { droneId: dto.droneId })
      .andWhere('m.status IN (:...activeStatuses)', {
        activeStatuses: [
          MissionStatus.PLANNED,
          MissionStatus.PRE_FLIGHT_CHECK,
          MissionStatus.IN_PROGRESS,
        ],
      })
      .andWhere('m.plannedStart < :plannedEnd', { plannedEnd })
      .andWhere('m.plannedEnd > :plannedStart', { plannedStart })
      .getCount();

    if (overlapCount > 0) {
      throw new BadRequestException(
        'Drone has overlapping mission in the scheduled window',
      );
    }

    const mission = this.missionsRepo.create({
      name: dto.name,
      missionType: dto.missionType,
      drone,
      pilotName: dto.pilotName,
      siteLocation: dto.siteLocation,
      plannedStart,
      plannedEnd,
      status: MissionStatus.PLANNED,
    });

    return this.missionsRepo.save(mission);
  }

  async transitionToPreFlightCheck(id: string) {
    const mission = await this.getMissionOrThrow(id);
    if (mission.status !== MissionStatus.PLANNED) {
      throw new BadRequestException('Invalid transition to PRE_FLIGHT_CHECK');
    }

    mission.status = MissionStatus.PRE_FLIGHT_CHECK;
    return this.missionsRepo.save(mission);
  }

  async transitionToInProgress(id: string) {
    const mission = await this.getMissionOrThrow(id);
    if (mission.status !== MissionStatus.PRE_FLIGHT_CHECK) {
      throw new BadRequestException('Invalid transition to IN_PROGRESS');
    }

    // When mission starts: drone becomes "in use".
    if (mission.drone.status !== DroneStatus.AVAILABLE) {
      throw new BadRequestException('Assigned drone is not AVAILABLE');
    }

    mission.status = MissionStatus.IN_PROGRESS;
    mission.actualStart = new Date();

    mission.drone.status = DroneStatus.IN_MISSION;

    await this.dronesRepo.save(mission.drone);
    return this.missionsRepo.save(mission);
  }

  async completeMission(id: string, dto: CompleteMissionDto) {
    const mission = await this.getMissionOrThrow(id);
    if (mission.status !== MissionStatus.IN_PROGRESS) {
      throw new BadRequestException('Invalid transition to COMPLETED');
    }
    if (dto.flightHoursLogged < 0)
      throw new BadRequestException('flightHoursLogged must be >= 0');

    const now = new Date();

    mission.status = MissionStatus.COMPLETED;
    mission.actualEnd = now;
    mission.flightHoursLogged = dto.flightHoursLogged;

    const drone = mission.drone;
    const newTotal = drone.totalFlightHours + dto.flightHoursLogged;

    drone.totalFlightHours = newTotal;

    const due = DronesService.getMaintenanceDueFlags({
      totalFlightHours: drone.totalFlightHours,
      lastMaintenanceFlightHours: drone.lastMaintenanceFlightHours,
      nextMaintenanceDueDate: drone.nextMaintenanceDueDate,
    });

    drone.status = due.overdue
      ? DroneStatus.MAINTENANCE
      : DroneStatus.AVAILABLE;

    await this.dronesRepo.save(drone);
    return this.missionsRepo.save(mission);
  }

  async abortMission(id: string, dto: AbortMissionDto) {
    const mission = await this.getMissionOrThrow(id);
    const allowed = [
      MissionStatus.PLANNED,
      MissionStatus.PRE_FLIGHT_CHECK,
      MissionStatus.IN_PROGRESS,
    ];
    if (!allowed.includes(mission.status)) {
      throw new BadRequestException('Invalid transition to ABORTED');
    }

    mission.status = MissionStatus.ABORTED;
    mission.abortReason = dto.abortReason;
    mission.actualEnd = new Date();

    // Aborting frees the drone.
    if (mission.drone.status === DroneStatus.IN_MISSION) {
      mission.drone.status = DroneStatus.AVAILABLE;
      await this.dronesRepo.save(mission.drone);
    }

    return this.missionsRepo.save(mission);
  }
}
