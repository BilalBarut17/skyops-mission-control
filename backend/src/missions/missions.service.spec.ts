import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { MissionEntity } from './entities/mission.entity';
import { DroneEntity } from '../drones/entities/drone.entity';
import { MissionStatus } from '../common/enums/mission-status.enum';
import { MissionType } from '../common/enums/mission-type.enum';
import { DroneStatus } from '../common/enums/drone-status.enum';
import { DroneModel } from '../common/enums/drone-model.enum';

describe('MissionsService', () => {
  let service: MissionsService;
  let missionsRepo: Repository<MissionEntity>;
  let dronesRepo: Repository<DroneEntity>;

  const mockDrone: DroneEntity = {
    id: 'drone-1',
    serialNumber: 'SKY-A1B2-C3D4',
    model: DroneModel.PHANTOM_4,
    status: DroneStatus.AVAILABLE,
    totalFlightHours: 50,
    lastMaintenanceFlightHours: 0,
    lastMaintenanceDate: new Date(),
    nextMaintenanceDueDate: new Date('2099-12-31'),
    registrationTimestamp: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsService,
        {
          provide: getRepositoryToken(MissionEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
            })),
          },
        },
        {
          provide: getRepositoryToken(DroneEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MissionsService>(MissionsService);
    missionsRepo = module.get<Repository<MissionEntity>>(
      getRepositoryToken(MissionEntity),
    );
    dronesRepo = module.get<Repository<DroneEntity>>(
      getRepositoryToken(DroneEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject mission scheduled in the past', async () => {
      jest.spyOn(dronesRepo, 'findOne').mockResolvedValue(mockDrone);

      const pastDate = new Date('2020-01-01');
      await expect(
        service.create({
          name: 'Past Mission',
          missionType: MissionType.WIND_TURBINE_INSPECTION,
          droneId: 'drone-1',
          pilotName: 'John Doe',
          siteLocation: 'Site A',
          plannedStart: pastDate.toISOString(),
          plannedEnd: new Date('2020-01-02').toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if plannedEnd is before plannedStart', async () => {
      jest.spyOn(dronesRepo, 'findOne').mockResolvedValue(mockDrone);

      const start = new Date('2099-12-31T10:00:00Z');
      const end = new Date('2099-12-31T09:00:00Z');

      await expect(
        service.create({
          name: 'Invalid Time Mission',
          missionType: MissionType.SOLAR_PANEL_SURVEY,
          droneId: 'drone-1',
          pilotName: 'Jane Doe',
          siteLocation: 'Site B',
          plannedStart: start.toISOString(),
          plannedEnd: end.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if drone is not AVAILABLE', async () => {
      const busyDrone = { ...mockDrone, status: DroneStatus.IN_MISSION };
      jest.spyOn(dronesRepo, 'findOne').mockResolvedValue(busyDrone);

      const start = new Date('2099-12-31T10:00:00Z');
      const end = new Date('2099-12-31T12:00:00Z');

      await expect(
        service.create({
          name: 'Test Mission',
          missionType: MissionType.POWER_LINE_PATROL,
          droneId: 'drone-1',
          pilotName: 'Pilot',
          siteLocation: 'Site C',
          plannedStart: start.toISOString(),
          plannedEnd: end.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject overlapping missions', async () => {
      jest.spyOn(dronesRepo, 'findOne').mockResolvedValue(mockDrone);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      } as unknown as SelectQueryBuilder<MissionEntity>;
      jest.spyOn(missionsRepo, 'createQueryBuilder').mockReturnValue(qb);

      const start = new Date('2099-12-31T10:00:00Z');
      const end = new Date('2099-12-31T12:00:00Z');

      await expect(
        service.create({
          name: 'Overlapping Mission',
          missionType: MissionType.WIND_TURBINE_INSPECTION,
          droneId: 'drone-1',
          pilotName: 'Pilot',
          siteLocation: 'Site D',
          plannedStart: start.toISOString(),
          plannedEnd: end.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('State Transitions', () => {
    const mockMission: MissionEntity = {
      id: 'mission-1',
      name: 'Test Mission',
      missionType: MissionType.WIND_TURBINE_INSPECTION,
      drone: mockDrone,
      pilotName: 'Pilot',
      siteLocation: 'Site A',
      plannedStart: new Date('2099-12-31T10:00:00Z'),
      plannedEnd: new Date('2099-12-31T12:00:00Z'),
      actualStart: null,
      actualEnd: null,
      status: MissionStatus.PLANNED,
      flightHoursLogged: null,
      abortReason: null,
      createdAt: new Date(),
    };

    it('should transition from PLANNED to PRE_FLIGHT_CHECK', async () => {
      jest.spyOn(missionsRepo, 'findOne').mockResolvedValue({ ...mockMission });
      jest
        .spyOn(missionsRepo, 'save')
        .mockImplementation((entity) => Promise.resolve(entity as any));

      const result = await service.transitionToPreFlightCheck('mission-1');
      expect(result.status).toBe(MissionStatus.PRE_FLIGHT_CHECK);
    });

    it('should reject invalid state transition to PRE_FLIGHT_CHECK', async () => {
      jest.spyOn(missionsRepo, 'findOne').mockResolvedValue({
        ...mockMission,
        status: MissionStatus.IN_PROGRESS,
      });

      await expect(
        service.transitionToPreFlightCheck('mission-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should abort mission and free drone', async () => {
      const inProgressMission = {
        ...mockMission,
        status: MissionStatus.IN_PROGRESS,
        drone: { ...mockDrone, status: DroneStatus.IN_MISSION },
      };

      jest.spyOn(missionsRepo, 'findOne').mockResolvedValue(inProgressMission);
      jest
        .spyOn(dronesRepo, 'save')
        .mockImplementation((entity) => Promise.resolve(entity as any));
      jest
        .spyOn(missionsRepo, 'save')
        .mockImplementation((entity) => Promise.resolve(entity as any));

      const result = await service.abortMission('mission-1', {
        abortReason: 'Weather conditions',
      });

      expect(result.status).toBe(MissionStatus.ABORTED);
      expect(result.abortReason).toBe('Weather conditions');
    });
  });
});
