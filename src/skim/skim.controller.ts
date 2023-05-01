import { Controller, Get } from '@nestjs/common';
import { SkimService } from './skim.service';
import { Pool } from 'src/pool/models/entities/pool.entity';

@Controller('skim')
export class SkimController {
  constructor(private readonly skimService: SkimService) {}

  @Get('/getPools')
  async getPools(): Promise<Pool[]> {
    return await this.skimService.getPools();
  }

  @Get('/updatePools')
  async updatePools(): Promise<any> {
    return await this.skimService.updateSkims();
  }
}
