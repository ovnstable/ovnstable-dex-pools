import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import axios from "axios";

@Injectable()
export class BalancerService {
    private readonly logger = new Logger(BalancerService.name);

    BASE_GRAPHQL_API_URL = 'https://api.balancer.fi';
    BASE_GRAPHQL_URL = this.BASE_GRAPHQL_API_URL + '/graphql';

    async getPoolsData(): Promise<PoolData[]> {
        const query =
            '{"query":"query { pools (orderBy: \\"totalLiquidity\\", orderDirection: \\"desc\\", where: {totalShares: {gt: 0.00001}, id: {not_in: [\\"\\"]}, tokensList: {contains: [\\"0x284eb68520c8fa83361c1a3a5910aec7f873c18b\\"]}, poolType: {in: [\\"Weighted\\", \\"Stable\\", \\"MetaStable\\", \\"LiquidityBootstrapping\\", \\"Investment\\", \\"StablePhantom\\", \\"ComposableStable\\"]}}, chainId: 42161, first: 2000) { pools { id address poolType poolTypeVersion swapFee tokensList totalLiquidity totalSwapVolume totalSwapFee totalShares volumeSnapshot feesSnapshot owner factory amp createTime swapEnabled symbol name protocolYieldFeeCache priceRateProviders { address token { address } } tokens { address balance weight priceRate symbol decimals token { latestUSDPrice pool { id totalShares address poolType mainIndex tokens { address balance weight priceRate symbol decimals token { latestUSDPrice pool { id totalShares address poolType mainIndex tokens { address balance weight priceRate symbol decimals token { latestUSDPrice pool { id totalShares address poolType mainIndex } } } } } } } } } isNew isInRecoveryMode isPaused apr { stakingApr { min max } swapFees tokenAprs { total breakdown } rewardAprs { total breakdown } protocolApr min max } } nextToken } }"}'
        const response = fetch(this.BASE_GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                Accept: 'application/json;charset=UTF-8',
            },
            body: JSON.stringify({
                query,
                variables: {}
            })
        })
            .then(async (data): Promise<PoolData[]> => {
                const pools: PoolData[] = [];
                const [responseBody] = await Promise.all([data.json()]);
                console.log(responseBody);

                let itemCount = 0;
                const pool = responseBody.data.pools;

                const poolData: PoolData = new PoolData();
                poolData.address = pool.address;

                poolData.name = pool.symbol;
                poolData.decimals = null;
                poolData.tvl = pool.totalLiquidity;
                poolData.apr = pool.apr.max
                poolData.chain = ChainType.ARBITRUM;
                pools.push(poolData);
                this.logger.log(`=========${ExchangerType.BALANCER}=========`);
                itemCount++;
                this.logger.log('Found ovn pool #: ', itemCount);
                this.logger.log('Found ovn pool: ', poolData);
                this.logger.log('==================');

                return pools;
            })
            .catch((e) => {
                const errorMessage = `Error when load ${ExchangerType.BALANCER} pairs.`;
                this.logger.error(errorMessage, e);
                throw new ExchangerRequestError(errorMessage);
            });

        return await response;
    }

    /*async getApr(address: string): Promise<string> {
        const url = this.BASE_GRAPHQL_API_URL + `/${ChainType.ARBITRUM.toLocaleLowerCase()}/${address}/details`
        console.log("Get apr by url: ", url);
        try {
            const response = await axios.get(url);
            console.log(response.data);
            return response.data && response.data.totalApy ? response.data.totalApy : 0;
        } catch (error) {
            console.log("Error when get apr.", error);
        }
    }*/
}
