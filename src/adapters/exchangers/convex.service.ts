import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class ConvexService {
    private readonly logger = new Logger(ConvexService.name);

    BASE_API_URL = 'https://www.convexfinance.com';
    API = 'api';
    UNDER_DEX = 'curve';
    POOL_CHAIN = 'pools-arbitrum';

    APR_API_URL = 'https://www.convexfinance.com';
    APYS = 'curve-arbitrum-apys';

    async getPoolsData(): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.API}/${this.UNDER_DEX}/${this.POOL_CHAIN}`;
        console.log("Load data by url:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then(async (data): Promise<PoolData[]> => {
                let pools: PoolData[] = [];
                const pairs = data.data.pools;

                let itemCount = 0;
                pairs.forEach((item) => {
                    if (
                        item &&
                        item.symbol &&
                        AdaptersService.OVN_POOLS_NAMES.some((str) =>
                            item.symbol.toLowerCase().includes(str),
                        )
                    ) {
                        const poolData: PoolData = new PoolData();

                        poolData.address = item.address;
                        poolData.name = item.coins[0].symbol + '/' + item.coins[1].symbol.replace('BP-f', '');
                        poolData.decimals = item.decimals[0];
                        poolData.tvl = (item.usdTotal).toString();

                        poolData.apr = null;
                        poolData.chain = ChainType.ARBITRUM;
                        poolData.metaData = item.convexPoolData && item.convexPoolData.id ? (item.convexPoolData.id).toString() : null
                        pools.push(poolData);
                        this.logger.log(`========= ${ExchangerType.CONVEX} =========`);
                        itemCount++;
                        this.logger.log('Found ovn pool #: ', itemCount);
                        this.logger.log('Found ovn pool: ', poolData);
                        this.logger.log('==================');
                    }
                });

                pools = await this.initApr(pools);
                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.CONVEX} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    private async initApr(ovnPool: PoolData[]): Promise<PoolData[]> {
        const url = `${this.APR_API_URL}/${this.API}/${this.APYS}`;
        console.log("Get apr by url: ", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then(async (data): Promise<PoolData[]> => {
                const pairs = data.data;
                ovnPool.forEach(pool => {
                    const chainName = pool.chain.toLowerCase();
                    const pairKey = chainName + '-' + pool.address.toLocaleLowerCase() + '-' + pool.metaData
                    console.log("Pair key for apys: ", pairKey)
                    const apr = pairs.apys[pairKey].baseApy + pairs.apys[pairKey].crvApy;
                    pool.apr = apr ? apr.toString() : null;
                });
                return ovnPool;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.CONVEX} pairs. url: ${url}`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}
