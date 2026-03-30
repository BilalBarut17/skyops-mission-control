import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DroneEntity } from '../../drones/entities/drone.entity';
import { MaintenanceType } from '../../common/enums/maintenance-type.enum';

@Entity({ name: 'maintenance_logs' })
export class MaintenanceLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DroneEntity, { nullable: false })
  @JoinColumn({ name: 'droneId' })
  drone!: DroneEntity;

  @Column({ type: 'enum', enum: MaintenanceType })
  type!: MaintenanceType;

  @Column({ type: 'varchar', length: 160 })
  technicianName!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamptz' })
  datePerformed!: Date;

  @Column({ type: 'float8' })
  flightHoursAtMaintenance!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
