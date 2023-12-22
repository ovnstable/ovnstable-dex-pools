import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import puppeteer from "puppeteer";

const TIME_FOR_TRY = 5_000;

@Injectable()
export class ConvexService {
    private readonly logger = new Logger(ConvexService.name);

    BASE_API_URL = 'https://www.convexfinance.com';
    API = 'api';
    UNDER_DEX = 'curve';
    POOL_CHAIN = 'pools-arbitrum';

    APR_API_URL = 'https://www.convexfinance.com';
    APYS = 'curve-arbitrum-apys';

    ADDRESS_POSTFIX = '_convex'

    BASE_PUPETEER_URL = 'https://www.convexfinance.com/stake/arbitrum/13'

    async getPoolsData(): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}/${this.API}/${this.UNDER_DEX}/${this.POOL_CHAIN}`;
        console.log("Load data by url:", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then(async (data): Promise<PoolData[]> => {
                let pools: PoolData[] = [];
                const pairs = data.data.pools;

                const tvl = await this.getTvl();

                let itemCount = 0;
                pairs.forEach((item) => {
                    if (
                        item &&
                        item.symbol &&
                        AdaptersService.OVN_POOLS_NAMES.some((str) =>
                            item.symbol.toLowerCase().includes(str),
                        )
                    ) {
                        const poolData: PoolData = new PoolData();

                        poolData.address = item.address;
                        poolData.name = item.coins[0].symbol + '/' + item.coins[1].symbol;
                        poolData.decimals = item.decimals[0];
                        poolData.tvl = tvl;

                        poolData.apr = null;
                        poolData.chain = ChainType.ARBITRUM;
                        poolData.metaData = item.convexPoolData && item.convexPoolData.id ? (item.convexPoolData.id).toString() : null
                        pools.push(poolData);
                        this.logger.log(`========= ${ExchangerType.CONVEX} =========`);
                        itemCount++;
                        this.logger.log('Found ovn pool #: ', itemCount);
                        this.logger.log('Found ovn pool: ', poolData);
                        this.logger.log('==================');
                    }
                });

                pools = await this.initApr(pools);


                // add postfix for agregator
                pools = pools.map(pool => {
                    pool.address += this.ADDRESS_POSTFIX;
                    return pool;
                });
                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.CONVEX} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    private async initApr(ovnPool: PoolData[]): Promise<PoolData[]> {
        const url = `${this.APR_API_URL}/${this.API}/${this.APYS}`;
        console.log("Get apr by url: ", url);

        const response = axios
            .get(url, {
                timeout: 80_000, // 80 sec
            })
            .then(async (data): Promise<PoolData[]> => {
                const pairs = data.data;
                ovnPool.forEach(pool => {
                    const chainName = pool.chain.toLowerCase();
                    const pairKey = chainName + '-' + pool.address.toLocaleLowerCase() + '-' + pool.metaData
                    console.log("Pair key for apys: ", pairKey)
                    const apr = pairs.apys[pairKey].baseApy + pairs.apys[pairKey].crvApy;
                    pool.apr = apr ? apr.toString() : null;
                });
                return ovnPool;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.CONVEX} pairs. url: ${url}`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    async getTvl():Promise<string> {
        const tvlUrl = `${this.BASE_PUPETEER_URL}`;

        const browser = await puppeteer.launch(
            {
                headless: true,
                ignoreHTTPSErrors: true,
                executablePath: '/usr/bin/google-chrome',
                args: ['--no-sandbox']
            }
        );

        this.logger.debug("Browser is start. " + ExchangerType.CONVEX);

        try {
            // Create a new page
            const page = await browser.newPage();
            await page.setViewport({width: 1280, height: 800});
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');


            // Set a default timeout of 60 seconds
            await page.setDefaultTimeout(10_000);

            // Navigate to the SPA
            await page.goto(tvlUrl);
            this.logger.log("GOTO: ", tvlUrl)

            await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

            // Wait for the desired content to load
            const elements = await page.$$('.jsx-420173254');
            this.logger.log("Amount of elements: ", elements.length);

            this.logger.log("The data successfully loaded")

            // Extract the data from the page
            const data = await page.evaluate(() => {


                const markerListOfData = '.jsx-2995461061';

                // This function runs in the context of the browser page
                // You can use DOM manipulation and JavaScript to extract the data
                const elements = document.querySelectorAll(markerListOfData);
                const extractedData = [];

                elements.forEach(element => {
                    extractedData.push(element.textContent);
                });

                return extractedData;
            });

            // Display the extracted data
            console.log("Elements: ", data);

            let tvlValue;
            for (let i = 0; i < data.length; i++) {
                const element = data[i];
                const str = element.toString();

                console.log("Extracting TVL from element:", str);

                const tvlRegex = /\$([0-9,.]+)k/;
                const match = str.match(tvlRegex);

                if (match && match[1]) {
                    console.log("Matched TVL:", match[1]);

                    tvlValue = parseFloat(match[1].replace(/,/g, '')) * 1000;
                    break;
                }
            }
            if (!isNaN(tvlValue)) {
                return String(tvlValue);
            } else {
                console.error("No valid TVL value found.");
                return null;
            }

        } catch (e) {
            const errorMessage = `Error when load ${ExchangerType.CONVEX} pairs. url: ${tvlUrl}`;
            this.logger.error(errorMessage, e);
            throw new ExchangerRequestError(errorMessage);
        } finally {
            this.logger.debug("Browser is close. " + ExchangerType.CONVEX);
            await browser.close();
        }
    }
}
