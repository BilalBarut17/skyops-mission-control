import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { DroneModel } from '../../common/enums/drone-model.enum';
import { DroneStatus } from '../../common/enums/drone-status.enum';

export class CreateDroneDto {
  @IsString()
  @Matches(/^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
    message: 'serialNumber must match SKY-XXXX-XXXX',
  })
  serialNumber!: string;

  @IsEnum(DroneModel)
  model!: DroneModel;

  @IsEnum(DroneStatus)
  @IsOptional()
  status?: DroneStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalFlightHours?: number;

  @IsDateString()
  @IsOptional()
  lastMaintenanceDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lastMaintenanceFlightHours?: number;

  @IsDateString()
  @IsOptional()
  nextMaintenanceDueDate?: string;
}
