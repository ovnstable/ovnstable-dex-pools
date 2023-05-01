import {Module, OnModuleInit} from '@nestjs/common';

import { SkimService } from './skim.service';
import { SkimController } from './skim.controller';
import { AdaptersModule } from '../adapters/adapters.module';
import { PoolModule } from '../pool/pool.module';
import {ContractModule} from "../contract/contract.module";

@Module({
  imports: [AdaptersModule, PoolModule, ContractModule],
  providers: [SkimService],
  controllers: [SkimController],
  exports: [SkimService],
})
export class SkimModule  implements OnModuleInit {


  constructor(private skimService: SkimService) {
  }

  async onModuleInit() {
    console.log(`Initialization...`);
    await this.skimService.loadPayoutListenerContracts();
  }

}
