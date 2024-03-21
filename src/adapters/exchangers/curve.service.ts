import {Injectable, Logger} from "@nestjs/common";
import {PoolData} from "./dto/pool.data.dto";
import axios from "axios";
import {ExchangerRequestError} from "../../exceptions/exchanger.request.error";
import {ExchangerType} from "../../exchanger/models/inner/exchanger.type";
import {AdaptersService} from "../adapters.service";
import {ChainType} from "../../exchanger/models/inner/chain.type";

const STABLE_POOLS = [
    "0x1446999b0b0e4f7ada6ee73f2ae12a2cfdc5d9e7"
]

@Injectable()
export class CurveService {
    private readonly logger = new Logger(CurveService.name);
    BASE_API_URL = 'https://api.curve.fi/api/';
    STABLE_POOLS_DATA = 'https://api.curve.fi/api/getPools/arbitrum/factory-stable-ng';
    STABLE_POOLS_APR = 'https://api.curve.fi/api/getVolumes/arbitrum';

    METHOD = 'getPools';
    FACTORY = 'factory';
    BASE_CHAIN = 'base';

    async getPoolsData(): Promise<PoolData[]> {
        const arbitrumPoolsData = await this.loadPoolsData(ChainType.ARBITRUM);
        const optimismPools = await this.loadPoolsData(ChainType.OPTIMISM);
        const basePools = await this.loadBasePoolsData();
        const arbitrumStablePools = await this.loadStablePools();
        return [...arbitrumPoolsData, ...optimismPools, ...basePools, ...arbitrumStablePools];
    }
    
    async loadPoolsData(chainType: ChainType): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.METHOD}/${chainType.toLocaleLowerCase()}/${this.FACTORY}`;

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

                        poolData.address = item.address;
                        poolData.name = item.coins[0].symbol + '/' + item.coins[1].symbol
                        poolData.tvl = (item.usdTotal).toString();
                        poolData.apr = item.gaugeCrvApy && item.gaugeCrvApy.length > 0 ? item.gaugeCrvApy[1] : 0;
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

    async loadBasePoolsData(): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.METHOD}/${this.BASE_CHAIN}/${this.FACTORY}`;
        console.log("Load data by url:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then((data): PoolData[] => {
                const pools: PoolData[] = [];
//                 console.log('Response data: ', data.data);
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

                        poolData.address = item.address;
                        poolData.name = item.coins[0].symbol + '/' + item.coins[1].symbol
                        poolData.tvl = (item.usdTotal).toString();
                        poolData.apr = item.gaugeRewards[2].apy;
                        poolData.chain = ChainType.BASE;
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

    async loadStablePools(): Promise<PoolData[]> {
        const responsePoolsApr = await axios.get(this.STABLE_POOLS_APR, {
            timeout: 80_000, // 80 sec
        })

        const responsePoolsData = await axios
            .get(this.STABLE_POOLS_DATA, {
                timeout: 80_000, // 80 sec
            })
            .then((data): PoolData[] => {
                const pools: PoolData[] = [];
                const pairs = data.data.data.poolData;

                pairs.forEach((item) => {
                    if (STABLE_POOLS.includes(item.address?.toLowerCase())) {
                        const aprPool  = responsePoolsApr.data.data.pools.find((_) => _.address === item.address);
                        const poolData: PoolData = new PoolData();

                        poolData.address = item.address;
                        poolData.name = item.coins[0].symbol + '/' + item.coins[1].symbol
                        poolData.tvl = (item.usdTotal).toString();
                        poolData.apr = aprPool?.latestWeeklyApyPcent?.toString() ?? "0";
                        poolData.chain = ChainType.ARBITRUM;
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
