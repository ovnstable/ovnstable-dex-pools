import { Injectable, Logger } from "@nestjs/common";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import BigNumber from "bignumber.js";
import puppeteer from "puppeteer";
import { getAgent } from "../../config/consts";

const TIME_FOR_TRY = 30_000; // 5 sec.

// lowerCase important
const ZK_POOLS = `[\"0x6a8fc7e8186ddc572e149dfaa49cfae1e571108b\"]`;
const ARB_POOLS = `[\"0x8a06339abd7499af755df585738ebf43d5d62b94\", \"0x721f37495cd70383b0a77bf1eb8f97eef29498bb\"]`

const buildQuery = (pools: string) => {
    return `query pools {
        pools(where: {id_in: ${pools}},
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
            totalValueLockedToken0
            totalValueLockedToken1
            totalValueLockedUSD
            protocolFeesUSD
        }
    }
  `;
}
@Injectable()
export class PancakeService {
    private readonly logger = new Logger(PancakeService.name);

    // get all api info / api data
    BASE_GRAPHQL_ARB = "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-arb";
    BASE_GRAPHQL_ZK = "https://api.studio.thegraph.com/query/45376/exchange-v3-zksync/version/latest"
    BASE_URL_ARB = "https://pancakeswap.finance/farms?chain=arb";
    BASE_URL_ZK = "https://pancakeswap.finance/farms?chain=zkSync";

    async getZkPools(): Promise<PoolData[]> {
        const queryFirstPool = buildQuery(ZK_POOLS)
       
        const response = fetch(this.BASE_GRAPHQL_ZK, {
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
                console.log(data, '-data11')
                const pools: PoolData[] = [];
                const [responseBody] = await Promise.all([data.json()]);
                const apiPoolsData = responseBody.data.pools;

                apiPoolsData.forEach((item) => {
                    const poolData: PoolData = new PoolData();
                    poolData.address = item.id;
                    poolData.name = (item.token0.symbol + "/" + item.token1.symbol);
                    poolData.decimals = 18;
                    poolData.tvl = new BigNumber(item.totalValueLockedToken0).plus(item.totalValueLockedToken1).toFixed(2);


                    poolData.apr = "0";
                    poolData.chain = ChainType.ZKSYNC;
                    pools.push(poolData);
                    this.logger.log(`=========${ExchangerType.PANCAKE}=========`);
                    this.logger.log("Found ovn pool: ", poolData);
                    this.logger.log("==================");
                });


                try {
                    const newPools = await this.initAprs(pools, ChainType.ZKSYNC);

                    if (newPools.some((_) => BigNumber(_.apr).eq(0))) {
                        throw Error(`Some Pancake pool apr === 0, ${newPools} data`)
                    }

                    return newPools
                } catch (e) {
                    this.logger.error("Error when load apr for " + ExchangerType.PANCAKE);
                }
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.PANCAKE} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    async getArbitrumPools(): Promise<PoolData[]> {
        const queryFirstPool = buildQuery(ARB_POOLS)
       
        const response = fetch(this.BASE_GRAPHQL_ARB, {
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


                    poolData.apr = "0";
                    poolData.chain = ChainType.ARBITRUM;
                    pools.push(poolData);
                    this.logger.log(`=========${ExchangerType.PANCAKE}=========`);
                    this.logger.log("Found ovn pool: ", poolData);
                    this.logger.log("==================");
                });


                try {
                    const newPools = await this.initAprs(pools, ChainType.ARBITRUM);

                    if (newPools.some((_) => BigNumber(_.apr).eq(0))) {
                        throw Error(`Some Pancake pool apr === 0, ${newPools} data`)
                    }

                    return newPools
                } catch (e) {
                    this.logger.error("Error when load apr for " + ExchangerType.PANCAKE);
                }
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.PANCAKE} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    async getPoolsData(): Promise<PoolData[]> {
        // const arbPools = await this.getArbitrumPools()
        const zkPools = await this.getZkPools()

        console.log([], '---arbPools')
        console.log(zkPools, '---zkPools')
        return [...[], ...zkPools];
    }


    private async initAprs(ovnPools: PoolData[], chain: ChainType): Promise<PoolData[]> {
        const url = chain === ChainType.ARBITRUM ? this.BASE_URL_ARB : this.BASE_URL_ZK;

        // Launch a headless browser
        const browser = await puppeteer.launch(
            {
                headless: "new",
                ignoreHTTPSErrors: true,
                executablePath: getAgent(process.env.IS_MAC),
                args: ["--no-sandbox"]
            }
        );

        this.logger.debug("Browser is start. " + ExchangerType.PANCAKE);

        try {

            // Create a new page
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36");
            // Set a default timeout of 20 seconds
            await page.setDefaultTimeout(60000);

            // Navigate to the SPA
            await page.goto(url);
            const markerOfLoadingIsFinish = "#table-container";


            // Wait for the desired content to load
            await page.waitForSelector(markerOfLoadingIsFinish);
            console.log(`Wait ${TIME_FOR_TRY / 1000} seconds`);
            await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));


            // Extract the data from the page
            const data = await page.evaluate(() => {
                const markerListOfData = "#table-container tr";

                // This function runs in the context of the browser page
                // You can use DOM manipulation and JavaScript to extract the data
                const elements = document.querySelectorAll(markerListOfData);
                const extractedData = [];

                console.log("Elements: ", elements);
                elements.forEach(element => {
                    extractedData.push(element.textContent);
                });

                return extractedData;
            });

            console.log(`Data from browser: ${ExchangerType.PANCAKE}`, data);
            for (let i = 0; i < data.length; i++) {
                const element = data[i];
                const str: string = element;
                this.logger.log("String: " + str);
                if (!str) {
                    continue;
                }

                let regex = /(USDT\+-USD\+|USD\+-USDC).*?APR(\d+\.?\d*)%/;

                if (chain === ChainType.ZKSYNC) {
                    regex = /(USD\+-USDC).*?APR(\d+\.?\d*)%/;
                }
                
                // USDT+ / USD+ percentage values
                const match = str.match(regex);
                console.log(match, 'match PANCAKE')
                const apr = match ? match[2] : null;
                const poolParsedApr = match ? parseFloat(apr) : null;
                
                
                if (!match || !poolParsedApr) {
                    continue;
                }

                // case for 2 pools on pancake
                const pairSymbols = match[1] === "USD+-USDC" ? `USDC/USD+` : 'USDT+/USD+';

                console.log(ovnPools, 'POOLS')
                ovnPools.forEach(pool => {
                    if (pool.name === pairSymbols) {
                        this.logger.log("Find pool for apr update: " + pool.address + " | " + pool.name);
                        pool.apr = poolParsedApr ? poolParsedApr.toFixed(2) : null;
                    }
                });
            }

            return ovnPools;
        } catch (e) {
            const errorMessage = `Error when load ${ExchangerType.PANCAKE} pairs. url: ${url}`;
            this.logger.error(errorMessage, e);
            throw new ExchangerRequestError(errorMessage);
        } finally {
            this.logger.debug("Browser is close. " + ExchangerType.PANCAKE);
            await browser.close();
        }

    }

}
