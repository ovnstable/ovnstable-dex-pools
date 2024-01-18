import { Injectable, Logger } from "@nestjs/common";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import BigNumber from "bignumber.js";

@Injectable()
export class PancakeService {
    private readonly logger = new Logger(PancakeService.name);

    // get all api info / api data
    BASE_GRAPHQL_URL = "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-arb";

    async getPoolsData(): Promise<PoolData[]> {
        const poolsToLoad = `[\"0xd01075f7314a6436e8b74fc18069848229d0c555\", \"0xb9c2d906f94b27bc403ab76b611d2c4490c2ae3f\"]`
        const queryFirstPool =
            `query pools {
                    pools(where: {id_in: ${poolsToLoad}},
                        orderBy: totalValueLockedUSD, orderDirection: desc) {
                            id
                            feeTier
                            liquidity
                            sqrtPrice
                            tick
                            token0 {
                                id
                                symbol
                                name
                                decimals
                                derivedETH
                        }
                        token1 {
                                id
                                symbol
                                name
                                decimals
                                derivedETH
                        }
                        token0Price
                        token1Price
                        volumeUSD
                        volumeToken0
                        volumeToken1
                        txCount
                        totalValueLockedToken0
                        totalValueLockedToken1
                        totalValueLockedUSD
                        feesUSD
                        protocolFeesUSD
                    }
                }
              `;
       
        const response = fetch(this.BASE_GRAPHQL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                operationName: "pools",
                query: queryFirstPool,
                variables: {}
            })
        })
            .then(async (data): Promise<PoolData[]> => {
                const pools: PoolData[] = [];
                const [responseBody] = await Promise.all([data.json()]);
                const apiPoolsData = responseBody.data.pools;

                apiPoolsData.forEach((item) => {
                    const poolData: PoolData = new PoolData();
                    poolData.address = item.id;
                    poolData.name = (item.token0.symbol + "/" + item.token1.symbol);
                    poolData.decimals = 18;
                    poolData.tvl = new BigNumber(item.totalValueLockedToken0).plus(item.totalValueLockedToken1).toFixed(2);


                    poolData.apr = "1";
                    poolData.chain = ChainType.ARBITRUM;
                    pools.push(poolData);
                    this.logger.log(`=========${ExchangerType.PANCAKE}=========`);
                    this.logger.log("Found ovn pool: ", poolData);
                    this.logger.log("==================");
                });

                return pools
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.PANCAKE} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}
