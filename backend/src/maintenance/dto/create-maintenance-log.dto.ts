import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { MaintenanceType } from '../../common/enums/maintenance-type.enum';

export class CreateMaintenanceLogDto {
  @IsUUID()
  droneId!: string;

  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  @IsString()
  @IsNotEmpty()
  technicianName!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  datePerformed!: string;

  @IsNumber()
  @Min(0)
  flightHoursAtMaintenance!: number;
}
