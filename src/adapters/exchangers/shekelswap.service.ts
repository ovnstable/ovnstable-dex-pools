import { Injectable, Logger } from "@nestjs/common";
import { PoolData } from "./dto/pool.data.dto";
import fetch from "node-fetch";
import { ExchangerType } from "../../exchanger/models/inner/exchanger.type";
import { ExchangerRequestError } from "../../exceptions/exchanger.request.error";
import { ChainType } from "../../exchanger/models/inner/chain.type";
import { AdaptersService } from "../adapters.service";
import puppeteer from "puppeteer";

const TIME_FOR_TRY = 2_000; // 5 sec.

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
        console.log('ShekelswapService')
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
                        poolData.chain = ChainType.ARBITRUM;
                        pools.push(poolData);
                        this.logger.log(`=========${ExchangerType.SHEKEL}=========`);
                        itemCount++;
                        this.logger.log("Found ovn pool #: ", itemCount);
                        this.logger.log("Found ovn pool: ", poolData);
                        this.logger.log("==================");
                    }
                });

                try {
                    pools = await this.initAprs(pools);
                    console.log(pools, 'pools')
                    return pools;
                } catch (e) {
                    this.logger.error("Error when load apr for " + ExchangerType.SHEKEL);
                    return pools;
                }
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.SHEKEL} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    private async initAprs(ovnPools: PoolData[]): Promise<PoolData[]> {
        const url = `${this.BASE_URL}/${this.METHOD_GET_PAIRS}`;
        const IS_MAC = process.env.IS_MAC

        // Launch a headless browser
        const browser = await puppeteer.launch(
            {
                headless: "new",
                ignoreHTTPSErrors: true,
                executablePath: IS_MAC ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome',
                args: ["--no-sandbox"]
            }
        );

        this.logger.debug("Browser is start. " + ExchangerType.SHEKEL);

        try {

            // Create a new page
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36");

            // Set a default timeout of 60 seconds
            await page.setDefaultTimeout(60_000);

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
            const errorMessage = `Error when load ${ExchangerType.SHEKEL} pairs. url: ${url}`;
            this.logger.error(errorMessage, e);
            throw new ExchangerRequestError(errorMessage);
        } finally {
            this.logger.debug("Browser is close. " + ExchangerType.SHEKEL);
            await browser.close();
        }

    }

}
