import { Injectable, Logger } from '@nestjs/common';
import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';
import { BeethovenService } from './exchangers/beethoven.service';
import { RamsesService } from './exchangers/ramses.service';
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

@Injectable()
export class AdaptersService {
  private readonly logger = new Logger(AdaptersService.name);

  static OVN_POOLS_NAMES: string[] = ['usd+', 'dai+', 'usdt+'];

  constructor(
    private beethovenService: BeethovenService,
    private ramsesService: RamsesService,
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
  ) {}
  async getPools(exchanger_type: ExchangerType): Promise<PoolData[]> {
    if (exchanger_type === ExchangerType.BEETHOVEN) {
      return await this.beethovenService.getPoolsData();
    }
    if (exchanger_type === ExchangerType.RAMSES) {
      return this.ramsesService.getPoolsData();
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

    this.logger.error(
      `Error when get pools data. Exchange type not found: ${exchanger_type}`,
    );
  }
}
