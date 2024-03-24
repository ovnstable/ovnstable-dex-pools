import { Module, OnModuleInit } from "@nestjs/common";
import { AdaptersService } from './adapters.service';
import { VelocoreService } from './exchangers/velocore.service';
import { VelodromeService } from './exchangers/velodrome.service';
import { SoluneaService } from './exchangers/solunea.service';
import { CronosService } from './exchangers/cronos.service';
import { VesyncService } from "./exchangers/vesync.service";
import { ExternalModule } from "../external/external.module";
import { VeplusService } from "./exchangers/veplus.service";
import { GndService } from "./exchangers/gnd.service";
import { DraculaService } from "./exchangers/dracula.service";
import { MaverickService } from "./exchangers/maverick.service";
import { CurveService } from "./exchangers/curve.service";
import { BaseswapService } from "./exchangers/baseswap.service";
import { PancakeService } from "./exchangers/pancake.service";
import { AerodromeService } from "./exchangers/aerodrome.service";
import { BeefylService } from "./exchangers/beefy.service";
import { LynexService } from "./exchangers/lynex.service";
import { FraxService } from "./exchangers/frax.service";
import { SyncswapService } from "./exchangers/syncswap.service";

//
@Module({
  imports: [ExternalModule],
  providers: [
    AdaptersService,
    // Exchangers:
    VelocoreService,
    VelodromeService,
    SoluneaService,
    CronosService,
    VesyncService,
    VeplusService,
    GndService,
    DraculaService,
    MaverickService,
    CurveService,
    BaseswapService,
    AerodromeService,
    BeefylService,
    PancakeService,
    LynexService,
    FraxService,
    SyncswapService,
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
