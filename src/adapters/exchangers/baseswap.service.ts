import { Injectable, Logger } from '@nestjs/common';
import puppeteer from "puppeteer";
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { getAgent } from '../../config/consts';

const POOLS_MAP = { // pool name: pool address
    "USD+/USDC": "0x696b4d181Eb58cD4B54a59d2Ce834184Cf7Ac31A",
    "DAI+/USD+": "0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306"
}

const TRY_COUNT = 30;
const TIME_FOR_TRY = 5_000; // 10 sec.

@Injectable()
export class BaseswapService {
    private readonly logger = new Logger(BaseswapService.name);

    BASE_API_URL = 'https://baseswap.fi/farms';
    async getPoolsData(): Promise<PoolData[]> {
        const url = `${this.BASE_API_URL}`;

        // Launch a headless browser
        const browser = await puppeteer.launch(
            {
                headless: true,
                ignoreHTTPSErrors :true,
                executablePath: getAgent(process.env.IS_MAC),
                args: ['--no-sandbox']
            }
        );

        this.logger.debug("Browser is start. " + ExchangerType.BASESWAP);

        try {

            // Create a new page
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');

            // Set a default timeout of 60 seconds
            await page.setDefaultTimeout(60_000);


            // Navigate to the SPA
            await page.goto(url);
            this.logger.log("GOTO: ", url)
            
            await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

            // Wait for the desired content to load
            const elements = await page.$$('.cmoMLm');
            this.logger.log("Amount of elements: ", elements.length);
            

            this.logger.log("The data successfully loaded")

            // Extract the data from the page
            const data = await page.evaluate(() => {
                
                
                const markerListOfData = '.iTtecK';
//                const markerListOfData = '.jrealz';

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
                const nameRegex = /.*(?=Earned)/
                const matchName = str.match(nameRegex);
                if (!matchName || !matchName.length) {
                    this.logger.error(`Name not found. String: ${str}`);
                    continue;
                }

                const name = matchName[0].replace(/-/g, "/");
                this.logger.log("Name:", name);

                if (AdaptersService.OVN_POOLS_NAMES.some((str) =>
                    name.toLowerCase().includes(str))) {
                    this.logger.log(`Found pool. Name: ${name}`);

                    // Extracting TVL: TVL starts with "$" and ends just before "Total".
                    const tvlRegex =  /Liquidity\$\s?([0-9\s]+)/;
                    const match = str.match(tvlRegex);
                    let tvlValue;
                    if (match && match[1]) {
                        tvlValue = parseFloat(match[1].trim().replace(/\s/g, ''));
                    }
                    this.logger.log("TVL:", tvlValue)

                    // // Extracting APR: APR is after "APR" and ends just before "%".
                    const aprRegex = /(?<=APR)\d+\.\d+(?=%Liquidity)/;
                    const matchApr = str.match(aprRegex);
                    let apr;
                    if (matchApr && matchApr[0]) {
                        apr = parseFloat(matchApr[0]);
                    }
                    this.logger.log("APR:", apr)

                    const address = POOLS_MAP[name.toString()];
                    if (!address) {
                        this.logger.error(`Pool address not found in map. name: ${name} exType: ${ExchangerType.BASESWAP}`)
                        continue
                    }

                    const poolData: PoolData = new PoolData();
                    poolData.address = address;
                    poolData.name = name;
                    poolData.decimals = null;

                    poolData.tvl = tvlValue ? (tvlValue).toString() : null;
                    poolData.apr = apr ? (apr).toString() : null;
                    poolData.chain = ChainType.BASE;
                    pools.push(poolData);
                    this.logger.log(`=========${ExchangerType.BASESWAP}=========`);
                    itemCount++;
                    this.logger.log('Found ovn pool #: ', itemCount);
                    this.logger.log('Found ovn pool: ', poolData);
                    this.logger.log('==================');
                }
            }

            return pools;
        } catch (e) {

            const errorMessage = `Error when load ${ExchangerType.BASESWAP} pairs. url: ${url}`;
            this.logger.error(errorMessage, e);
            throw new ExchangerRequestError(errorMessage);
        } finally {
            this.logger.debug("Browser is close. " + ExchangerType.BASESWAP);
            await browser.close();
        }
    }
}
