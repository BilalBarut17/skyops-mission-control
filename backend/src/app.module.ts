import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DronesModule } from './drones/drones.module';
import { MissionsModule } from './missions/missions.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { FleetModule } from './fleet/fleet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgres://postgres:postgres@localhost:5432/skyops_mission_control',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
      logging: process.env.TYPEORM_LOGGING === 'true',
    }),
    DronesModule,
    MissionsModule,
    MaintenanceModule,
    FleetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
