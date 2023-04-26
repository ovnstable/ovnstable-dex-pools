import { Controller, Get } from '@nestjs/common';
import { ExchangerService } from './exchanger.service';

@Controller('exchanger')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangerService) {}

  @Get('/sync/all')
  async sync(): Promise<any> {
    return await this.exchangeService.updateAllPools();
  }
}
