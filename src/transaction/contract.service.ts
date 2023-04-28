import { Contract, ethers } from 'ethers';
import { WalletService } from './wallet.service';
import { ProviderService } from './provider.service';

import PL_ABI from './abi/GlobalPayoutListener.json';

export class ContractService {
  getPayoutListener(
    walletService: WalletService,
    providerService: ProviderService,
    plAddress: string,
  ): ethers.Contract {
    console.log('[Get payoutListener ' + plAddress + ']');

    const wallet = walletService.getWallet(providerService);

    const payoutListener: Contract = new ethers.Contract(
      plAddress,
      PL_ABI,
      wallet,
    );

    if (wallet) {
      return payoutListener.connect(wallet);
    }

    return payoutListener;
  }
}
