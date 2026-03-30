import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1774872334972 implements MigrationInterface {
  name = 'Init1774872334972';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."drones_model_enum" AS ENUM('PHANTOM_4', 'MATRICE_300', 'MAVIC_3_ENTERPRISE')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."drones_status_enum" AS ENUM(
                'AVAILABLE',
                'IN_MISSION',
                'MAINTENANCE',
                'RETIRED'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "drones" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "serialNumber" character varying NOT NULL,
                "model" "public"."drones_model_enum" NOT NULL,
                "status" "public"."drones_status_enum" NOT NULL DEFAULT 'AVAILABLE',
                "totalFlightHours" double precision NOT NULL DEFAULT '0',
                "lastMaintenanceFlightHours" double precision NOT NULL DEFAULT '0',
                "lastMaintenanceDate" date,
                "nextMaintenanceDueDate" date,
                "registrationTimestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_6bb8e28fb98e053a8f69a732c5b" UNIQUE ("serialNumber"),
                CONSTRAINT "PK_3137fc855d37186eeccd193569f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_e98f851ed2140771d18682f52d" ON "drones" ("status")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."missions_missiontype_enum" AS ENUM(
                'WIND_TURBINE_INSPECTION',
                'SOLAR_PANEL_SURVEY',
                'POWER_LINE_PATROL'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."missions_status_enum" AS ENUM(
                'PLANNED',
                'PRE_FLIGHT_CHECK',
                'IN_PROGRESS',
                'COMPLETED',
                'ABORTED'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "missions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(200) NOT NULL,
                "missionType" "public"."missions_missiontype_enum" NOT NULL,
                "pilotName" character varying(120) NOT NULL,
                "siteLocation" character varying(200) NOT NULL,
                "plannedStart" TIMESTAMP WITH TIME ZONE NOT NULL,
                "plannedEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
                "actualStart" TIMESTAMP WITH TIME ZONE,
                "actualEnd" TIMESTAMP WITH TIME ZONE,
                "status" "public"."missions_status_enum" NOT NULL DEFAULT 'PLANNED',
                "flightHoursLogged" double precision,
                "abortReason" text,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "droneId" uuid NOT NULL,
                CONSTRAINT "PK_787aebb1ac5923c9904043c6309" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_fc7a9819a46e269520e441a6a4" ON "missions" ("status")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."maintenance_logs_type_enum" AS ENUM(
                'ROUTINE_CHECK',
                'BATTERY_REPLACEMENT',
                'MOTOR_REPAIR',
                'FIRMWARE_UPDATE',
                'FULL_OVERHAUL'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "maintenance_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" "public"."maintenance_logs_type_enum" NOT NULL,
                "technicianName" character varying(160) NOT NULL,
                "notes" text,
                "datePerformed" TIMESTAMP WITH TIME ZONE NOT NULL,
                "flightHoursAtMaintenance" double precision NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "droneId" uuid NOT NULL,
                CONSTRAINT "PK_096e4b6bb7c9fe74d960e7523e4" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "missions"
            ADD CONSTRAINT "FK_86bac30e037b31a90418aba5045" FOREIGN KEY ("droneId") REFERENCES "drones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "maintenance_logs"
            ADD CONSTRAINT "FK_d802f1c5cb628a96ddb0d938068" FOREIGN KEY ("droneId") REFERENCES "drones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "maintenance_logs" DROP CONSTRAINT "FK_d802f1c5cb628a96ddb0d938068"
        `);
    await queryRunner.query(`
            ALTER TABLE "missions" DROP CONSTRAINT "FK_86bac30e037b31a90418aba5045"
        `);
    await queryRunner.query(`
            DROP TABLE "maintenance_logs"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."maintenance_logs_type_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_fc7a9819a46e269520e441a6a4"
        `);
    await queryRunner.query(`
            DROP TABLE "missions"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."missions_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."missions_missiontype_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_e98f851ed2140771d18682f52d"
        `);
    await queryRunner.query(`
            DROP TABLE "drones"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."drones_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."drones_model_enum"
        `);
  }
}
