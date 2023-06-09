import { Module, OnModuleInit } from "@nestjs/common";
import { AdaptersService } from './adapters.service';
import { BeethovenService } from './exchangers/beethoven.service';
import { RamsesService } from './exchangers/ramses.service';
import { ThenaService } from './exchangers/thena.service';
import { VelocoreService } from './exchangers/velocore.service';
import { VelodromeService } from './exchangers/velodrome.service';
import { WombatService } from './exchangers/wombat.service';
import { SoluneaService } from './exchangers/solunea.service';
import { CronosService } from './exchangers/cronos.service';
import { VesyncService } from "./exchangers/vesync.service";
import { ExternalModule } from "src/external/external.module";
import { PearlService } from "./exchangers/pearl.service";
import { VeplusService } from "./exchangers/veplus.service";
import { GndService } from "./exchangers/gnd.service";
// import { DraculaService } from "./exchangers/dracula.service";

//
@Module({
  imports: [ExternalModule],
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
    CronosService,
    VesyncService,
    PearlService,
    VeplusService,
    GndService,
    // DraculaService,
  ],
  exports: [AdaptersService],
})
export class AdaptersModule implements OnModuleInit {


  constructor(private cronosService: CronosService) {
  }

  async onModuleInit() {
    console.log(`Initialization adapters...`);
    await this.cronosService.loadGaugeContracts();
  }
}
