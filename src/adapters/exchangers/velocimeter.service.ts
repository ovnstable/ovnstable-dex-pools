import { Injectable, Logger } from "@nestjs/common";
import { PoolData } from "./dto/pool.data.dto";
import axios from "axios";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { AdaptersService } from "../adapters.service";
import { ChainType } from "../../exchanger/models/inner/chain.type";

@Injectable()
export class VelocimeterService {
    private readonly logger = new Logger(VelocimeterService.name);
    BASE_API_URL = 'https://base.velocimeter.xyz/api/';
    METHOD = 'pairs';

    async getPoolsData(): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.METHOD}`;
        console.log("Load data by url:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then((data): PoolData[] => {
                const pools: PoolData[] = [];
//                 console.log('Response data: ', data.data);
                 const pairs = data.data.data;
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
                        poolData.name = item.symbol;
                        poolData.tvl = (item.tvl).toString();
                        poolData.apr = item.aprs && item.aprs.length > 0 ? item.aprs[0].min_apr : 0;
                        poolData.chain = ChainType.BASE;
                        pools.push(poolData);
                        this.logger.log(`========= ${ExchangerType.VELOCIMETER} =========`);
                        itemCount++;
                        this.logger.log('Found ovn pool #: ', itemCount);
                        this.logger.log('Found ovn pool: ', poolData);
                        this.logger.log('==================');
                    }
                });

                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.VELOCIMETER} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}
