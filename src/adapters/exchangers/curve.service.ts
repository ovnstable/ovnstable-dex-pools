import {Injectable, Logger} from "@nestjs/common";
import {PoolData} from "./dto/pool.data.dto";
import axios from "axios";
import {ExchangerRequestError} from "../../exceptions/exchanger.request.error";
import {ExchangerType} from "../../exchanger/models/inner/exchanger.type";
import {AdaptersService} from "../adapters.service";
import {ChainType} from "../../exchanger/models/inner/chain.type";

@Injectable()
export class CurveService {
    private readonly logger = new Logger(CurveService.name);
    BASE_API_URL = 'https://api.curve.fi/api/';
    METHOD = 'getPools';
    FACTORY = 'factory'

    async getPoolsData(): Promise<PoolData[]> {
        const arbitrumPoolsData = await this.loadPoolsData(ChainType.ARBITRUM);
        const optimismPools = await this.loadPoolsData(ChainType.OPTIMISM);
        const basePools = await this.loadPoolsData(ChainType.BASE);
        return [...arbitrumPoolsData, ...optimismPools  ,...basePools];
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
                        poolData.apr = item.gaugeCrvApy && item.gaugeCrvApy.length > 0 ? item.gaugeCrvApy[0] : 0;
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
}
