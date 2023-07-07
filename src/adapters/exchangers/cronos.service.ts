import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from 'src/exchanger/models/inner/chain.type';
import CronosGauge from "./abi/CronosGauge.json";
import { ethers } from "ethers";
import axios from "axios";
import { CoingekoService } from "../../external/coingeko.service";

export class GuageContractData {
  address: string;
  chain: ChainType;
}

@Injectable()
export class CronosService {
  private readonly logger = new Logger(CronosService.name);

  GAUGE_CONTRACTS_MAP: Map<string, GuageContractData> = new Map<string, GuageContractData>();
  gaugeContractMap: Map<string, ethers.Contract> = new Map<string, ethers.Contract>();

  CHR_PRICE_USD = null;


  constructor(
    private coingekoService: CoingekoService,
    ) {
      this.logger.log('==== Cronos service init ====')
      this.initContractDataMap();
      this.logger.log('==== Cronos gauge data for pools: ====', this.GAUGE_CONTRACTS_MAP);
  }

  // get all api info / api data
  // https://api.thegraph.com/subgraphs/name/xliee/chronos/graphql?query=%0A%7B%0A++__schema+%7B%0A++++types+%7B%0A++++++name%0A++++++fields+%7B%0A++++++++name%0A++++++++description%0A++++++%7D%0A++++%7D%0A++%7D%0A%7D

  // todo: make it dynamicly load in future (without GAUGE_CONTRACTS_MAP):
  // get Gauges-contract by pool contract:
  // https://arbiscan.io/address/0xc72b5c6d2c33063e89a50b2f77c99193ae6cee6c#readProxyContract

  BASE_GRAPHQL_URL = 'https://api.thegraph.com/subgraphs/name/xliee/chronos';

  async getPoolsData(): Promise<PoolData[]> {
    const query =
      'query Query { pairs(first:1000) { id, reserve0, reserve1, totalSupply, token0 { id, name, decimals }, token1 { id, name, decimals }, } }';

    const response = fetch(this.BASE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {},
      }),
    })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];
        const [responseBody] = await Promise.all([data.json()]);
