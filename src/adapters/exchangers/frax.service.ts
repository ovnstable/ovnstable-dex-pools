import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class FraxService {
    private readonly logger = new Logger(FraxService.name);

    BASE_API_URL = 'https://api.frax.finance/v1/pools';

    async getPoolsData(): Promise<PoolData[]> {
        const url = this.BASE_API_URL;
        // const addressIds = ['0x56390acF12bce9675ab3922060D8d955149BE286'];
        // currently deprecated from 20.03.2024, remove later possibly
        const addressIds = [];

        console.log("Load data by url:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then(async (data): Promise<PoolData[]> => {
                const pools: PoolData[] = [];
                const poolData = data.data;

                let itemCount = 0;
                poolData.forEach((item) => {
                    if (!addressIds.includes(item?.farm_address)) return

                    const poolData: PoolData = new PoolData();

                    poolData.address = item.farm_address;
                    poolData.name = item.pair;
                    poolData.decimals = 0;
                    poolData.tvl = item.liquidity_locked ?? "0";

                    poolData.apr = item.apy;
                    poolData.chain = ChainType.ARBITRUM;
                    pools.push(poolData);
                    this.logger.log(`========= ${ExchangerType.FRAX} =========`);
                    itemCount++;
                    this.logger.log('Found ovn pool #: ', itemCount);
                    this.logger.log('Found ovn pool: ', poolData);
                    this.logger.log('==================');
                });

                console.log(pools, '----TOTAL')

                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.FRAX} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}
