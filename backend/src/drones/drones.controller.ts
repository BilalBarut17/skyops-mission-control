import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateDroneDto } from './dto/create-drone.dto';
import { DronesService } from './drones.service';
import { ListDronesQueryDto } from './dto/list-drones-query.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';

@Controller('drones')
export class DronesController {
  constructor(private readonly dronesService: DronesService) {}

  @Get()
  async list(@Query() query: ListDronesQueryDto) {
    return this.dronesService.findAll(query);
  }

  @Post()
  async create(@Body() dto: CreateDroneDto) {
    return this.dronesService.create(dto);
  }

  @Get(':id')
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dronesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDroneDto,
  ) {
    return this.dronesService.update(id, dto);
  }

  // "Delete" is modeled as retirement to keep history and comply with fleet compliance needs.
  @Delete(':id')
  async retire(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dronesService.retire(id);
  }
}
