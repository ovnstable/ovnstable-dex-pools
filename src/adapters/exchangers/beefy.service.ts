import { Injectable, Logger } from '@nestjs/common';
import puppeteer from "puppeteer";
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { getAgent } from '../../config/consts';

const POOLS_MAP = {
  "velodrome-v2-ovn-usd+": {
    address: "0x844D7d2fCa6786Be7De6721AabdfF6957ACE73a0",
    symbol: "OVN/USD+",
    exchangerType: ExchangerType.VELODROME,
    chainType: ChainType.OPTIMISM,
  },

  "aerodrome-ovn-usd+": {
    address: "0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197",
    symbol: "OVN/USD+",
    exchangerType: ExchangerType.AERODROME,
    chainType: ChainType.BASE,
  }
}

const TIME_FOR_TRY = 5_000; // 10 sec.

@Injectable()
export class BeefylService {
  private readonly logger = new Logger(BeefylService.name);
  BASE_URL = 'https://app.beefy.finance';
  BASE_API_URL = 'https://api.beefy.finance';
  METHOD_GET_PAIRS = 'lps/breakdown';

  async getPoolsData(): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${this.METHOD_GET_PAIRS}`;
    console.log("Load data by url:", url);

    const response = axios
      .get(url, {
        timeout: 80_000, // 80 sec
      })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];

        // console.log('Response data: ', data.data);
        const pairs = data.data;
        let itemCount = 0;
        // pairs = key - pool name, value - pool data
        for (const [key, value] of Object.entries(pairs)) {
          if (
            key &&
            AdaptersService.OVN_POOLS_NAMES.some((str) =>
              key.toLowerCase().includes(str),
            )
          ) {
            this.logger.log('Found ovn pool: ', key);

            const poolElement = POOLS_MAP[key];
            if (!poolElement) {
              this.logger.error(`Pool address not found in map. name: ${key} exType: ${ExchangerType.BEEFY}`)
              continue
            }

            this.logger.log('Found ovn pool: ', key, poolElement.address, poolElement.symbol, poolElement.exchangerType);
            this.logger.log('==================');
            this.logger.log("value:" , value);

            const poolData: PoolData = new PoolData();
            poolData.address = poolElement.address + '_' + poolElement.exchangerType;
            poolData.name = poolElement.symbol;
            poolData.decimals = null;
            poolData.tvl = (value['totalSupply'] * value['price']).toString();
            poolData.apr = await this.getApr(key);
            poolData.chain = poolElement.chainType;
            pools.push(poolData);
            this.logger.log(`========= ${ExchangerType.BEEFY} =========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        }

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.BEEFY} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }

  /*async getApr(poolName) {
    // https://api.beefy.finance/apy/breakdown
    const url = `${this.BASE_API_URL}/apy/breakdown`;
    console.log("Load data by url:", url);

    return await axios
      .get(url, {
        timeout: 80_000, // 80 sec
      })
      .then((data): string => {
        const pairs = data.data;
        let apr = null;
        for (const [key, value] of Object.entries(pairs)) {
          if (key === poolName) {
            apr = value['vaultApr'];
            break;
          }
        }
        return String(apr * 100);
      });
  }*/

  async getApr(poolName):Promise<string> {
      const url = `${this.BASE_URL}/vault/${poolName}`;

      // Launch a headless browser
      const browser = await puppeteer.launch(
        {
          headless: "new",
          ignoreHTTPSErrors :true,
          executablePath: getAgent(process.env.IS_MAC),
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

        console.log("GOTO: ", url);
        // await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

        const textToWaitFor = 'APY breakdown';
        // await page.waitForSelector(`:contains("${textToWaitFor}")`);
        console.log("Wait for: ", textToWaitFor);
        // const textToWaitFor = 'Text you want to wait for';

        await page.waitForFunction(
          (text) => document.querySelector('body').textContent.includes(text),
          {},
          textToWaitFor
        );

        await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

        console.log("Wait for: ", textToWaitFor, " is finished");

        // Extract the data from the page
        const data = await page.evaluate(() => {
          const markerListOfData = '.MuiPaper-root.MuiPaper-elevation1.MuiPaper-rounded';
          let aprData = null;

          const blocks = document.querySelectorAll(markerListOfData);
          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (!block.textContent.includes('Strategy')) {
              console.log("Block without apr data: ", block.textContent)
              continue;
            }

            aprData = block.textContent;
            break;
          }

          console.log("Block with apr data: ", aprData);

          return aprData;
        });

        // Display the extracted data
        console.log(data);
        let str: string = data;
        this.logger.log("String: from browser", str);
        if (!str) {
          this.logger.error("String with apr is empty");
          return null
        }

        // Extracting name: The name is at the beginning of the string and ends just before first –.
        this.logger.log("Start search APY")
        this.logger.log(str)

        // StrategyStrategy addressVault addressThe vault deposits the user's vAMM-OVN/USD+ in a Aerodrome farm, earning the platform's governance token. Earned token is swapped for more of the underlying assets in order to acquire more of the same liquidity token. To complete the compounding cycle, the new vAMM-OVN/USD+ is added to the farm, ready to go for the next earning event. The transaction cost required to do all this is socialized among the vault's users.APY breakdownTOTAL APY130,847%Vault APR718.92%AuditedCommunity Audit
        // parse this string and get APY
        str = str.replace(/,/g, "");
        const aprRegex = /(?<=TOTAL APY)[0-9.]+(?=%)/;
        const match = str.match(aprRegex);
        if (!match || !match.length) {
          this.logger.error(`APY not found. String: ${str}`);
          return null;
        }

        const apr = parseFloat(match[0]);
        this.logger.log("apr: " + apr)
        return String(apr);
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
