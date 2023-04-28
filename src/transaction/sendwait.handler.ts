import { Transaction } from 'ethers';
import { TransactionService } from './transaction.service';
import { ProviderService } from './provider.service';
import { WalletService } from './wallet.service';
import { TransactionHandler } from './transaction.handler';

export class HandlerSendWait implements TransactionHandler {
  transactionService: TransactionService;
  providerService: ProviderService;
  walletService: WalletService;

  constructor(
    transactionService: TransactionService,
    providerService: ProviderService,
    walletService: WalletService,
  ) {
    this.transactionService = transactionService;
    this.providerService = providerService;
    this.walletService = walletService;
  }

  async execute(transaction: Transaction): Promise<string> {
    // SetUp nonce (if only for new transaction) and set gasPrice (get data from GasStation)
    await this.transactionService.prepareBeforeSign(transaction);

    try {
      console.log('Signing and send transaction ...');

      const signedTransaction = await this.walletService
        .getWallet(this.providerService)
        .signTransaction(transaction);
      const receipt = await (
        await this.providerService.provider.sendTransaction(signedTransaction)
      ).wait();
      return receipt.transactionHash;
    } catch (e) {
      console.log(e, 'SendTransaction');
      return null;
    }
  }
}
