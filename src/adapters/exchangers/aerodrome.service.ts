import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';
const puppeteer = require('puppeteer');

const POOLS_MAP = { // pool name: pool address
  "sAMM-DAI+/USD+": "0x1b05e4e814b3431a48b8164c41eac834d9ce2da6",
  "sAMM-USD+/USDbC": "0x4a3636608d7bc5776cb19eb72caa36ebb9ea683b",
  "sAMM-DOLA/USD+": "0x8E9154AC849e839d60299E85156bcb589De2693A",
  "vAMM-USD+/stERN": "0x607363389331f4b2d1b955d009506a67c565d75e",
  "vAMM-USD+/USDbC": "0xdc0f1f6ecd03ec1c9ffc2a17bababd313477b20e",
  "vAMM-gSIS/USD+": "0x888092c9d44cd647a073f8f1ed11305a31e4fa66",
  "sAMM-USD+/MAI": "0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43",
  "vAMM-OVN/USD+": "0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197",
}


@Injectable()
export class AerodromeService {
  private readonly logger = new Logger(AerodromeService.name);

  BASE_API_URL = 'https://aerodrome.finance/liquidity';
  METHOD_GET_PAIRS = '?query=usd%2B&filter=all';
  async getPoolsData(): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${this.METHOD_GET_PAIRS}`;

    // Launch a headless browser
    const browser = await puppeteer.launch(
      {
        headless: true,
        ignoreHTTPSErrors :true,
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox']
      }
    );

    this.logger.debug("Browser is start. " + ExchangerType.AERODROME);

    try {

      // Create a new page
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');
      // Set a default timeout of 20 seconds
      await page.setDefaultTimeout(60000);

      // Navigate to the SPA
      await page.goto(url);
      const markerOfLoadingIsFinish = '.justify-between.bg-white.p-4.text-sm.text-gray-600';


      // Wait for the desired content to load
      await page.waitForSelector(markerOfLoadingIsFinish);


      // Extract the data from the page
      const data = await page.evaluate(() => {
        const markerListOfData = '.border-neutral-200';

        // This function runs in the context of the browser page
        // You can use DOM manipulation and JavaScript to extract the data
        const elementsData = document.querySelectorAll(markerListOfData);
        const elements = elementsData[0].textContent.split("Deposit");
        const extractedData = [];

        elements.forEach(element => {
          extractedData.push(element);
        });

        return extractedData;
      });

      // Display the extracted data
      const pools: PoolData[] = [];
      let itemCount = 0;

      console.log(data);
      for(let i = 0; i < data.length; i++) {
        const element = data[i];
        const str: string = element;
        this.logger.log("String: from browser", str);
        if (!str) {
          continue;
        }

        // Extracting name: The name is at the beginning of the string and ends just before first –.
        this.logger.log("Start search NAME")
        const nameRegex = /(sAMM-.+?Stable Pool|vAMM-.+?Volatile Pool)/;
        const name = str.match(nameRegex)[0].replace("Stable Pool","").replace("Volatile Pool", "").replace(" ", "");
        this.logger.log("Name: " + name)
        const address = POOLS_MAP[name];
        if (!address) {
          this.logger.error(`Pool address not found in map. name: ${name} exType: ${ExchangerType.AERODROME}`)
          continue
        }

        this.logger.log("Start search TVL")
        // Extracting TVL: TVL starts with "$" and ends just before "Total".
        const tvlRegex = /TVL\s*~\$(.*?)APR/;
        const tvlData = str.match(tvlRegex)[1];
        const tvl = parseFloat(tvlData.replace(/,/g, ""));
        this.logger.log("tvl: " + name)

        // Extracting APR: APR is after "APR" and ends just before "%".
        const aprRegex = /APR([\d\.]+)/;
        console.log("Start search APR")
        const aprStr = str.replace(/,/g, "");
        const aprData = aprStr.match(aprRegex)[1];
        const apr = parseFloat(aprData.replace('%', ""));
        this.logger.log("apr: " + name)

        const poolData: PoolData = new PoolData();
        poolData.address = address;
        poolData.name = name;
        poolData.decimals = null;
        poolData.tvl = (tvl).toString();
        poolData.apr = (apr).toString();
        poolData.chain = ChainType.BASE;
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.AERODROME}=========`);
        itemCount++;
        this.logger.log('Found ovn pool #: ', itemCount);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');
      }

      return pools;
    } catch (e) {
      const errorMessage = `Error when load ${ExchangerType.AERODROME} pairs. url: ${url}`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug("Browser is close. " + ExchangerType.AERODROME);
      await browser.close();
    }
  }
}
