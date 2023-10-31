import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import {AdaptersService} from "../adapters.service";
const puppeteer = require('puppeteer');

const TIME_FOR_TRY = 10_000; // 10 sec.

@Injectable()
export class BeethovenService {
  private readonly logger = new Logger(BeethovenService.name);

    POOLS_CONFIGURATION_LIST = [
        {
            name: 'OVN/wUSD+',
            poolAddress: '0x00b82bc5edea6e5e6c77635e31a1a25aad99f881',
            chainType: ChainType.OPTIMISM,
        },
    ]

  BASE_API_URL = 'https://op.beets.fi/pool/0x00b82bc5edea6e5e6c77635e31a1a25aad99f881000200000000000000000105'

    async getPoolsData(): Promise<PoolData[]> {
        const mappedPoolConfigurations = this.POOLS_CONFIGURATION_LIST.map((config) => {
            return {
                name: config.name,
                poolAddress: config.poolAddress,
                chainType: config.chainType,
            };
        });

        const url = `${this.BASE_API_URL}`;

        // Launch a headless browser
        const browser = await puppeteer.launch(
            {
                headless: true,
                ignoreHTTPSErrors :true,
                executablePath: '/usr/bin/google-chrome',
                args: ['--no-sandbox']
            }
        );

        this.logger.debug("Browser is start. " + ExchangerType.BEETHOVEN);

        try {
            // Create a new page
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');

            // Set a default timeout of 60 seconds
            await page.setDefaultTimeout(60_000);

            // Navigate to the SPA
            await page.goto(url);
            this.logger.log("GOTO: ", url);

            await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

            // Wait for the desired content to load
            const elements = await page.$$('.css-x09s84');
            this.logger.log("Amount of elements: ", elements.length);

            this.logger.log("The data successfully loaded");

            // Extract the data from the page
            const data = await page.evaluate(() => {
                const markerListOfData = '.css-x09s84';

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
            let tvl = null;
            let apr = null;

            const tvlRegex = /TVL\$([\d.,]+[kKmM]?)\s*(\d+\.\d+%)?/;
            const aprRegex = /Pool APR\d+\.\d+% - (\d+\.\d+)%/;

            // Iterate through the data
            for (let i = 0; i < data.length; i++) {
                const element = data[i];
                let tvlValue = null;
                let aprValue = null;

                // Extract TVL value
                const tvlMatch = tvlRegex.exec(element);
                if (tvlMatch) {
                    tvlValue = tvlMatch[1];
                    if (tvlValue) {
                        if (tvlValue.endsWith('k')) {
                            tvl = parseFloat(tvlValue) * 1000;
                        } else if (tvlValue.endsWith('m')) {
                            tvl = parseFloat(tvlValue) * 1000000;
                        } else {
                            tvl = parseFloat(tvlValue);
                        }
                    }
                }

                // Extract APR value
                const aprMatch = aprRegex.exec(element);
                if (aprMatch) {
                    aprValue = aprMatch[1];
                    if (aprValue) {
                        apr = parseFloat(aprValue);
                    }
                }
            }

            const poolData: PoolData = new PoolData();
            poolData.address = mappedPoolConfigurations[0].poolAddress;
            poolData.name = mappedPoolConfigurations[0].name;
            poolData.decimals = null;
            poolData.tvl = tvl ? tvl.toString() : null;
            poolData.apr = apr ? apr.toString() : null;
            poolData.chain = mappedPoolConfigurations[0].chainType;

            pools.push(poolData);

            console.log(`=========${ExchangerType.BEETHOVEN}=========`);
            console.log('Found ovn pool #: 1');
            console.log('Found ovn pool: ', poolData);
            console.log('==================');

            return pools;
        } catch (e) {
            const errorMessage = `Error when loading ${ExchangerType.BEETHOVEN} pairs. URL: ${url}`;
            this.logger.error(errorMessage, e);
            throw new ExchangerRequestError(errorMessage);
        } finally {
            this.logger.debug("Browser is close. " + ExchangerType.BEETHOVEN);
            await browser.close();
        }
    }
}

