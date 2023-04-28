import { ethers } from 'ethers';
import { FallbackProvider } from './fallback.provider';
import { Chain } from '@overnight-contracts/eth-utils/dist/module/chain/Chain';

export class ProviderService {
  provider: ethers.providers.Provider;
  chain: Chain;
  chainId: number;

  async load(chain: Chain) {
    console.log('[Load ProviderService ' + chain + '] ...');

    let providers = [];
    providers.push(this.createProvider('WEB3_URL' + chain, 1));
    providers.push(this.createProvider('WEB3_URL_RESERVE_1' + chain, 2));
    providers.push(this.createProvider('WEB3_URL_RESERVE_2' + chain, 3));
    providers.push(this.createProvider('WEB3_URL_RESERVE_3' + chain, 4));

    providers = providers.filter((value) => value != null);
    if (providers.length == 0) {
      console.log('Providers not defined');
    }

    this.provider = new FallbackProvider(providers, 1);
    this.chain = chain;
    this.chainId = (await this.provider.getNetwork()).chainId;

    console.log('[ProviderService] chain: ' + this.chain);
    console.log('[ProviderService] chain_id: ' + this.chainId);
  }

  getChain(): Chain {
    return this.chain;
  }

  getChainId(): number {
    return this.chainId;
  }

  getProvider(): ethers.providers.Provider {
    return this.provider;
  }

  createProvider(envKey, priority) {
    const url = process.env[envKey];
    if (url) {
      const object = {
        id: url,
        priority: priority,
        provider: new ethers.providers.StaticJsonRpcProvider(url),
        stallTimeout: 1000,
        weight: 1,
      };

      console.log(`Create provider: ${url}, priority: ${priority}`);
      return object;
    }
  }
}
