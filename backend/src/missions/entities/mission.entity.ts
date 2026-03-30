import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DroneEntity } from '../../drones/entities/drone.entity';
import { MissionStatus } from '../../common/enums/mission-status.enum';
import { MissionType } from '../../common/enums/mission-type.enum';

@Entity({ name: 'missions' })
@Index(['status'])
export class MissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'enum', enum: MissionType })
  missionType!: MissionType;

  @ManyToOne(() => DroneEntity, { nullable: false })
  @JoinColumn({ name: 'droneId' })
  drone!: DroneEntity;

  @Column({ type: 'varchar', length: 120 })
  pilotName!: string;

  @Column({ type: 'varchar', length: 200 })
  siteLocation!: string;

  @Column({ type: 'timestamptz' })
  plannedStart!: Date;

  @Column({ type: 'timestamptz' })
  plannedEnd!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actualStart!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actualEnd!: Date | null;

  @Column({ type: 'enum', enum: MissionStatus, default: MissionStatus.PLANNED })
  status!: MissionStatus;

  @Column({ type: 'float8', nullable: true })
  flightHoursLogged!: number | null;

  @Column({ type: 'text', nullable: true })
  abortReason!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
