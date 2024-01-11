import { Injectable, Logger } from "@nestjs/common";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import { AdaptersService } from "../adapters.service";
import BigNumber from "bignumber.js";

@Injectable()
export class HorizaSwapService {
    private readonly logger = new Logger(HorizaSwapService.name);

    private poolsIds = ['0xcc78afece206d8432e687294f038b7dea1046b40', '0xc12f901efffe113252d0fe2478f62e9f0f87e2d3']

    // get all api info / api data
    BASE_GRAPHQL_URL = "https://subgraph-prod.goerli.horiza.io/subgraphs/name/retro-arbitrum-one-uniswap-v3";
    BASE_URL = "https://app.horiza.io/liquidity";

    async getPoolsData(): Promise<PoolData[]> {
        const query = "query AllPositions {  pools(orderBy: totalValueLockedUSD, orderDirection: desc) {    totalValueLockedUSD    liquidity    feeTier    id    token0 {      id      symbol    }    token1 {      id      symbol    }    poolDayData(where: {date_gte: 1704929200}) {      date      volumeToken0      volumeToken1      feesUSD      volumeUSD    }    poolHourData(where: {periodStartUnix_gte: 1704955564}) {      feesUSD      periodStartUnix    }  }}";
        const response = fetch(this.BASE_GRAPHQL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                operationName: "pairs",
                query,
                variables: {}
            })
        })
            .then(async (data): Promise<PoolData[]> => {
                const [responseBody] = await Promise.all([data.json()]);

                const pairs = responseBody.data.pools;

                const filteredPools = pairs.filter((_) => {
                    if (this.poolsIds.includes(_.id.toLowerCase())) return true
                    return false
                })

                const pools: PoolData[] = filteredPools.map((item) => {
                    const poolData: PoolData = new PoolData();
                    poolData.address = item.id;
                    poolData.name = (item.token0.symbol + "/" + item.token1.symbol);
                    poolData.decimals = 18;
                    poolData.tvl = (item.reserve0 * 1 + item.reserve1 * 1).toString();

                    // todo token lp price
                    const fees = new BigNumber(0.1)
                        .times(item.poolDayData[0].volumeToken0)
                        .div(100)
                        .times(365);

                    poolData.apr = new BigNumber(item.totalValueLockedUSD)
                        .div(fees)
                        .times(100)
                        .toFixed(2)
                    poolData.chain = ChainType.ARBITRUM;
                    this.logger.log(`=========${ExchangerType.HORIZA}=========`);
                    this.logger.log("Found ovn pool: ", poolData);
                    this.logger.log("==================");

                    return poolData
                });

                return pools
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.HORIZA} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}
