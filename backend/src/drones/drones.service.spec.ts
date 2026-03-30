import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DronesService } from './drones.service';
import { DroneEntity } from './entities/drone.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { DroneModel } from '../common/enums/drone-model.enum';
import { DroneStatus } from '../common/enums/drone-status.enum';

describe('DronesService', () => {
  let service: DronesService;
  let repository: Repository<DroneEntity>;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DronesService,
        {
          provide: getRepositoryToken(DroneEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MissionEntity),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DronesService>(DronesService);
    repository = module.get<Repository<DroneEntity>>(
      getRepositoryToken(DroneEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject invalid serial number format', async () => {
      await expect(
        service.create({
          serialNumber: 'INVALID-FORMAT',
          model: DroneModel.PHANTOM_4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate serial number', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue({
        id: 'existing-id',
        serialNumber: 'SKY-A1B2-C3D4',
      } as DroneEntity);

      await expect(
        service.create({
          serialNumber: 'SKY-A1B2-C3D4',
          model: DroneModel.PHANTOM_4,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create drone with valid serial number', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const mockDrone = {
        id: 'new-id',
        serialNumber: 'SKY-X1Y2-Z3W4',
        model: DroneModel.MATRICE_300,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 0,
      } as DroneEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockDrone);
      jest.spyOn(repository, 'save').mockResolvedValue(mockDrone);

      const result = await service.create({
        serialNumber: 'SKY-X1Y2-Z3W4',
        model: DroneModel.MATRICE_300,
      });

      expect(result.serialNumber).toBe('SKY-X1Y2-Z3W4');
    });
  });

  describe('getMaintenanceDueFlags', () => {
    it('should flag overdue by flight hours (>=50h delta)', () => {
      const result = DronesService.getMaintenanceDueFlags({
        totalFlightHours: 100,
        lastMaintenanceFlightHours: 49,
        nextMaintenanceDueDate: new Date('2099-12-31'),
      });

      expect(result.dueByHours).toBe(true);
      expect(result.overdue).toBe(true);
    });

    it('should flag overdue by date (past nextMaintenanceDueDate)', () => {
      const pastDate = new Date('2020-01-01');
      const result = DronesService.getMaintenanceDueFlags({
        totalFlightHours: 10,
        lastMaintenanceFlightHours: 5,
        nextMaintenanceDueDate: pastDate,
      });

      expect(result.dueByDate).toBe(true);
      expect(result.overdue).toBe(true);
    });

    it('should not flag as overdue when both conditions are false', () => {
      const futureDate = new Date('2099-12-31');
      const result = DronesService.getMaintenanceDueFlags({
        totalFlightHours: 30,
        lastMaintenanceFlightHours: 10,
        nextMaintenanceDueDate: futureDate,
      });

      expect(result.dueByHours).toBe(false);
      expect(result.dueByDate).toBe(false);
      expect(result.overdue).toBe(false);
    });

    it('should handle nextMaintenanceDueDate as string (Postgres date)', () => {
      const futureDate = '2099-12-31';
      const result = DronesService.getMaintenanceDueFlags({
        totalFlightHours: 20,
        lastMaintenanceFlightHours: 10,
        nextMaintenanceDueDate: futureDate,
      });

      expect(result.overdue).toBe(false);
    });
  });

  describe('retire', () => {
    it('should prevent retiring drone with upcoming scheduled missions', async () => {
      const mockDrone = {
        id: 'drone-1',
        status: DroneStatus.AVAILABLE,
      } as DroneEntity;

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDrone);

      const missionsRepo = module.get<Repository<MissionEntity>>(
        getRepositoryToken(MissionEntity),
      );
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      } as unknown as SelectQueryBuilder<MissionEntity>;

      jest.spyOn(missionsRepo, 'createQueryBuilder').mockReturnValue(qb);

      await expect(service.retire('drone-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.retire('drone-1')).rejects.toThrow(
        'Cannot retire drone with upcoming scheduled missions',
      );
    });

    it('should allow retiring drone without upcoming missions', async () => {
      const mockDrone = {
        id: 'drone-1',
        status: DroneStatus.AVAILABLE,
      } as DroneEntity;

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDrone);

      const missionsRepo = module.get<Repository<MissionEntity>>(
        getRepositoryToken(MissionEntity),
      );
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      } as unknown as SelectQueryBuilder<MissionEntity>;

      jest.spyOn(missionsRepo, 'createQueryBuilder').mockReturnValue(qb);

      jest.spyOn(repository, 'save').mockResolvedValue({
        ...mockDrone,
        status: DroneStatus.RETIRED,
      } as DroneEntity);

      const result = await service.retire('drone-1');

      expect(result.status).toBe(DroneStatus.RETIRED);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: DroneStatus.RETIRED }),
      );
    });
  });
});
