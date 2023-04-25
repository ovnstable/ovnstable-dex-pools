import { Injectable, Logger } from '@nestjs/common';
import { Exchanger } from 'src/exchanger/models/entities/exchanger.entity';
import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';
import { BeethovenService } from './exchangers/beethoven.service';
import { RamsesService } from './exchangers/ramses.service';
import { ThenaService } from './exchangers/thena.service';
import { VelocoreService } from './exchangers/velocore.service';
import { VelodromeService } from './exchangers/velodrome.service';
import { WombatService } from './exchangers/wombat.service';
import { PoolData } from './exchangers/dto/pool.data.dto';

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
  ) {}
  async getPools(exchanger: Exchanger): Promise<PoolData[]> {
    if (exchanger.exchanger_type === ExchangerType.BEETHOVEN) {
      return await this.beethovenService.getPoolsData();
    }
    if (exchanger.exchanger_type === ExchangerType.RAMSES) {
      return this.ramsesService.getPoolsData();
    }
    if (exchanger.exchanger_type === ExchangerType.THENA) {
      return await this.thenaService.getPoolsData();
    }
    if (exchanger.exchanger_type === ExchangerType.VELOCORE) {
      return await this.velocoreService.getPoolsData();
    }
    if (exchanger.exchanger_type === ExchangerType.VELODROME) {
      return await this.velodromService.getPoolsData();
    }
    if (exchanger.exchanger_type === ExchangerType.WOMBAT) {
      return await this.wombatService.getPoolsData();
    }

    this.logger.error(
      `Error when get pools data. Exhange type not found: ${exchanger.exchanger_type}`,
    );
  }

  //  processPool(pool: Pool, exchanger: Exchanger) {
  //    throw new Error('Method not implemented.');
  //      console.log("Pool: ", pool)
  //      console.log("Exchanger: ", pool)
  //  }
}
