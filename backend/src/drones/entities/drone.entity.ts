import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DroneModel } from '../../common/enums/drone-model.enum';
import { DroneStatus } from '../../common/enums/drone-status.enum';

@Entity({ name: 'drones' })
@Index(['status'])
export class DroneEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  serialNumber!: string;

  @Column({ type: 'enum', enum: DroneModel })
  model!: DroneModel;

  @Column({ type: 'enum', enum: DroneStatus, default: DroneStatus.AVAILABLE })
  status!: DroneStatus;

  @Column({ type: 'float8', default: 0 })
  totalFlightHours!: number;

  // Used to evaluate the "every 50 flight hours OR every 90 days" rule.
  @Column({ type: 'float8', default: 0 })
  lastMaintenanceFlightHours!: number;

  @Column({ type: 'date', nullable: true })
  lastMaintenanceDate!: Date | null;

  @Column({ type: 'date', nullable: true })
  nextMaintenanceDueDate!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  registrationTimestamp!: Date;
}
