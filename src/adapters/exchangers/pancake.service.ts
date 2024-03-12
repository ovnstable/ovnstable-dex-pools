import { Injectable, Logger } from "@nestjs/common";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import BigNumber from "bignumber.js";
import puppeteer from "puppeteer";
import { getAgent } from "../../utils/consts";

const TIME_FOR_TRY = 30_000; // 5 sec.

@Injectable()
export class PancakeService {
    private readonly logger = new Logger(PancakeService.name);

    // get all api info / api data
    BASE_GRAPHQL_URL = "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-arb";
    BASE_URL = "https://pancakeswap.finance/farms?chain=arb";

    async getPoolsData(): Promise<PoolData[]> {
        const poolsToLoad = `[\"0x8a06339Abd7499Af755DF585738ebf43D5D62B94\", \"0x721F37495cD70383B0A77Bf1eB8f97eef29498Bb\"]`
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


                    poolData.apr = "0";
                    poolData.chain = ChainType.ARBITRUM;
                    pools.push(poolData);
                    this.logger.log(`=========${ExchangerType.PANCAKE}=========`);
                    this.logger.log("Found ovn pool: ", poolData);
                    this.logger.log("==================");
                });


                try {
                    const newPools = await this.initAprs(pools);

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


    private async initAprs(ovnPools: PoolData[]): Promise<PoolData[]> {
        const url = `${this.BASE_URL}`;

        // Launch a headless browser
        const browser = await puppeteer.launch(
            {
                headless: true,
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
                const regex =/((US[DCTe+.]+))-USD+\D*(\d+\.\d+)\D*(\d+)APR(\d+)/;

                // USDT+ / USD+ percentage values
                const match = str.match(regex);
                console.log(match, 'match PANCAKE')
                const apr = match ? match[5] : null;
                const poolParsedApr = match ? parseFloat(apr) : null;
                
                
                if (!match || !poolParsedApr) {
                    continue;
                }

                // case for 2 pools on pancake
                const pairSymbols = match[1] === "USDC.e" ? `USD+/USDC` : `${match[1]}/USD+`;

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
