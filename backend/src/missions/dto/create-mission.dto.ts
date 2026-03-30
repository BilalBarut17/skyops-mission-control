import {
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { MissionType } from '../../common/enums/mission-type.enum';

export class CreateMissionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(MissionType)
  missionType!: MissionType;

  @IsUUID()
  droneId!: string;

  @IsString()
  @IsNotEmpty()
  pilotName!: string;

  @IsString()
  @IsNotEmpty()
  siteLocation!: string;

  @IsDateString()
  plannedStart!: string;

  @IsDateString()
  plannedEnd!: string;
}
