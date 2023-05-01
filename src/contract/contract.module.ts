import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {Contract} from "./models/contract.entity";
import {ContractService} from "./contract.service";

@Module({
  imports: [TypeOrmModule.forFeature([Contract])],
  providers: [ContractService],
  controllers: [],
  exports: [ContractService],
})
export class ContractModule {}
