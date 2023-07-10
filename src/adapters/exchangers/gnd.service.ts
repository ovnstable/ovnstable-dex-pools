import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';
const puppeteer = require('puppeteer');

const POOLS_MAP = { // pool name: pool address
    "DAI/DAI+": "0xd8769d8826149B137AF488b1e9Ac0e3AFdbC058a_dai-dai+",
    "USD+/USDC": "0xd8769d8826149b137af488b1e9ac0e3afdbc058a_usd+-usdc"
}

const TRY_COUNT = 30;
const TIME_FOR_TRY = 5_000; // 5 sec.

@Injectable()
export class GndService {
    private readonly logger = new Logger(GndService.name);

    BASE_API_URL = 'https://farm.gndprotocol.com/farms';
    async getPoolsData(): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}`;

        try {
            // Launch a headless browser
            const browser = await puppeteer.launch(
                {
                    headless: true,
                    ignoreHTTPSErrors :true,
                    executablePath: '/usr/bin/google-chrome',
                    args: ['--no-sandbox']
                }
            );

            // Create a new page
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');

            // Set a default timeout of 60 seconds
            await page.setDefaultTimeout(60_000);


            // Navigate to the SPA
            await page.goto(url);
            this.logger.log("GOTO: ", url)

            // Wait for the desired content to load
            let isLoaded = false;
            for (let i = 0; i < TRY_COUNT; i++) {
                await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));
                const elements = await page.$$('.MuiSkeleton-root.MuiSkeleton-rounded.MuiSkeleton-pulse.css-5mbwlp');

                this.logger.log("Amount of elements: ", elements.length);
                if (elements.length <= 2) {
                    isLoaded = true;
                    break
                }
            }

            if (!isLoaded) {
                this.logger.error("The data haven not been loaded")
                return
            }

            this.logger.log("The data successfully loaded")


            // Extract the data from the page
            const data = await page.evaluate(() => {
                const markerListOfData = '.normalTableRow.realTableRow';

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

            const pools: PoolData[] = [];
            let itemCount = 0;
            for(let i = 0; i < data.length; i++) {
                const element = data[i];
                const str = element.toString();

                // Extracting name: The name is at the beginning of the string and ends just before first –.
                const nameRegex = /^[A-Za-z+-]+/;
                const matchName = str.match(nameRegex);
                if (!matchName || !matchName.length) {
                    this.logger.error(`Name not found. String: ${str}`);
                    continue;
                }

                const name = matchName[0].replace(/-/g, "/");
                const tvl = [];
                this.logger.log("Name:", name);

                if (AdaptersService.OVN_POOLS_NAMES.some((str) =>
                    name.toLowerCase().includes(str))) {
                    this.logger.log(`Found pool. Name: ${name}`);

                    // Extracting TVL: TVL starts with "$" and ends just before "Total".
                    const tvlRegex = /Liquidity\$([\d,]+\.\d+)/;
                    const match = str.match(tvlRegex);
                    if (match && match[1]) {
                        const tvlValue = parseFloat(match[1].replace(/,/g, ''));
                        tvl.push(tvlValue);
                    }
                    this.logger.log("TVL:", tvl)

                    // // Extracting APR: APR is after "APR" and ends just before "%".
                    const aprRegex = /APR([\d.]+)%/;
                    const matchApr = str.match(aprRegex);
                    let apr;
                    if (matchApr && matchApr[1]) {
                        apr = parseFloat(matchApr[1]);
                    }
                    this.logger.log("APR:", apr)

                    const address = POOLS_MAP[name.toString()];
                    if (!address) {
                        this.logger.error(`Pool address not found in map. name: ${name} exType: ${ExchangerType.GND}`)
                        continue
                    }

                    const poolData: PoolData = new PoolData();
                    poolData.address = address;
                    poolData.name = name;
                    poolData.decimals = null;
                    poolData.tvl = (tvl).toString();
                    poolData.apr = (apr).toString();
                    poolData.chain = ChainType.ARBITRUM;
                    pools.push(poolData);
                    this.logger.log(`=========${ExchangerType.GND}=========`);
                    itemCount++;
                    this.logger.log('Found ovn pool #: ', itemCount);
                    this.logger.log('Found ovn pool: ', poolData);
                    this.logger.log('==================');
                } else {
                    console.log("Overnight pools have not been found.");
                }
            }

            await browser.close();
            return pools;
        } catch (e) {
            const errorMessage = `Error when load ${ExchangerType.GND} pairs. url: ${url}`;
            this.logger.error(errorMessage, e);
            throw new ExchangerRequestError(errorMessage);
        }
    }

    private getHeaders() {
        return {
            accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            //      'accept-encoding': 'gzip, deflate, br',
            //      'accept-language': 'ru-RU,ru;q=0.8',
            //      'cache-control': 'max-age=0',
            //      'sec-ch-ua': '"Chromium";v="112", "Brave";v="112", "Not:A-Brand";v="99"',
            //      'sec-ch-ua-mobile': '?0',
            //      'sec-ch-ua-platform': '"macOS"',
            //      'sec-fetch-dest': 'document',
            //      'sec-fetch-mode': 'navigate',
            //      'sec-fetch-site': 'none',
            //      'sec-fetch-user': '?1',
            //      'sec-gpc': '1',
            //      'upgrade-insecure-requests': '1',
            'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
        };
    }


}
