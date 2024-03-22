import {Injectable, Logger} from "@nestjs/common";
import {PoolData} from "./dto/pool.data.dto";
import axios from "axios";
import {ExchangerRequestError} from "../../exceptions/exchanger.request.error";
import {ExchangerType} from "../../exchanger/models/inner/exchanger.type";
import {AdaptersService} from "../adapters.service";
import {ChainType} from "../../exchanger/models/inner/chain.type";
import BigNumber from "bignumber.js";

const STABLE_POOLS = [
    "0x1446999b0b0e4f7ada6ee73f2ae12a2cfdc5d9e7", //ARB USD+/USDT+
]

@Injectable()
export class CurveService {
    private readonly logger = new Logger(CurveService.name);

    BASE_API_URL = 'https://api.curve.fi/api';
    GET_POOLS = 'getPools';
    GET_VOLUMES= 'getVolumes';
    FACTORY = 'factory';
    STABLE_FACTORY = 'factory-stable-ng';

    async getPoolsData(): Promise<PoolData[]> {
        const arbitrumPoolsData = await this.loadPoolsData(ChainType.ARBITRUM);
        const arbitrumStablePoolsData = await this.loadStablePoolsData(ChainType.ARBITRUM);

        const optimismPoolsData = await this.loadPoolsData(ChainType.OPTIMISM);

        const basePoolsData = await this.loadPoolsData(ChainType.BASE);
        const baseStablePoolsData = await this.loadStablePoolsData(ChainType.BASE);
        return [...arbitrumPoolsData, ...arbitrumStablePoolsData, ...optimismPoolsData, ...basePoolsData, ...baseStablePoolsData];
    }
    
    async loadPoolsData(chainType: ChainType): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.GET_POOLS}/${chainType.toLocaleLowerCase()}/${this.FACTORY}`;
        console.log("Load data by url:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then((data): PoolData[] => {
                const pools: PoolData[] = [];
                const pairs = data.data.data.poolData;
                let itemCount = 0;
                pairs.forEach((item) => {
                    if (
                        item &&
                        item.symbol &&
                        (AdaptersService.OVN_POOLS_NAMES.some((str) =>
                            item.symbol.toLowerCase().includes(str)) ||
                            item.symbol.toLowerCase().includes('OVERNIGHT'.toLowerCase()))
                    ) {
                        const poolData: PoolData = new PoolData();
                        let total_apr = new BigNumber(0);

                        if (item.gaugeRewards && item.gaugeRewards.length > 0){
                            total_apr = total_apr.plus(item.gaugeRewards[0].apy ?? 0)
                        }
                        if (item.gaugeCrvApy && item.gaugeCrvApy.length > 0){
                            total_apr = total_apr.plus(item.gaugeCrvApy[0] ?? 0)
                        }

                        poolData.address = item.address;
                        poolData.name = item.coins[0].symbol + '/' + item.coins[1].symbol
                        poolData.tvl = (item.usdTotal).toString();
                        poolData.apr = total_apr.toFixed(2);
                        poolData.chain = chainType;
                        pools.push(poolData);
                        this.logger.log(`========= ${ExchangerType.CURVE} =========`);
                        itemCount++;
                        this.logger.log('Found ovn pool #: ', itemCount);
                        this.logger.log('Found ovn pool: ', poolData);
                        this.logger.log('==================');
                    }
                });

                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.CURVE} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    async loadStablePoolsData(chainType: ChainType): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.GET_POOLS}/${chainType.toLocaleLowerCase()}/${this.STABLE_FACTORY}`;
        const apr_url = `${this.BASE_API_URL}/${this.GET_VOLUMES}/${chainType.toLocaleLowerCase()}`;

        console.log("Load pools data by url:", url);
        console.log("Load stable apr by url:", apr_url);

        const responsePoolsApr = await axios.get(apr_url, {
            timeout: 80_000, // 80 sec
        })

        const responsePoolsData = await axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then((data): PoolData[] => {
                const pools: PoolData[] = [];
                const pairs = data.data.data.poolData;

                pairs.forEach((item) => {
                    if (STABLE_POOLS.includes(item.address?.toLowerCase())) {
                        const aprPool  = responsePoolsApr.data.data.pools.find((_) => _.address === item.address);
                        const poolData: PoolData = new PoolData();
                        let total_apr = new BigNumber(0);

                        if (aprPool?.latestWeeklyApyPcent){
                            total_apr = total_apr.plus(aprPool?.latestWeeklyApyPcent)
                        }
                        if(item.gaugeRewards && item.gaugeRewards.length > 0){
                            total_apr = total_apr.plus(item.gaugeRewards[0].apy ?? 0)
                        }
                        if (item.gaugeCrvApy && item.gaugeCrvApy.length > 0){
                            total_apr = total_apr.plus(item.gaugeCrvApy[0] ?? 0)
                        }

                        poolData.address = item.address;
                        poolData.name = item.coins[0].symbol + '/' + item.coins[1].symbol
                        poolData.tvl = (item.usdTotal).toString();
                        poolData.apr = total_apr.toFixed(2);
                        poolData.chain = chainType;
                        pools.push(poolData);
                        this.logger.log(`========= ${ExchangerType.CURVE} =========`);
                        this.logger.log('Found ovn pool: ', poolData);
                        this.logger.log('==================');
                    }
                });

                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.CURVE} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return responsePoolsData;
    }
}
