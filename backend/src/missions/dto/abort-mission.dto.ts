import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AbortMissionDto {
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  abortReason!: string;
}