//        console.log(responseBody);
//        console.log(responseBody.data.pairs);
        let itemCount = 0;
        const pairs = responseBody.data.pairs;
        for (const item of pairs) {
          if (
            (item &&
              item.token0 &&
              item.token1 &&
              AdaptersService.OVN_POOLS_NAMES.some((str) =>
                item.token0.name.toLowerCase().includes(str),
              )) ||
            AdaptersService.OVN_POOLS_NAMES.some((str) =>
              item.token1.name.toLowerCase().includes(str),
            )
          ) {
            console.log('Found!');
            console.log(item);
            const poolData: PoolData = new PoolData();
            poolData.address = item.id;
            poolData.name = this.getFilteredName(item.token0.name) + '/' + this.getFilteredName(item.token1.name);
            poolData.decimals = item.token0.decimals;
            poolData.tvl = (item.reserve0 * 1 + item.reserve1 * 1).toString();
            poolData.apr = await this.getCalculatedApr(item);
            poolData.chain = ChainType.ARBITRUM;
            pools.push(poolData);
            this.logger.log(`========= ${ExchangerType.CHRONOS} =========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        }

          // clear cache
          this.CHR_PRICE_USD = null;

          return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.CHRONOS} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }

  async getCalculatedApr(item): Promise<string> {
    const contractsData = this.GAUGE_CONTRACTS_MAP.get(item.id);
    if (!contractsData || !this.gaugeContractMap.has(contractsData.address)) {
        this.logger.log('Calculation apr not availible on this pool: ' + ExchangerType.CHRONOS + ' ' + item.id);
        return (0).toString();
    }

    const gaugeContract = this.gaugeContractMap.get(contractsData.address);
    const gaugeTotalWeight = ethers.BigNumber.from(await gaugeContract.totalWeight());
    const gaugeRewardRate = ethers.BigNumber.from(await gaugeContract.rewardRate());
    const totalWeight = parseFloat(ethers.utils.formatUnits(gaugeTotalWeight.toString(), 'ether'));
    const emissionsPerSecond = parseFloat(ethers.utils.formatUnits(gaugeRewardRate.toString(), 'ether')) //pair.emissions
    //     https://api.coingecko.com/api/v3/simple/price?ids=chronos-finance&vs_currencies=usd

    if (!this.CHR_PRICE_USD) {
      this.CHR_PRICE_USD =  await this.coingekoService.getTokenPrice('chronos-finance', 'usd');
    }

    const tvlUSD = item.reserve0 * 1 + item.reserve1 * 1;
    const lp100 = 100 / (tvlUSD / item.totalSupply);
    console.log(`Apr formula = (${lp100} / ${totalWeight}) * ${emissionsPerSecond} * ${this.CHR_PRICE_USD} * 31536000`)
    const apr = totalWeight
      ? (lp100 / totalWeight) * emissionsPerSecond * this.CHR_PRICE_USD * 31536000
      : 0;

    console.log("Apr: ", apr);
    return (apr).toString();
  }

  getFilteredName(name): string {
    if (!name) {
      return name;
    }

    if (name.toLowerCase().includes('dola')) {
      return "DOLA";
    }

    if (name.toLowerCase().includes('lusd')) {
      return "LUSD";
    }


    if (name.toLowerCase().includes('usd coin')) {
      return "USDC";
    }

    return name;
  }

  async loadGaugeContracts() {
    const contracts = Array.from(this.GAUGE_CONTRACTS_MAP.values());

    for (const contract of contracts) {
      this.logger.log(`Try to init Gauge contract: ${contract.chain}:${contract.address}`);

      //return after tesst
      const nameEnv = 'WEB3_RPC_' + contract.chain.toUpperCase();
      const rpc = process.env[nameEnv];
      /*if (rpc == undefined) {
         throw new Error(`${nameEnv} cannot be undefined`)
      }*/

//      const url = "https://arb-mainnet.g.alchemy.com/v2/Rfm20AVr0ZqULyM3zpwIC8oh-yfs42Dk"
//      const provider = new ethers.providers.StaticJsonRpcProvider(url);
      const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
      this.gaugeContractMap.set(contract.address, new ethers.Contract(contract.address, CronosGauge, provider));
    }
  }

  initContractDataMap() {
    // get Gauges-contract by pool contract:
    // https://arbiscan.io/address/0xc72b5c6d2c33063e89a50b2f77c99193ae6cee6c#readProxyContract

    // USD+/DAI+
    this.GAUGE_CONTRACTS_MAP.set('0xb260163158311596ea88a700c5a30f101d072326',  {
      address: "0xcd4a56221175b88d4fb28ca2138d670cc1197ca9",
      chain: ChainType.ARBITRUM
    });

    //    Frax/USD+
    this.GAUGE_CONTRACTS_MAP.set('0x0d20ef7033b73ea0c9c320304b05da82e2c14e33',  {
      address: "0xaF618E6F5EF781e3aCFe00708BD005E0cc9A2e6F",
      chain: ChainType.ARBITRUM
    });

    // Frax/Usd+
    this.GAUGE_CONTRACTS_MAP.set('0x0df5f52afa0308fdd65423234c4fda9add0b9eba',  {
      address: "0xF319285fa8b5323A40c71D3c006dBd0BE4f5171b",
      chain: ChainType.ARBITRUM
    });

    // Impossible Decentralized Incubator Access Token / USD+
    this.GAUGE_CONTRACTS_MAP.set('0x69fd0ea1041bc4c495d5371a074bf1dcd6700577',  {
      address: "0xD1C05e0770968c8b9C7dC0f3aC1DD419A3417971",
      chain: ChainType.ARBITRUM
    });

    //    DEI/USD+
    this.GAUGE_CONTRACTS_MAP.set('0x94c20b48faed9148a00ccf3229f4e50f791a26b6',  {
      address: "0x8Bc7811fdC24c82E842452F6EA3C7a20e1994889",
      chain: ChainType.ARBITRUM
    });

    //    USD+/USD Coin (Arb1) dec 6
    this.GAUGE_CONTRACTS_MAP.set('0xa885a1e7511cf6b572d949b1e60ac0a8449f3b18',  {
      address: "0xc8d79Fd3Ecc0F91d9C56E279Daba12257bE24619",
      chain: ChainType.ARBITRUM
    });

    //    Dola USD Stablecoin/USD+
    this.GAUGE_CONTRACTS_MAP.set('0xbbd7ff1728963a5eb582d26ea90290f84e89bd66',  {
      address: "0x3004F018B2C01d40D19C7dC4a5a0AFA8743a7e24",
      chain: ChainType.ARBITRUM
    });

    //    LUSD Stablecoin/USD+
    this.GAUGE_CONTRACTS_MAP.set('0xcd78e225e36e724c9fb4bd8287296557d728cda7',  {
      address: "0x7de0998eE1Fce80c160AD1F5Fe768BFF9b0ee87f",
      chain: ChainType.ARBITRUM
    });

    //    Fantom Bomb/USD+
//    this.GAUGE_CONTRACTS_MAP.set('0xeb643ac9471e9bbbe1be1c70ca39d1f9b8ad7d94',  {
//      address: "0x0000000000000000000000000000000000000000",
//      chain: ChainType.ARBITRUM
//    });
  }

}
