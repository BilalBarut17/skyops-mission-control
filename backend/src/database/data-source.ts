import { DataSource } from 'typeorm';
import 'dotenv/config';

// TypeORM CLI entry-point for migrations/seed scripts.
// We keep the same connection string as the Nest runtime module.
const url =
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5432/skyops_mission_control';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url,
  entities: ['src/**/*.entity{.ts,.js}'],
  synchronize: false,
  migrations: ['src/migrations/*.ts'],
  logging: process.env.TYPEORM_LOGGING === 'true',
});
