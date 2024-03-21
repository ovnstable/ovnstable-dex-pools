import { Injectable, Logger } from '@nestjs/common';
import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';
import { VelocoreService } from './exchangers/velocore.service';
import { VelodromeService } from './exchangers/velodrome.service';
import { PoolData } from './exchangers/dto/pool.data.dto';
import { SoluneaService } from './exchangers/solunea.service';
import { CronosService } from './exchangers/cronos.service';
import { VesyncService } from "./exchangers/vesync.service";
import { PearlService } from "./exchangers/pearl.service";
import { VeplusService } from "./exchangers/veplus.service";
import { GndService } from "./exchangers/gnd.service";
import { DraculaService } from "./exchangers/dracula.service";
import { MaverickService } from "./exchangers/maverick.service";
import { CurveService } from './exchangers/curve.service';
import { BaseswapService } from './exchangers/baseswap.service';
import { SwapbasedService } from './exchangers/swapbased.service';
import { PancakeService } from './exchangers/pancake.service';
import { AerodromeService } from './exchangers/aerodrome.service';
import { BeefylService } from "./exchangers/beefy.service";
import { LynexService } from './exchangers/lynex.service';
import { FraxService } from './exchangers/frax.service';
import { SyncswapService } from './exchangers/syncswap.service';

@Injectable()
export class AdaptersService {
  private readonly logger = new Logger(AdaptersService.name);

  static OVN_POOLS_NAMES: string[] = ['usd+', 'dai+', 'usdt+', 'eth+', 'ovn'];

  constructor(
    private velocoreService: VelocoreService,
    private velodromService: VelodromeService,
    private soluneaService: SoluneaService,
    private cronosService: CronosService,
    private vesyncService: VesyncService,
    private pearlService: PearlService,
    private veplusService: VeplusService,
    private gndService: GndService,
    private draculaService: DraculaService,
    private maverickService: MaverickService,
    private curveService: CurveService,
    private baseswapService: BaseswapService,
    private swapbasedService: SwapbasedService,
    private aerodromeService: AerodromeService,
    private beefylService: BeefylService,
    private pancakeService: PancakeService,
    private lynexService: LynexService,
    private fraxService: FraxService,
    private syncswapService: SyncswapService,
  ) {}
  async getPools(exchanger_type: ExchangerType): Promise<PoolData[]> {
    if (exchanger_type === ExchangerType.SYNCSWAP) {
      return await this.syncswapService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.VELOCORE) {
      return await this.velocoreService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.VELODROME) {
      return await this.velodromService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.SOLUNEA) {
      return await this.soluneaService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.CHRONOS) {
      return await this.cronosService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.VESYNC) {
      return await this.vesyncService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.PEARL) {
      return await this.pearlService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.VEPLUS) {
      return await this.veplusService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.GND) {
      return await this.gndService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.DRACULA) {
      return await this.draculaService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.MAVERICK) {
      return await this.maverickService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.CURVE) {
      return await this.curveService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.BASESWAP) {
      return await this.baseswapService.getPoolsData();
    }
   if (exchanger_type === ExchangerType.SWAPBASED) {
     return await this.swapbasedService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.AERODROME) {
      return await this.aerodromeService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.BEEFY) {
      return await this.beefylService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.PANCAKE) {
      return await this.pancakeService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.LYNEX) {
      return await this.lynexService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.FRAX) {
      return await this.fraxService.getPoolsData();
    }

    this.logger.error(
      `Error when get pools data. Exchange type not found: ${exchanger_type}`,
    );
  }
}
