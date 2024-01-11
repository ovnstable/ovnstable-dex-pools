import { Injectable, Logger } from "@nestjs/common";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import { AdaptersService } from "../adapters.service";
import BigNumber from "bignumber.js";

@Injectable()
export class ShekelswapService {
    private readonly logger = new Logger(ShekelswapService.name);

    // get all api info / api data
    BASE_GRAPHQL_URL = "https://api.thegraph.com/subgraphs/name/chimpydev/shekelswap";
    BASE_URL = "https://shekelswap.finance";
    METHOD_GET_PAIRS = "#/farm";

    async getPoolsData(): Promise<PoolData[]> {
        const rateData = await fetch("https://raw.githubusercontent.com/chimpydev/shekelswap-lists/main/shekelswap.farmslist.json", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            }
        })
        const rates = await rateData.json()
        const query =
            "fragment PairFields on Pair {  id  trackedReserveETH  reserve0  reserve1  volumeUSD  reserveUSD  totalSupply  token0 {   symbol    id   decimals    derivedETH    __typename  }  token1 {   symbol   id    decimals   derivedETH    __typename  }  __typename} query pairs { pairs(    first: 1000   orderBy: trackedReserveETH    orderDirection: desc  ) {    ...PairFields    __typename  }}";
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
                const pools: PoolData[] = [];
                const [responseBody] = await Promise.all([data.json()]);
                let itemCount = 0;
                const pairs = responseBody.data.pairs;
                let gShekelUsdPrice = "0"

                const gShekelPair = pairs.find((_) => {
                    if (_.token0?.symbol === "gSHEKEL" || _.token1?.symbol === "gSHEKEL") return _
                    return false
                })

                if (gShekelPair) {
                    gShekelUsdPrice = new BigNumber(gShekelPair?.reserveUSD)
                        .div(2)
                        .div(gShekelPair?.reserve1)
                        .toFixed(2)
                }

                pairs.forEach((item) => {
                    if (
                        item &&
                        item.token0 &&
                        item.token1 &&
                        item.token0.symbol &&
                        item.token1.symbol &&
                        AdaptersService.OVN_POOLS_NAMES.some((str) =>
                            (item.token0.symbol + "/" + item.token1.symbol).toLowerCase().includes(str))
                    ) {
                        const itemRateData = rates?.active?.find((_) => _.pair.toLowerCase() === item.id)
                        const poolData: PoolData = new PoolData();
                        poolData.address = item.id;
                        poolData.name = (item.token0.symbol + "/" + item.token1.symbol);
                        poolData.decimals = 18;
                        poolData.tvl = (item.reserve0 * 1 + item.reserve1 * 1).toString();


                        poolData.apr = new BigNumber(itemRateData?.rate ?? 0)
                            .times(gShekelUsdPrice)
                            .times(365)
                            .div(item.reserveUSD)
                            .times(100)
                            .toFixed(2); // load from html
                        poolData.chain = ChainType.ARBITRUM;
                        pools.push(poolData);
                        this.logger.log(`=========${ExchangerType.SHEKEL}=========`);
                        itemCount++;
                        this.logger.log("Found ovn pool #: ", itemCount);
                        this.logger.log("Found ovn pool: ", poolData);
                        this.logger.log("==================");
                    }
                });

                return pools
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.SHEKEL} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }
}
