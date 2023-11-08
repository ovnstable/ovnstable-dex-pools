import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import axios from "axios";
const poolAddresses = ["0x4784be205996d53d7a40bdb4e1d7b84e551d71d4", "0x73f7039224c88378de8e2ce31b13debba1f0e05a", "0x35a3b69f579ed1b0b88dc433ebcd7c65fdf57389"];

@Injectable()
export class DefiedgeService {
  private readonly logger = new Logger(DefiedgeService.name);

  BASE_GRAPHQL_API_URL = 'https://api.defiedge.io';
  BASE_GRAPHQL_URL = this.BASE_GRAPHQL_API_URL + '/graphql';

  async getPoolsData(): Promise<PoolData[]> {
    const optimismPools = await this.getOptimismPoolsData();
    const arbitrumPools = await this.getArbitrumPoolsData();

    return [...optimismPools, ...arbitrumPools];
  }

  async getOptimismPoolsData(): Promise<PoolData[]> {
    const query =
      "query strategyMetadata($address: String!, $network: Network!) {\n  strategy(where: {network_address: {address: $address, network: $network}}) {\n    id\n    title\n    subTitle\n    logo\n    description\n    webhook\n    transactionHash\n    updatedAt\n    network\n    archived\n    sharePrice\n    dex\n    whitelistedAddresses\n    address\n    aum\n    private\n    dataFeed\n    autoRebalance\n    createdAt\n    verified\n    ranges {\n      id\n      name\n      lowerTick\n      upperTick\n      __typename\n    }\n    __typename\n  }\n}\n";
    const response = fetch(this.BASE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          address: "0xd1c33d0af58eb7403f7c01b21307713aa18b29d3",
          network: "optimism"
        },
      }),
    })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];
        const [responseBody] = await Promise.all([data.json()]);
        console.log(responseBody);
 
        let itemCount = 0;
        const pool = responseBody.data.strategy;

        const poolData: PoolData = new PoolData();
        poolData.address = pool.address;
        
        const str = pool.title;
        const regx = /(USD\+|USDC)/g; 
        const result = str.match(regx);
        poolData.name = result.join("/");
        poolData.decimals = null;
        poolData.tvl = pool.aum;
        poolData.apr = await this.getApr(pool.address, ChainType.OPTIMISM)
        poolData.chain = ChainType.OPTIMISM;
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.DEFIEDGE}=========`);
        itemCount++;
        this.logger.log('Found ovn pool #: ', itemCount);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.DEFIEDGE} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }

    async getArbitrumPoolsData(): Promise<PoolData[]> {
        const query =
            "query strategyMetadata($address: String!, $network: Network!) {\n  strategy(where: {network_address: {address: $address, network: $network}}) {\n    id\n    title\n    subTitle\n    logo\n    description\n    webhook\n    transactionHash\n    updatedAt\n    network\n    archived\n    sharePrice\n    dex\n    whitelistedAddresses\n    address\n    aum\n    private\n    dataFeed\n    autoRebalance\n    createdAt\n    verified\n    ranges {\n      id\n      name\n      lowerTick\n      upperTick\n      __typename\n    }\n    __typename\n  }\n}\n";

        const pools: PoolData[] = [];

        for (const address of poolAddresses) {
            const response = await fetch(this.BASE_GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables: {
                        address,
                        network: "arbitrum"
                    },
                }),
            });

            try {
                const data = await response.json();
                const pool = data.data.strategy;
                const poolData = new PoolData();
                poolData.address = pool.address;

                const str = pool.title;

                // Modify the name for all pool titles
                const result = str.replace(/-/g, '/').replace(/#[0-9]+/g, '');

                poolData.name = result;
                poolData.decimals = null;
                poolData.tvl = pool.aum;
                poolData.apr = await this.getApr(pool.address, ChainType.ARBITRUM);
                poolData.chain = ChainType.ARBITRUM;
                pools.push(poolData);

                this.logger.log(`=========${ExchangerType.DEFIEDGE}=========`);
                this.logger.log('Found ovn pool: ', poolData);
                this.logger.log('==================');
            } catch (error) {
                const errorMessage = `Error when loading ${ExchangerType.DEFIEDGE} pairs for pool address ${address}.`;
                this.logger.error(errorMessage, error);
                throw new ExchangerRequestError(errorMessage);
            }
        }

        return pools;
    }

    async getApr(address: string, chain: ChainType): Promise<string> {
        const chainType = chain.toLowerCase();
        const url = `${this.BASE_GRAPHQL_API_URL}/${chainType}/${address}/details`;
        console.log(`Get APR by URL: ${url}`);
        try {
            const response = await axios.get(url);
            console.log(response.data);
            return response.data && response.data.totalApy ? response.data.totalApy : '0';
        } catch (error) {
            console.log(`Error when getting APR for ${chainType} chain.`, error);
            return '0';
        }
    }
}
