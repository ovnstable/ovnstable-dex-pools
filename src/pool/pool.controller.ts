import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { PoolService } from './pool.service';
import { Pool } from './models/entities/pool.entity';

@Controller('pool')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get()
  async findAll(): Promise<Pool[]> {
    return this.poolService.findAll(false);
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Pool> {
    return this.poolService.findOne(id);
  }

  @Post()
  async create(@Body() pool: Pool): Promise<Pool> {
    return this.poolService.create(pool);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() pool: Pool): Promise<void> {
    await this.poolService.update(id, pool);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    await this.poolService.delete(id);
  }
}
