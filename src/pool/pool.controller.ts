import { Controller, Get, Post, Body } from '@nestjs/common';
import { PoolService } from './pool.service';
import { Pool } from './models/entities/pool.entity';

@Controller('pool')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get()
  async findAll(): Promise<Pool[]> {
    return this.poolService.findAll();
  }

  @Post()
  async create(@Body() pool: Pool): Promise<Pool> {
    return this.poolService.create(pool);
  }
}
