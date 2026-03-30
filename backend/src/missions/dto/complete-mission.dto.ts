import { IsNumber, Min } from 'class-validator';

export class CompleteMissionDto {
  @IsNumber()
  @Min(0)
  flightHoursLogged!: number;
}
