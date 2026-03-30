import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { DroneModel } from '../../common/enums/drone-model.enum';
import { DroneStatus } from '../../common/enums/drone-status.enum';

export class ListDronesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsEnum(DroneStatus)
  @IsOptional()
  status?: DroneStatus;

  @IsEnum(DroneModel)
  @IsOptional()
  model?: DroneModel;
}
