import { Controller, Get, Param } from '@nestjs/common';
import { PoolService } from './pool.service';
import { PoolDto } from './models/dto/pool.dto';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolService: PoolService) {}

  @Get('/all')
  async findAll(): Promise<PoolDto[]> {
    return this.poolService.getAll();
  }

  @Get('/:address')
  async findOne(@Param('address') address: string): Promise<PoolDto> {
    return this.poolService.getByAddress(address);
  }
}
