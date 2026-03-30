import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { AppDataSource } from './data-source';
import { DroneEntity } from '../drones/entities/drone.entity';
import { DroneModel } from '../common/enums/drone-model.enum';
import { DroneStatus } from '../common/enums/drone-status.enum';
import { MissionEntity } from '../missions/entities/mission.entity';
import { MissionStatus } from '../common/enums/mission-status.enum';
import { MissionType } from '../common/enums/mission-type.enum';
import { MaintenanceLogEntity } from '../maintenance/entities/maintenance-log.entity';
import { MaintenanceType } from '../common/enums/maintenance-type.enum';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function hours(n: number) {
  return n * 60 * 60 * 1000;
}

function genSerial(): string {
  const part = () => faker.string.alphanumeric({ length: 4, casing: 'upper' });
  return `SKY-${part()}-${part()}`;
}

async function main() {
  await AppDataSource.initialize();

  const droneRepo = AppDataSource.getRepository(DroneEntity);
  const missionRepo = AppDataSource.getRepository(MissionEntity);
  const maintenanceRepo = AppDataSource.getRepository(MaintenanceLogEntity);

  // Clean existing data (safe for local dev)
  await AppDataSource.query(
    'TRUNCATE TABLE "maintenance_logs", "missions", "drones" RESTART IDENTITY CASCADE',
  );

  const models = Object.values(DroneModel);
  const missionTypes = Object.values(MissionType);
  const maintenanceTypes = Object.values(MaintenanceType);

  // 20 drones
  const drones: DroneEntity[] = [];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const totalFlightHours = faker.number.float({
      min: 0,
      max: 240,
      multipleOf: 0.5,
    });
    const lastMaintenanceFlightHours = Math.max(
      0,
      totalFlightHours -
        faker.number.float({ min: 0, max: 80, multipleOf: 0.5 }),
    );
    const lastMaintenanceDate = addDays(
      now,
      -faker.number.int({ min: 0, max: 120 }),
    );
    const nextMaintenanceDueDate = addDays(lastMaintenanceDate, 90);

    const dueByHours = totalFlightHours - lastMaintenanceFlightHours >= 50;
    const dueByDate = nextMaintenanceDueDate.getTime() <= now.getTime();
    const overdue = dueByHours || dueByDate;

    const drone = droneRepo.create({
      serialNumber: genSerial(),
      model: models[i % models.length],
      status: overdue ? DroneStatus.MAINTENANCE : DroneStatus.AVAILABLE,
      totalFlightHours,
      lastMaintenanceFlightHours,
      lastMaintenanceDate,
      nextMaintenanceDueDate,
      registrationTimestamp: addDays(
        now,
        -faker.number.int({ min: 0, max: 365 }),
      ),
    });
    drones.push(drone);
  }

  await droneRepo.save(drones);

  const availableDrones = () =>
    drones.filter((d) => d.status === DroneStatus.AVAILABLE);

  // 50 missions (mix of past and future)
  const missions: MissionEntity[] = [];
  for (let i = 0; i < 50; i++) {
    const drone = faker.helpers.arrayElement(availableDrones());
    const start = faker.date.between({
      from: addDays(now, -15),
      to: addDays(now, 15),
    });
    const plannedStart = new Date(start);
    const plannedEnd = new Date(
      plannedStart.getTime() + hours(faker.number.int({ min: 1, max: 6 })),
    );

    const inPast = plannedEnd.getTime() < now.getTime();
    const status = inPast
      ? faker.helpers.arrayElement([
          MissionStatus.COMPLETED,
          MissionStatus.ABORTED,
        ])
      : faker.helpers.arrayElement([
          MissionStatus.PLANNED,
          MissionStatus.PRE_FLIGHT_CHECK,
        ]);

    const mission = missionRepo.create({
      name: `Mission ${i + 1} - ${faker.location.city()}`,
      missionType: faker.helpers.arrayElement(missionTypes),
      drone,
      pilotName: faker.person.fullName(),
      siteLocation: `${faker.location.city()}, ${faker.location.country()}`,
      plannedStart,
      plannedEnd,
      status,
      actualStart: status === MissionStatus.COMPLETED ? plannedStart : null,
      actualEnd: status === MissionStatus.COMPLETED ? plannedEnd : null,
      flightHoursLogged:
        status === MissionStatus.COMPLETED
          ? faker.number.float({ min: 0.5, max: 6, multipleOf: 0.5 })
          : null,
      abortReason:
        status === MissionStatus.ABORTED ? faker.lorem.sentence() : null,
    });
    missions.push(mission);
  }

  await missionRepo.save(missions);

  // 30 maintenance logs (align flight hours with drone totals within tolerance)
  const maintenanceLogs: MaintenanceLogEntity[] = [];
  for (let i = 0; i < 30; i++) {
    const drone = faker.helpers.arrayElement(drones);
    const performed = addDays(now, -faker.number.int({ min: 0, max: 120 }));
    const fh =
      drone.totalFlightHours +
      faker.number.float({ min: -0.5, max: 0.5, multipleOf: 0.5 });
    const log = maintenanceRepo.create({
      drone,
      type: faker.helpers.arrayElement(maintenanceTypes),
      technicianName: faker.person.fullName(),
      notes:
        faker.helpers.maybe(() => faker.lorem.paragraph(), {
          probability: 0.4,
        }) ?? null,
      datePerformed: performed,
      flightHoursAtMaintenance: Math.max(0, fh),
    });
    maintenanceLogs.push(log);
  }

  await maintenanceRepo.save(maintenanceLogs);

  // Update drones maintenance pointers based on latest maintenance log (best-effort)
  for (const d of drones) {
    const latest = maintenanceLogs
      .filter((l) => l.drone.id === d.id)
      .sort((a, b) => b.datePerformed.getTime() - a.datePerformed.getTime())[0];
    if (!latest) continue;
    d.lastMaintenanceDate = latest.datePerformed;
    d.lastMaintenanceFlightHours = latest.flightHoursAtMaintenance;
    d.nextMaintenanceDueDate = addDays(latest.datePerformed, 90);
  }
  await droneRepo.save(drones);

  await AppDataSource.destroy();

  console.log('Seed completed:', {
    drones: 20,
    missions: 50,
    maintenanceLogs: 30,
  });
}

main().catch(async (err) => {
  console.error(err);
  try {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  } catch {
    // ignore
  }
  process.exit(1);
});
