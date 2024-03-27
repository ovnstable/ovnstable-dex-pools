import { Controller, Get, Param, Query } from '@nestjs/common';
import { ExchangerService } from './exchanger.service';
import { ExchangerType } from './models/inner/exchanger.type';

@Controller('exchanger')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangerService) {}

  @Get('/sync/all')
  async syncAll(): Promise<any> {
    return await this.exchangeService.updateAllPools();
  }

  @Get('/sync/:exchanger')
  async syncOne(@Param('exchanger') exchanger: string): Promise<any> {
    return await this.exchangeService.updateSinglePool(ExchangerType[exchanger.toUpperCase()]);
  }
}
