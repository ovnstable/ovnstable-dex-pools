import { Injectable, Logger } from '@nestjs/common';
import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';
import { BeethovenService } from './exchangers/beethoven.service';
import { ThenaService } from './exchangers/thena.service';
import { VelocoreService } from './exchangers/velocore.service';
import { VelodromeService } from './exchangers/velodrome.service';
import { WombatService } from './exchangers/wombat.service';
import { PoolData } from './exchangers/dto/pool.data.dto';
import { SoluneaService } from './exchangers/solunea.service';
import { CronosService } from './exchangers/cronos.service';
import { VesyncService } from "./exchangers/vesync.service";
import { PearlService } from "./exchangers/pearl.service";
import { VeplusService } from "./exchangers/veplus.service";
import { GndService } from "./exchangers/gnd.service";
import { DraculaService } from "./exchangers/dracula.service";
import { DefiedgeService } from "./exchangers/defiedge.service";
import { MaverickService } from "./exchangers/maverick.service";
import { CurveService } from './exchangers/curve.service';
import { VelocimeterService } from "./exchangers/velocimeter.service";
import { BaseswapService } from './exchangers/baseswap.service';
import { SwapbasedService } from './exchangers/swapbased.service';
import { ShekelswapService } from './exchangers/shekelswap.service';
import { AlienbaseService } from "./exchangers/alienbase.service";
import { BalancerService } from './exchangers/balancer.service';
import { ConvexService } from "./exchangers/convex.service";
import { AerodromeService } from './exchangers/aerodrome.service';
import { BeefylService } from "./exchangers/beefy.service";
import {BaseswapdefiedgeService} from "./exchangers/baseswapdefiedge.service";
import { HorizaSwapService } from './exchangers/horiza.service';

@Injectable()
export class AdaptersService {
  private readonly logger = new Logger(AdaptersService.name);

  static OVN_POOLS_NAMES: string[] = ['usd+', 'dai+', 'usdt+', 'eth+', 'ovn'];

  constructor(
    private beethovenService: BeethovenService,
    private thenaService: ThenaService,
    private velocoreService: VelocoreService,
    private velodromService: VelodromeService,
    private wombatService: WombatService,
    private soluneaService: SoluneaService,
    private cronosService: CronosService,
    private vesyncService: VesyncService,
    private pearlService: PearlService,
    private veplusService: VeplusService,
    private gndService: GndService,
    private draculaService: DraculaService,
    private defiedgeService: DefiedgeService,
    private maverickService: MaverickService,
    private curveService: CurveService,
    private velocimeterService: VelocimeterService,
    private baseswapService: BaseswapService,
    private swapbasedService: SwapbasedService,
    private alienbaseService: AlienbaseService,
    private balancerService: BalancerService,
    private convexService: ConvexService,
    private aerodromeService: AerodromeService,
    private beefylService: BeefylService,
    private baseswapdefiedgeService: BaseswapdefiedgeService,
    private shekelswapService: ShekelswapService,
    private horizaSwapService: HorizaSwapService,
  ) {}
  async getPools(exchanger_type: ExchangerType): Promise<PoolData[]> {
    if (exchanger_type === ExchangerType.BEETHOVEN) {
      return await this.beethovenService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.THENA) {
      return await this.thenaService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.VELOCORE) {
      return await this.velocoreService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.VELODROME) {
      return await this.velodromService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.WOMBAT) {
      return await this.wombatService.getPoolsData();
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
    if (exchanger_type === ExchangerType.DEFIEDGE) {
      return await this.defiedgeService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.MAVERICK) {
      return await this.maverickService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.CURVE) {
      return await this.curveService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.VELOCIMETER) {
      return await this.velocimeterService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.BASESWAP) {
      return await this.baseswapService.getPoolsData();
    }
   if (exchanger_type === ExchangerType.SWAPBASED) {
     return await this.swapbasedService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.ALIENBASE) {
      return await this.alienbaseService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.BALANCER) {
      return await this.balancerService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.CONVEX) {
      return await this.convexService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.AERODROME) {
      return await this.aerodromeService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.BEEFY) {
      return await this.beefylService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.BASESWAPDEFIEDGE) {
      return await this.baseswapdefiedgeService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.SHEKEL) {
      return await this.shekelswapService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.HORIZA) {
      return await this.horizaSwapService.getPoolsData();
    }

    this.logger.error(
      `Error when get pools data. Exchange type not found: ${exchanger_type}`,
    );
  }
}
