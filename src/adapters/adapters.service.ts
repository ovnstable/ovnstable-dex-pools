import { Injectable, Logger } from '@nestjs/common';
import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';
import { VelodromeService } from './exchangers/velodrome.service';
import { PoolData } from './exchangers/dto/pool.data.dto';
import { VeplusService } from './exchangers/veplus.service';
import { GndService } from './exchangers/gnd.service';
import { CurveService } from './exchangers/curve.service';
import { PancakeService } from './exchangers/pancake.service';
import { AerodromeService } from './exchangers/aerodrome.service';
import { BeefylService } from './exchangers/beefy.service';
import { LynexService } from './exchangers/lynex.service';
import { FraxService } from './exchangers/frax.service';
import { SwapBlastService } from './exchangers/swapblast.service';
import { ConvexService } from './exchangers/convex.service';
import { SwapBasedService } from './exchangers/swapbased.service';
import { ThrusterService } from './exchangers/thruster.service';
import { AmbientService } from './exchangers/ambient.service';
import { BladeSwapService } from './exchangers/bladeswap.service';
import { TraderJoeService } from './exchangers/traderjoe.service';

@Injectable()
export class AdaptersService {
  private readonly logger = new Logger(AdaptersService.name);

  static OVN_POOLS_NAMES: string[] = ['usd+', 'dai+', 'usdt+', 'eth+', 'ovn'];

  constructor(
    private velodromService: VelodromeService,
    private veplusService: VeplusService,
    private gndService: GndService,
    private curveService: CurveService,
    private aerodromeService: AerodromeService,
    private beefylService: BeefylService,
    private pancakeService: PancakeService,
    private lynexService: LynexService,
    private fraxService: FraxService,
    private swapblastServuce: SwapBlastService,
    private swapBasedService: SwapBasedService,
    private convexService: ConvexService,
    private thrusterService: ThrusterService,
    private ambientService: AmbientService,
    private bladeSwapService: BladeSwapService,
    private traderJoeService: TraderJoeService,
  ) {}
  async getPools(exchanger_type: ExchangerType): Promise<PoolData[]> {
    if (exchanger_type === ExchangerType.VELODROME) {
      return await this.velodromService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.VEPLUS) {
      return await this.veplusService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.GND) {
      return await this.gndService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.CURVE) {
      return await this.curveService.getPoolsData();
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
    if (exchanger_type === ExchangerType.SWAPBLAST) {
      return await this.swapblastServuce.getPoolsData();
    }
    if (exchanger_type === ExchangerType.SWAPBASED) {
      return await this.swapBasedService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.CONVEX) {
      return await this.convexService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.THRUSTER) {
      return await this.thrusterService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.AMBIENT) {
      return await this.ambientService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.BLADESWAP) {
      return await this.bladeSwapService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.TRADERJOE) {
      return await this.traderJoeService.getPoolsData();
    }

    this.logger.error(`Error when get pools data. Exchange type not found: ${exchanger_type}`);
  }
}
