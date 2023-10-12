import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import axios from "axios";
import {AdaptersService} from "../adapters.service";

@Injectable()
export class BalancerService {
    private readonly logger = new Logger(BalancerService.name);

     POOLS_CONFIGURATION_LIST = [
         {
             name: "OVN/wUSD+",
             address: "0x85ec6ae01624ae0d2a04d0ffaad3a25884c7d0f3",
             addressPostfix: "0002000000000000000004b6"
         }
    ]

    BASE_API_URL = 'https://api.balancer.fi';
    POOL = 'pools';
    CHAIN = '42161';

    // symbol replace
    // https://api.balancer.fi/pools/42161/0xa8af146d79ac0bb981e4e0d8b788ec5711b1d5d000000000000000000000047b строим ссылку, пробегаемся и сканим

    async getPoolsData(): Promise<PoolData[]> {
        const pools: PoolData[] = [];

        for (let i = 0; i < this.POOLS_CONFIGURATION_LIST.length; i++) {
            const poolConfiguration = this.POOLS_CONFIGURATION_LIST[i];

            const url = `${this.BASE_API_URL}/${this.POOL}/${this.CHAIN}/${poolConfiguration.address}${poolConfiguration.addressPostfix}`;
            console.log("Load data by url:", url);

            await axios
                .get(url, {
                    timeout: 80_000, // 80 sec
                })
                .then((data): void => {
                    const item = data.data;
                    // console.log("DATA:", data.data);

                    const poolData: PoolData = new PoolData();

                    poolData.address = item.address;
                    poolData.name = item.tokens[0].symbol + '/' + item.tokens[1].symbol;
                    poolData.decimals = item.tokens[0].decimals;
                    poolData.tvl = item.totalLiquidity.toString();
                    poolData.apr = (item.apr.max / 100).toString();
                    poolData.chain = ChainType.ARBITRUM;

                    pools.push(poolData);

                    this.logger.log(`========= ${ExchangerType.BALANCER} =========`);
                    this.logger.log('Found ovn pool: ', poolData);
                    this.logger.log('==================');

                })
                .catch((e) => {
                    const errorMessage = `Error when load ${ExchangerType.BALANCER} pairs.`;
                    this.logger.error(errorMessage, e);
                    throw new ExchangerRequestError(errorMessage);
                });
        }
        return pools;
    }
}