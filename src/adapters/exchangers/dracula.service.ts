import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class DraculaService {
    private readonly logger = new Logger(DraculaService.name);
    // add link to dracula and form a link to a pool or api
    BASE_API_URL = 'https://api-dex.draculafi.xyz';
    METHOD_GET_PAIRS = 'pairs';

    async getPoolsData(): Promise<PoolData[]> {
        // Form a link here
        const url = `${this.BASE_API_URL}/${this.METHOD_GET_PAIRS}`;
        console.log("Load data by URL:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then((data): PoolData[] => {
                const pools: PoolData[] = [];
//        console.log('Response data: ', data.data);
                const pairs = data.data.pairs;
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
                        poolData.name = item.symbol;
                        poolData.decimals = item.decimals;
                        poolData.tvl = (item.reserve0 + item.reserve1).toString();
                        poolData.apr = null;
                        poolData.chain = ChainType.ZKSYNC;
                        pools.push(poolData);
                        this.logger.log(`========= ${ExchangerType.DRACULA} =========`);
                        itemCount++;
                        this.logger.log('Found ovn pool #: ', itemCount);
                        this.logger.log('Found ovn pool: ', poolData);
                        this.logger.log('==================');
                    }
                });

                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.DRACULA} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}

