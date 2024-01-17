import { Injectable, Logger } from "@nestjs/common";
import puppeteer from "puppeteer";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import { getAgent } from "../../utils/consts";
import BigNumber from "bignumber.js";

const TIME_FOR_TRY = 2_000; // 5 sec.

@Injectable()
export class HorizaSwapService {
    private readonly logger = new Logger(HorizaSwapService.name);

    private poolsIds = ['0xcc78afece206d8432e687294f038b7dea1046b40', '0xc12f901efffe113252d0fe2478f62e9f0f87e2d3']

    // get all api info / api data
    BASE_GRAPHQL_URL = "https://subgraph-prod.goerli.horiza.io/subgraphs/name/retro-arbitrum-one-uniswap-v3";
    BASE_URL = "https://app.horiza.io/liquidity";

    async getPoolsData(): Promise<PoolData[]> {
        const query = "query AllPositions {  pools(orderBy: totalValueLockedUSD, orderDirection: desc) {    totalValueLockedUSD  totalValueLockedToken0  totalValueLockedToken1 liquidity    feeTier    id    token0 {      id      symbol    }    token1 {      id      symbol    }    poolDayData(where: {date_gte: 1704929200}) {      date      volumeToken0      volumeToken1      feesUSD      volumeUSD    }    poolHourData(where: {periodStartUnix_gte: 1704955564}) {      feesUSD      periodStartUnix    }  }}";
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

                let pools: PoolData[] = filteredPools.map((item) => {
                    const poolData: PoolData = new PoolData();
                    poolData.address = item.id;
                    poolData.name = (item.token0.symbol + "/" + item.token1.symbol);
                    poolData.decimals = 18;
                    poolData.tvl = new BigNumber(item.totalValueLockedToken0).plus(item.totalValueLockedToken1).toFixed(2);

                    poolData.apr = "0"
                    poolData.chain = ChainType.ARBITRUM;
                    this.logger.log(`=========${ExchangerType.HORIZA}=========`);
                    this.logger.log("Found ovn pool: ", poolData);
                    this.logger.log("==================");

                    return poolData
                });


                try {
                    pools = await this.initAprs(pools);
                    return pools;
                } catch (e) {
                    this.logger.error("Error when load apr for " + ExchangerType.HORIZA);
                    return pools;
                }
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.HORIZA} pairs.`;
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

        this.logger.debug("Browser is start. " + ExchangerType.HORIZA);

        try {

            // Create a new page
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36");
            // Set a default timeout of 20 seconds
            await page.setDefaultTimeout(60000);

            // Navigate to the SPA
            await page.goto(url);
            const markerOfLoadingIsFinish = ".customTable__row";


            // Wait for the desired content to load
            await page.waitForSelector(markerOfLoadingIsFinish);
            console.log(`Wait ${TIME_FOR_TRY / 1000} seconds`);
            await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));


            // Extract the data from the page
            const data = await page.evaluate(() => {
                const markerListOfData = ".customTable__row.customTable__row_back";

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

            console.log("Data from browser: HORIZA ", data);
            for (let i = 0; i < data.length; i++) {
                const element = data[i];
                const str: string = element;
                this.logger.log("String: " + str);
                if (!str) {
                    continue;
                }

                const nameMatch = str.match(/^(\S+ \/ \S+)/);
                const name = nameMatch ? nameMatch[1].replace(/ /g, "") : null;

                const regex =/((USD[TC+]+)\/USD\+Stable.*)0.01%(\d+.\d+)%/;

                // USDT+ / USD+ percentage values
                const match = name.match(regex);
                const poolParsedApr = match ? parseFloat(match[3]) : null;
                
                this.logger.log("Name: " + name);
                console.log(match, 'match horiza')
                
                if (!match || !poolParsedApr) {
                    continue;
                }

                // revert name
                const pairSymbols = `${match[2]}/USD+`

                console.log(poolParsedApr, 'poolParsedApr horiza')
                console.log(pairSymbols, 'pairSymbols horiza')
                ovnPools.forEach(pool => {
                    if (pool.name === pairSymbols) {
                        this.logger.log("Find pool for apr update: " + pool.address + " | " + pool.name);
                        pool.apr = poolParsedApr ? poolParsedApr.toFixed(2) : null;
                    }
                });
            }

            return ovnPools;
        } catch (e) {
            const errorMessage = `Error when load ${ExchangerType.HORIZA} pairs. url: ${url}`;
            this.logger.error(errorMessage, e);
            throw new ExchangerRequestError(errorMessage);
        } finally {
            this.logger.debug("Browser is close. " + ExchangerType.HORIZA);
            await browser.close();
        }

    }

}
