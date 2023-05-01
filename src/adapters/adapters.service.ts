import { Injectable, Logger } from '@nestjs/common';
import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';
import { BeethovenService } from './exchangers/beethoven.service';
import { RamsesService } from './exchangers/ramses.service';
import { ThenaService } from './exchangers/thena.service';
import { VelocoreService } from './exchangers/velocore.service';
import { VelodromeService } from './exchangers/velodrome.service';
import { WombatService } from './exchangers/wombat.service';
import { PoolData } from './exchangers/dto/pool.data.dto';
import { SoluneaService } from "./exchangers/solunea.service";

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

        this.logger.error(
            `Error when get pools data. Exchange type not found: ${exchanger_type}`,
        );
    }
}
