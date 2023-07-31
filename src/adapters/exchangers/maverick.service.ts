import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class MaverickService {
    private readonly logger = new Logger(MaverickService.name);
    BASE_API_URL = 'https://api.mav.xyz/api/';
    POOLS = 'pools';
    CHAIN = '324'

    async getPoolsData(): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.POOLS}/${this.CHAIN}`;
        console.log("Load data by url:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then((data): PoolData[] => {
                const pools: PoolData[] = [];
                // console.log('Response data: ', data.data);
                const pairs = data.data.pools;
                let itemCount = 0;
                pairs.forEach((item) => {
                    if (
                        item &&
                        item.name &&
                        AdaptersService.OVN_POOLS_NAMES.some((str) =>
                            item.name.toLowerCase().includes(str),
                        )
                    ) {
                        const poolData: PoolData = new PoolData();

                        poolData.address = item.id;
                        poolData.name = item.name;
                        poolData.decimals = item.tokenBData.decimals;
                        poolData.tvl = (item.tvl.amount).toString();
                        poolData.apr = (item.topBin.annualizedFeeGrowth * 100).toFixed(2);
                        poolData.chain = ChainType.ZKSYNC;
                        pools.push(poolData);
                        this.logger.log(`========= ${ExchangerType.MAVERICK} =========`);
                        itemCount++;
                        this.logger.log('Found ovn pool #: ', itemCount);
                        this.logger.log('Found ovn pool: ', poolData);
                        this.logger.log('==================');
                    }
                });

                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.MAVERICK} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}
