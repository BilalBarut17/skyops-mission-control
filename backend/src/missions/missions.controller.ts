import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateMissionDto } from './dto/create-mission.dto';
import { CompleteMissionDto } from './dto/complete-mission.dto';
import { AbortMissionDto } from './dto/abort-mission.dto';
import { ListMissionsQueryDto } from './dto/list-missions-query.dto';
import { MissionsService } from './missions.service';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  async list(@Query() query: ListMissionsQueryDto) {
    return this.missionsService.findAll(query);
  }

  @Post()
  async create(@Body() dto: CreateMissionDto) {
    return this.missionsService.create(dto);
  }

  @Patch(':id/pre-flight-check')
  async preFlightCheck(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.missionsService.transitionToPreFlightCheck(id);
  }

  @Patch(':id/start')
  async start(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.missionsService.transitionToInProgress(id);
  }

  @Patch(':id/complete')
  async complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CompleteMissionDto,
  ) {
    return this.missionsService.completeMission(id, dto);
  }

  @Patch(':id/abort')
  async abort(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AbortMissionDto,
  ) {
    return this.missionsService.abortMission(id, dto);
  }
}
