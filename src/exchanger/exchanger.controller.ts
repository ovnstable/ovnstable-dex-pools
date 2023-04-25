import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ExchangerService } from './exchanger.service';
import { Exchanger } from './models/entities/exchanger.entity';

@Controller('exchanger')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangerService) {}

  @Get()
  async findAll(): Promise<Exchanger[]> {
    return this.exchangeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Exchanger> {
    return this.exchangeService.findOne(id);
  }

  @Post()
  async create(@Body() exchange: Exchanger): Promise<Exchanger> {
    return this.exchangeService.create(exchange);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() exchange: Exchanger,
  ): Promise<Exchanger> {
    return this.exchangeService.update(id, exchange);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.exchangeService.delete(id);
  }

  @Get('/sync/all')
  async sync(): Promise<any> {
    return await this.exchangeService.updateAllPools();
  }
}
