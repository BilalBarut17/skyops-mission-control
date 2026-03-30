import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DroneEntity } from './entities/drone.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { CreateDroneDto } from './dto/create-drone.dto';
import { ListDronesQueryDto } from './dto/list-drones-query.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';
import { DroneStatus } from '../common/enums/drone-status.enum';
import { MissionStatus } from '../common/enums/mission-status.enum';

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
export class DronesService {
  constructor(
    @InjectRepository(DroneEntity)
    private readonly dronesRepo: Repository<DroneEntity>,
    @InjectRepository(MissionEntity)
    private readonly missionsRepo: Repository<MissionEntity>,
  ) {}

  async findAll(query: ListDronesQueryDto) {
    const { page, limit, status, model } = query;

    const qb = this.dronesRepo.createQueryBuilder('d');
    if (status) qb.andWhere('d.status = :status', { status });
    if (model) qb.andWhere('d.model = :model', { model });

    qb.orderBy('d.registrationTimestamp', 'DESC');

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

  async findOne(id: string) {
    const drone = await this.dronesRepo.findOne({ where: { id } });
    if (!drone) throw new NotFoundException('Drone not found');
    return drone;
  }

  private computeMaintenanceDueFields(params: {
    lastMaintenanceDate: Date;
    lastMaintenanceFlightHours: number;
    nextMaintenanceDueDate?: Date;
  }): Pick<
    DroneEntity,
    | 'lastMaintenanceDate'
    | 'lastMaintenanceFlightHours'
    | 'nextMaintenanceDueDate'
  > {
    const { lastMaintenanceDate, lastMaintenanceFlightHours } = params;
    const nextMaintenanceDueDate =
      params.nextMaintenanceDueDate ?? addDays(lastMaintenanceDate, 90);
    return {
      lastMaintenanceDate,
      lastMaintenanceFlightHours,
      nextMaintenanceDueDate,
    };
  }

  private assertSerialNumberFormat(serialNumber: string) {
    // DTO zaten valid ediyor; bu ek kontrol service-level güvenlik sağlar.
    const v = serialNumber.toUpperCase();
    if (!/^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(v)) {
      throw new BadRequestException('serialNumber must match SKY-XXXX-XXXX');
    }
    return v;
  }

  async create(dto: CreateDroneDto) {
    const serialNumber = this.assertSerialNumberFormat(dto.serialNumber);

    const exists = await this.dronesRepo.findOne({ where: { serialNumber } });
    if (exists) throw new ConflictException('serialNumber already exists');

    const totalFlightHours = dto.totalFlightHours ?? 0;
    const now = new Date();

    const lastMaintenanceDate =
      dto.lastMaintenanceDate != null
        ? parseDateOrThrow(dto.lastMaintenanceDate)
        : now;

    const lastMaintenanceFlightHours = dto.lastMaintenanceFlightHours ?? 0;

    const nextMaintenanceDueDate =
      dto.nextMaintenanceDueDate != null
        ? parseDateOrThrow(dto.nextMaintenanceDueDate)
        : addDays(lastMaintenanceDate, 90);

    const drone = this.dronesRepo.create({
      serialNumber,
      model: dto.model,
      status: dto.status ?? DroneStatus.AVAILABLE,
      totalFlightHours,
      ...this.computeMaintenanceDueFields({
        lastMaintenanceDate,
        lastMaintenanceFlightHours,
        nextMaintenanceDueDate,
      }),
      registrationTimestamp: now,
    });

    return this.dronesRepo.save(drone);
  }

  async update(id: string, dto: UpdateDroneDto) {
    const drone = await this.findOne(id);

    if (dto.serialNumber && dto.serialNumber !== drone.serialNumber) {
      const serialNumber = this.assertSerialNumberFormat(dto.serialNumber);
      const exists = await this.dronesRepo.findOne({ where: { serialNumber } });
      if (exists) throw new ConflictException('serialNumber already exists');
      drone.serialNumber = serialNumber;
    }

    if (dto.model) drone.model = dto.model;
    if (dto.status) drone.status = dto.status;
    if (dto.totalFlightHours != null)
      drone.totalFlightHours = dto.totalFlightHours;

    // If maintenance-related fields are provided, keep due calculations consistent.
    const next: Partial<DroneEntity> = {};
    if (dto.lastMaintenanceDate != null)
      next.lastMaintenanceDate = parseDateOrThrow(dto.lastMaintenanceDate);
    if (dto.lastMaintenanceFlightHours != null)
      next.lastMaintenanceFlightHours = dto.lastMaintenanceFlightHours;
    if (dto.nextMaintenanceDueDate != null)
      next.nextMaintenanceDueDate = parseDateOrThrow(
        dto.nextMaintenanceDueDate,
      );

    const effectiveLastMaintenanceDate =
      next.lastMaintenanceDate ?? drone.lastMaintenanceDate ?? new Date();
    const effectiveLastMaintenanceFlightHours =
      next.lastMaintenanceFlightHours ?? drone.lastMaintenanceFlightHours ?? 0;

    if (
      next.lastMaintenanceDate != null ||
      next.lastMaintenanceFlightHours != null
    ) {
      next.nextMaintenanceDueDate =
        next.nextMaintenanceDueDate ??
        addDays(effectiveLastMaintenanceDate, 90);
      drone.lastMaintenanceDate = effectiveLastMaintenanceDate;
      drone.lastMaintenanceFlightHours = effectiveLastMaintenanceFlightHours;
      drone.nextMaintenanceDueDate = next.nextMaintenanceDueDate ?? null;
    } else if (next.nextMaintenanceDueDate) {
      drone.nextMaintenanceDueDate = next.nextMaintenanceDueDate ?? null;
    }

    return this.dronesRepo.save(drone);
  }

  async retire(id: string) {
    const drone = await this.findOne(id);

    const now = new Date();
    const upcomingMissionsCount = await this.missionsRepo
      .createQueryBuilder('m')
      .where('m.droneId = :droneId', { droneId: id })
      .andWhere('m.plannedStart > :now', { now })
      .andWhere('m.status IN (:...activeStatuses)', {
        activeStatuses: [MissionStatus.PLANNED, MissionStatus.PRE_FLIGHT_CHECK],
      })
      .getCount();

    if (upcomingMissionsCount > 0) {
      throw new BadRequestException(
        'Cannot retire drone with upcoming scheduled missions',
      );
    }

    drone.status = DroneStatus.RETIRED;
    return this.dronesRepo.save(drone);
  }

  static calculateNextMaintenanceDueDate(from: Date): Date {
    return addDays(from, 90);
  }

  static getMaintenanceDueFlags(params: {
    totalFlightHours: number;
    lastMaintenanceFlightHours: number;
    nextMaintenanceDueDate: Date | string | null;
  }) {
    const now = new Date();
    const dueByHours =
      params.totalFlightHours - params.lastMaintenanceFlightHours >= 50;
    const dueDate =
      typeof params.nextMaintenanceDueDate === 'string'
        ? new Date(params.nextMaintenanceDueDate)
        : params.nextMaintenanceDueDate;
    const dueByDate =
      dueDate != null &&
      !Number.isNaN(dueDate.getTime()) &&
      dueDate.getTime() <= now.getTime();
    return {
      dueByHours,
      dueByDate,
      overdue: dueByHours || dueByDate,
    };
  }
}
