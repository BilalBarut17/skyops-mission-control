import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FleetService } from './fleet.service';
import { DroneEntity } from '../drones/entities/drone.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { DroneStatus } from '../common/enums/drone-status.enum';
import { DroneModel } from '../common/enums/drone-model.enum';

describe('FleetService', () => {
  let service: FleetService;

  const mockDrones: DroneEntity[] = [
    {
      id: 'drone-1',
      serialNumber: 'SKY-A1B2-C3D4',
      model: DroneModel.PHANTOM_4,
      status: DroneStatus.AVAILABLE,
      totalFlightHours: 30,
      lastMaintenanceFlightHours: 10,
      lastMaintenanceDate: new Date(),
      nextMaintenanceDueDate: new Date('2099-12-31'),
      registrationTimestamp: new Date(),
    },
    {
      id: 'drone-2',
      serialNumber: 'SKY-X9Y8-Z7W6',
      model: DroneModel.MATRICE_300,
      status: DroneStatus.MAINTENANCE,
      totalFlightHours: 100,
      lastMaintenanceFlightHours: 40,
      lastMaintenanceDate: new Date('2020-01-01'),
      nextMaintenanceDueDate: new Date('2020-04-01'),
      registrationTimestamp: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        {
          provide: getRepositoryToken(DroneEntity),
          useValue: {
            find: jest.fn().mockResolvedValue(mockDrones),
          },
        },
        {
          provide: getRepositoryToken(MissionEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(3),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFleetHealth', () => {
    it('should return correct drone count', async () => {
      const health = await service.getFleetHealth();
      expect(health.totalDrones).toBe(2);
    });

    it('should break down drones by status', async () => {
      const health = await service.getFleetHealth();
      expect(health.dronesByStatus[DroneStatus.AVAILABLE]).toBe(1);
      expect(health.dronesByStatus[DroneStatus.MAINTENANCE]).toBe(1);
    });

    it('should identify overdue maintenance drones', async () => {
      const health = await service.getFleetHealth();
      expect(health.overdueMaintenanceDrones.length).toBeGreaterThan(0);
      const overdueDrone = health.overdueMaintenanceDrones.find(
        (d) => d.id === 'drone-2',
      );
      expect(overdueDrone).toBeDefined();
    });

    it('should return missions in next 24 hours count', async () => {
      const health = await service.getFleetHealth();
      expect(health.missionsInNext24Hours).toBe(3);
    });

    it('should calculate average flight hours per drone', async () => {
      const health = await service.getFleetHealth();
      const expectedAvg = (30 + 100) / 2;
      expect(health.averageFlightHoursPerDrone).toBe(expectedAvg);
    });
  });
});
