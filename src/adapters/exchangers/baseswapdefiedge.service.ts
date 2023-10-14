import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import axios from "axios";

@Injectable()
export class BaseswapdefiedgeService {
    private readonly logger = new Logger(BaseswapdefiedgeService.name);

    POOLS_CONFIGURATION_LIST = [
        {
            name: 'USDC/OVN',
            poolAddress: '0xdc5c6b2145b8c37676142a6264fdd55f8f20b10c',
            chainType: ChainType.BASE,
            tokens: [
                '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
                '0xa3d1a8deb97b111454b294e2324efad13a9d8396'
            ]
        },
        {
            name: 'USDC/USD+',
            poolAddress: '0x075c2d4f7404727f48c5d617ef0a195e0b4623a0',
            chainType: ChainType.BASE,
            tokens: [
                '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
                '0xb79dd08ea68a908a97220c76d19a6aa9cbde4376'
            ]
        }
    ]

    BASE_URL = 'https://baseswap.defiedge.io';
    BASE_API_URL = 'https://api.defiedge.io';
    TOKEN = 'token';

    async getPoolsData(): Promise<PoolData[]> {
        const pools: PoolData[] = [];

        // Map the array of configurations to an array of promises
        const promises = this.POOLS_CONFIGURATION_LIST.map(async (poolConfiguration) => {
            const urls = [
                `${this.BASE_URL}/${this.TOKEN}/${poolConfiguration.chainType}/${poolConfiguration.tokens[0]}`,
                `${this.BASE_URL}/${this.TOKEN}/${poolConfiguration.chainType}/${poolConfiguration.tokens[1]}`
            ];

            console.log("Load data by urls:", urls);

            try {
                const [data1, data2] = await Promise.all([
                    axios.get(urls[0], { timeout: 80000 }),  // 80 sec
                    axios.get(urls[1], { timeout: 80000 })   // 80 sec
                ]);

                const poolName = `${data1.data.symbol}/${data2.data.symbol}`;

                const poolData: PoolData = new PoolData();
                poolData.address = poolConfiguration.poolAddress;
                poolData.name = poolName;
                poolData.decimals = null;
                poolData.apr = await this.getApr(poolConfiguration.poolAddress);
                poolData.tvl = await this.getTvl(poolConfiguration.poolAddress);
                poolData.chain = poolConfiguration.chainType;
                pools.push(poolData);

            } catch (e) {
                const errorMessage = `Error when load ${ExchangerType.BASESWAPDEFIEDGE} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            }
        });

        await Promise.all(promises);

        return pools;
    }

    async getTvl(address: string): Promise<string> {
        const url = this.BASE_API_URL + `/${ChainType.BASE.toLocaleLowerCase()}/${address}/details`
        console.log("Get tvl by url: ", url);
        try {
            const response = await axios.get(url);
            return response.data.aum;
        } catch (error) {
            console.log("Error when get tvl.", error);
        }
    }

    async getApr(address: string): Promise<string> {
        const url = this.BASE_API_URL + `/${ChainType.BASE.toLocaleLowerCase()}/${address}/details`
        console.log("Get apr by url: ", url);
        try {
            const response = await axios.get(url);
            return response.data.totalApy;
        } catch (error) {
            console.log("Error when get apr.", error);
        }
    }


}
