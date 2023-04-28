import { ethers } from 'ethers';
import { ProviderService } from './provider.service';

export class WalletService {
  getWallet(providerService: ProviderService): ethers.Wallet {
    const privateKey = process.env.PRIVATE_KEY;
    return new ethers.Wallet(privateKey, providerService.provider);
  }
}
