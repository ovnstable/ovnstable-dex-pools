import { Module } from '@nestjs/common';
import { AdaptersService } from './adapters.service';
import { BeethovenService } from './exchangers/beethoven.service';
import { RamsesService } from './exchangers/ramses.service';
import { ThenaService } from './exchangers/thena.service';
import { VelocoreService } from './exchangers/velocore.service';
import { VelodromeService } from './exchangers/velodrome.service';
import { WombatService } from './exchangers/wombat.service';
import { SoluneaService } from './exchangers/solunea.service';
//
@Module({
  providers: [
    AdaptersService,
    // Exchangers:
    BeethovenService,
    RamsesService,
    ThenaService,
    VelocoreService,
    VelodromeService,
    WombatService,
    SoluneaService,
  ],
  exports: [AdaptersService],
})
export class AdaptersModule {}
