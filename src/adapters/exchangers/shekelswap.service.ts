import { Injectable, Logger } from "@nestjs/common";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import { AdaptersService } from "../adapters.service";
import puppeteer from "puppeteer";
import BigNumber from "bignumber.js";

const TIME_FOR_TRY = 2_000; // 5 sec.

const rates = [
    {
        "tokens":[
            "0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65",
            "0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8"
        ],
        "stakingRewardAddress":"0xf45e5485fb5C222617641f46CD7518111b55e43c",
        "ended":false,
        "lp":"",
        "name":"",
        "baseToken":"0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65",
        "rate": 100,
        "rewardsRatio1": 0,
        "rewardsRatio2": 1,
        "voteable": false,
        "poolPid": 9,
        "lpName": "USD+-DAI+",
        "rewardToken":"0xEe32ED3AC2A431A0F0e1DBba46ba27AE8d072902",
        "pair":"0x77cA2ddfd61D1D5E5d709cF07549FEC3E2d80315"
    }
]

@Injectable()
export class ShekelswapService {
    private readonly logger = new Logger(ShekelswapService.name);

    // query pairs {
    //     pairs(
    //       first: 9
    //       where: {id_in: ["0x164b92b1519724e18e651c37cb14f4267c1846f6", "0x534916bf489aa92551b9abbd1a517844a6e93d87", "0x8c09a7104ec5f59bb716e40aee97fcfb9c6255e1", "0x7c23db5a69cc1d40a53f91d553f299528d6ae0d6", "0xe8f48bd7c8a859d606d0f3ed6c979fadb15a5411", "0xc38d4e6008ad50a0e1d3b8c54bf2e0b86e17bde4", "0x0627dcdca49d749583c6a00327eb5e3846e265d3", "0x77ca2ddfd61d1d5e5d709cf07549fec3e2d80315", "0x1db8dbfffbcc9a7da3f7dc245d69b69dab5fb8de"]}
    //       block: {number: 152310129}
    //       orderBy: trackedReserveETH
    //       orderDirection: desc
    //     ) {
    //       id
    //       reserveUSD
    //       trackedReserveETH
    //       volumeUSD
    //       untrackedVolumeUSD
    //       totalSupply
    //       __typename
    //     }
    //   }
      
    // get all api info / api data
    // https://api.thegraph.com/subgraphs/name/chimpydev/swapbase/graphql?query=%0A%7B%0A++__schema+%7B%0A++++types+%7B%0A++++++name%0A++++++fields+%7B%0A++++++++name%0A++++++++description%0A++++++%7D%0A++++%7D%0A++%7D%0A%7D
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
                let pools: PoolData[] = [];
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
