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

    BASE_API_URL = 'https://api.balancer.fi';
    POOL = 'pools';
    CHAIN = '42161';
    ADDRESS = '0xa8af146d79ac0bb981e4e0d8b788ec5711b1d5d0';
    ADDITION = '00000000000000000000047b';

    // лист адресов которые мы сканим
    // https://api.balancer.fi/pools/42161/0xa8af146d79ac0bb981e4e0d8b788ec5711b1d5d000000000000000000000047b строим ссылку, пробегаемся и сканим

    async getPoolsData(): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.POOL}/${this.CHAIN}/${this.ADDRESS}${this.ADDITION}`;
        console.log("Load data by url:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then((data): PoolData[] => {
                const pools: PoolData[] = [];

                const pairs = data.data;
                // console.log("DATA:", data.data);

                if (pairs) { // Check if pairs data exists
                    const item = pairs; // Since pairs is not an array, directly use it as the item

                    const regex = /(?<=bb-)[^+]+/

                    if (
                        item &&
                        item.tokens[0].symbol &&
                        AdaptersService.OVN_POOLS_NAMES.some((str) =>
                            item.tokens[0].symbol.toLowerCase().includes(str),
                        )
                    ) {
                        const poolData: PoolData = new PoolData();

                        poolData.address = item.address;
                        poolData.name = `${item.tokens[0].symbol.match(regex)}+/${item.tokens[1].symbol.match(regex)}+`;                        poolData.decimals = item.tokens[0].decimals;
                        poolData.tvl = item.totalLiquidity.toString();
                        poolData.apr = item.apr.min.toString();
                        poolData.chain = ChainType.ARBITRUM;

                        pools.push(poolData);

                        this.logger.log(`========= ${ExchangerType.BALANCER} =========`);
                        this.logger.log('Found ovn pool: ', poolData);
                        this.logger.log('==================');
                    }
                }

                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.BALANCER} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}