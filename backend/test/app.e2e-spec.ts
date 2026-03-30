/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DroneModel } from '../src/common/enums/drone-model.enum';
import { MissionType } from '../src/common/enums/mission-type.enum';
import { MissionStatus } from '../src/common/enums/mission-status.enum';
import { DroneStatus } from '../src/common/enums/drone-status.enum';

describe('Mission Lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let droneId: string;
  let missionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. should create a new drone', async () => {
    const response = await request(app.getHttpServer())
      .post('/drones')
      .send({
        serialNumber: 'SKY-TEST-E2E1',
        model: DroneModel.PHANTOM_4,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status', DroneStatus.AVAILABLE);
    droneId = response.body.id as string;
  });

  it('2. should schedule a mission for the drone', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 1000 * 60 * 60 * 2);
    const end = new Date(start.getTime() + 1000 * 60 * 60 * 3);

    const response = await request(app.getHttpServer())
      .post('/missions')
      .send({
        name: 'E2E Test Mission',
        missionType: MissionType.WIND_TURBINE_INSPECTION,
        droneId,
        pilotName: 'E2E Test Pilot',
        siteLocation: 'Test Site',
        plannedStart: start.toISOString(),
        plannedEnd: end.toISOString(),
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status', MissionStatus.PLANNED);
    missionId = response.body.id as string;
  });

  it('3. should transition mission to PRE_FLIGHT_CHECK', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/missions/${missionId}/pre-flight-check`)
      .expect(200);

    expect(response.body).toHaveProperty(
      'status',
      MissionStatus.PRE_FLIGHT_CHECK,
    );
  });

  it('4. should start mission and update drone status', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/missions/${missionId}/start`)
      .expect(200);

    expect(response.body).toHaveProperty('status', MissionStatus.IN_PROGRESS);

    const droneResponse = await request(app.getHttpServer())
      .get(`/drones/${droneId}`)
      .expect(200);

    expect(droneResponse.body).toHaveProperty('status', DroneStatus.IN_MISSION);
  });

  it('5. should complete mission and log flight hours', async () => {
    const flightHours = 2.5;

    const droneBeforeCompletion = await request(app.getHttpServer())
      .get(`/drones/${droneId}`)
      .expect(200);

    const initialFlightHours = droneBeforeCompletion.body
      .totalFlightHours as number;

    const response = await request(app.getHttpServer())
      .patch(`/missions/${missionId}/complete`)
      .send({ flightHoursLogged: flightHours })
      .expect(200);

    expect(response.body).toHaveProperty('status', MissionStatus.COMPLETED);
    expect(response.body).toHaveProperty('flightHoursLogged', flightHours);

    const droneAfterCompletion = await request(app.getHttpServer())
      .get(`/drones/${droneId}`)
      .expect(200);

    expect(droneAfterCompletion.body).toHaveProperty(
      'totalFlightHours',
      initialFlightHours + flightHours,
    );
    expect(droneAfterCompletion.body).toHaveProperty(
      'status',
      DroneStatus.AVAILABLE,
    );
  });

  it('6. should retrieve fleet health report', async () => {
    const response = await request(app.getHttpServer())
      .get('/fleet-health')
      .expect(200);

    expect(response.body).toHaveProperty('totalDrones');
    expect(response.body).toHaveProperty('dronesByStatus');
    expect(response.body).toHaveProperty('averageFlightHoursPerDrone');
    expect(typeof response.body.totalDrones).toBe('number');
  });
});
