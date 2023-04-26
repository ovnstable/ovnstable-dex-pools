import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class BeethovenService {
  private readonly logger = new Logger(BeethovenService.name);

  BASE_GRAPHQL_URL = 'https://backend-optimism-v2.beets-ftm-node.com/graphql';

  async getPoolsData(): Promise<PoolData[]> {
    const query =
      'query GetPool($id: String!) {\n  pool: poolGetPool(id: $id) {\n    id\n    address\n    name\n    owner\n    decimals\n    factory\n    symbol\n    createTime\n    dynamicData {\n      poolId\n      swapEnabled\n      totalLiquidity\n      totalLiquidity24hAgo\n      totalShares\n      totalShares24hAgo\n      fees24h\n      swapFee\n      volume24h\n      fees48h\n      volume48h\n      lifetimeVolume\n      lifetimeSwapFees\n      holdersCount\n      swapsCount\n      sharePriceAth\n      sharePriceAthTimestamp\n      sharePriceAtl\n      sharePriceAtlTimestamp\n      totalLiquidityAth\n      totalLiquidityAthTimestamp\n      totalLiquidityAtl\n      totalLiquidityAtlTimestamp\n      volume24hAth\n      volume24hAthTimestamp\n      volume24hAtl\n      volume24hAtlTimestamp\n      fees24hAth\n      fees24hAthTimestamp\n      fees24hAtl\n      fees24hAtlTimestamp\n      apr {\n        hasRewardApr\n        thirdPartyApr\n        nativeRewardApr\n        swapApr\n        total\n        items {\n          id\n          title\n          apr\n          subItems {\n            id\n            title\n            apr\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    allTokens {\n      id\n      address\n      name\n      symbol\n      decimals\n      isNested\n      isPhantomBpt\n      __typename\n    }\n    displayTokens {\n      id\n      address\n      name\n      weight\n      symbol\n      nestedTokens {\n        id\n        address\n        name\n        weight\n        symbol\n        __typename\n      }\n      __typename\n    }\n    staking {\n      id\n      type\n      address\n      farm {\n        id\n        beetsPerBlock\n        rewarders {\n          id\n          address\n          tokenAddress\n          rewardPerSecond\n          __typename\n        }\n        __typename\n      }\n      gauge {\n        id\n        gaugeAddress\n        rewards {\n          id\n          rewardPerSecond\n          tokenAddress\n          __typename\n        }\n        __typename\n      }\n      reliquary {\n        levels {\n          level\n          balance\n          apr\n          allocationPoints\n          __typename\n        }\n        beetsPerSecond\n        totalBalance\n        __typename\n      }\n      __typename\n    }\n    investConfig {\n      singleAssetEnabled\n      proportionalEnabled\n      options {\n        poolTokenIndex\n        poolTokenAddress\n        tokenOptions {\n          ... on GqlPoolToken {\n            ...GqlPoolToken\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    withdrawConfig {\n      singleAssetEnabled\n      proportionalEnabled\n      options {\n        poolTokenIndex\n        poolTokenAddress\n        tokenOptions {\n          ... on GqlPoolToken {\n            ...GqlPoolToken\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on GqlPoolWeighted {\n      nestingType\n      tokens {\n        ... on GqlPoolToken {\n          ...GqlPoolToken\n          __typename\n        }\n        ... on GqlPoolTokenLinear {\n          ...GqlPoolTokenLinear\n          __typename\n        }\n        ... on GqlPoolTokenPhantomStable {\n          ...GqlPoolTokenPhantomStable\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on GqlPoolStable {\n      amp\n      tokens {\n        ... on GqlPoolToken {\n          ...GqlPoolToken\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on GqlPoolMetaStable {\n      amp\n      tokens {\n        ... on GqlPoolToken {\n          ...GqlPoolToken\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on GqlPoolElement {\n      unitSeconds\n      principalToken\n      baseToken\n      tokens {\n        ... on GqlPoolToken {\n          ...GqlPoolToken\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on GqlPoolPhantomStable {\n      amp\n      nestingType\n      tokens {\n        ... on GqlPoolToken {\n          ...GqlPoolToken\n          __typename\n        }\n        ... on GqlPoolTokenLinear {\n          ...GqlPoolTokenLinear\n          __typename\n        }\n        ... on GqlPoolTokenPhantomStable {\n          ...GqlPoolTokenPhantomStable\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on GqlPoolLinear {\n      mainIndex\n      wrappedIndex\n      lowerTarget\n      upperTarget\n      tokens {\n        ... on GqlPoolToken {\n          ...GqlPoolToken\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on GqlPoolLiquidityBootstrapping {\n      name\n      nestingType\n      tokens {\n        ... on GqlPoolToken {\n          ...GqlPoolToken\n          __typename\n        }\n        ... on GqlPoolTokenLinear {\n          ...GqlPoolTokenLinear\n          __typename\n        }\n        ... on GqlPoolTokenPhantomStable {\n          ...GqlPoolTokenPhantomStable\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment GqlPoolToken on GqlPoolToken {\n  id\n  index\n  name\n  symbol\n  balance\n  address\n  priceRate\n  decimals\n  weight\n  totalBalance\n  __typename\n}\n\nfragment GqlPoolTokenLinear on GqlPoolTokenLinear {\n  id\n  index\n  name\n  symbol\n  balance\n  address\n  priceRate\n  decimals\n  weight\n  mainTokenBalance\n  wrappedTokenBalance\n  totalMainTokenBalance\n  totalBalance\n  pool {\n    id\n    name\n    symbol\n    address\n    owner\n    factory\n    createTime\n    wrappedIndex\n    mainIndex\n    upperTarget\n    lowerTarget\n    totalShares\n    totalLiquidity\n    bptPriceRate\n    tokens {\n      ... on GqlPoolToken {\n        ...GqlPoolToken\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment GqlPoolTokenPhantomStable on GqlPoolTokenPhantomStable {\n  id\n  index\n  name\n  symbol\n  balance\n  address\n  weight\n  priceRate\n  decimals\n  totalBalance\n  pool {\n    id\n    name\n    symbol\n    address\n    owner\n    factory\n    createTime\n    totalShares\n    totalLiquidity\n    nestingType\n    swapFee\n    amp\n    tokens {\n      ... on GqlPoolToken {\n        ...GqlPoolToken\n        __typename\n      }\n      ... on GqlPoolTokenLinear {\n        ...GqlPoolTokenLinear\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}';
    const response = fetch(this.BASE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          id: '0x43da214fab3315aa6c02e0b8f2bfb7ef2e3c60a50000000000000000000000ae',
        },
      }),
    })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];
        const [responseBody] = await Promise.all([data.json()]);
        //        console.log(responseBody);
        let itemCount = 0;
        const pool = responseBody.data.pool;
        const token1 = pool.tokens[0];
        const token2 = pool.tokens[1];

        const poolData: PoolData = new PoolData();
        poolData.address = pool.address;
        poolData.name = token1.symbol + '/' + token2.symbol;
        poolData.decimals = pool.decimals;
        poolData.tvl = (
          parseInt(token1.totalBalance) + parseInt(token2.totalBalance)
        ).toString();
        poolData.apr = (pool.dynamicData.apr.total * 100).toString();
        poolData.chain = ChainType.OPTIMISM;
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.BEETHOVEN}=========`);
        itemCount++;
        this.logger.log('Found ovn pool #: ', itemCount);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.BEETHOVEN} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }
}
