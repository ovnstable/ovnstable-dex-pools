import { Injectable, Logger } from "@nestjs/common";
import puppeteer from "puppeteer";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import { AdaptersService } from "../adapters.service";
import { getAgent } from "../../config/consts";

const TIME_FOR_TRY = 2_000; // 5 sec.

@Injectable()
export class SwapbasedService {
    private readonly logger = new Logger(SwapbasedService.name);


    // get all api info / api data
    // https://api.thegraph.com/subgraphs/name/chimpydev/swapbase/graphql?query=%0A%7B%0A++__schema+%7B%0A++++types+%7B%0A++++++name%0A++++++fields+%7B%0A++++++++name%0A++++++++description%0A++++++%7D%0A++++%7D%0A++%7D%0A%7D
    BASE_GRAPHQL_URL = "https://api.thegraph.com/subgraphs/name/chimpydev/swapbase";

    BASE_URL = "https://swapbased.finance";
    METHOD_GET_PAIRS = "#/farm";

    async getPoolsData(): Promise<PoolData[]> {
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
//        console.log(responseBody);
                let itemCount = 0;
                const pairs = responseBody.data.pairs;

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
                        const poolData: PoolData = new PoolData();
                        poolData.address = item.id;
                        poolData.name = (item.token0.symbol + "/" + item.token1.symbol);
                        poolData.decimals = 18;
                        poolData.tvl = (item.reserve0 * 1 + item.reserve1 * 1).toString();

                        poolData.apr = null; // load from html
                        poolData.chain = ChainType.BASE;
                        pools.push(poolData);
                        this.logger.log(`=========${ExchangerType.SWAPBASED}=========`);
                        itemCount++;
                        this.logger.log("Found ovn pool #: ", itemCount);
                        this.logger.log("Found ovn pool: ", poolData);
                        this.logger.log("==================");
                    }
                });

                try {
                    pools = await this.initAprs(pools);
                    return pools;
                } catch (e) {
                    this.logger.error("Error when load apr for " + ExchangerType.SWAPBASED);
                    return pools;
                }
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.SWAPBASED} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    private async initAprs(ovnPools: PoolData[]): Promise<PoolData[]> {
        const url = `${this.BASE_URL}/${this.METHOD_GET_PAIRS}`;

        // Launch a headless browser
        const browser = await puppeteer.launch(
            {
                headless: true,
                ignoreHTTPSErrors: true,
                executablePath: getAgent(process.env.IS_MAC),
                args: ["--no-sandbox"]
            }
        );

        this.logger.debug("Browser is start. " + ExchangerType.SWAPBASED);

        try {

            // Create a new page
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36");
            // Set a default timeout of 20 seconds
            await page.setDefaultTimeout(60000);

            // Navigate to the SPA
            await page.goto(url);
            const markerOfLoadingIsFinish = ".farmLPCardUp";


            // Wait for the desired content to load
            await page.waitForSelector(markerOfLoadingIsFinish);
            console.log(`Wait ${TIME_FOR_TRY / 1000} seconds`);
            await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));


            // Extract the data from the page
            const data = await page.evaluate(() => {
                const markerListOfData = ".farmLPCardUp";

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

            console.log("Data from browser: ", data);
            for (let i = 0; i < data.length; i++) {
                const element = data[i];
                const str: string = element;
                this.logger.log("String: " + str);
                if (!str) {
                    continue;
                }

                const nameMatch = str.match(/^(\S+ \/ \S+)/);

                const strForApr = str.replace(/\//g, "").replace(/,/g, "");
                const aprMatch = strForApr.match(/day([+-]?(?=\.\d|\d)(?:\d+)?(?:\.?\d*))(?:[Ee]([+-]?\d+))?%-/);

                let name = nameMatch ? nameMatch[1].replace(/ /g, "") : null;
                this.logger.log("Name: " + name);
                if (!name) {
                    continue;
                }

                // revert name
                const splitName = name.split("/");
                name = splitName[1] + "/" + splitName[0];

                const apr = aprMatch ? parseFloat(aprMatch[1].replace(/,/g, ".")) : null;

                ovnPools.forEach(pool => {
                    if (pool.name.toLowerCase() === name.toLowerCase()) {
                        this.logger.log("Find pool for apr update: " + pool.address + " | " + pool.name);
                        pool.apr = apr ? apr.toString() : null;
                    }
                });
            }

            return ovnPools;
        } catch (e) {
            const errorMessage = `Error when load ${ExchangerType.SWAPBASED} pairs. url: ${url}`;
            this.logger.error(errorMessage, e);
            throw new ExchangerRequestError(errorMessage);
        } finally {
            this.logger.debug("Browser is close. " + ExchangerType.SWAPBASED);
            await browser.close();
        }

    }

}
