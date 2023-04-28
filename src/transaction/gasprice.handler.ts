import { Transaction } from 'ethers';
import { TransactionService } from './transaction.service';
import { ProviderService } from './provider.service';
import { WalletService } from './wallet.service';
import { TransactionHandler } from './transaction.handler';

export class HandlerGasPrice implements TransactionHandler {
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
    let repeat = 15;
    let hash;
    while (repeat != 0) {
      if (await this.transactionService.isMintedTransaction(hash)) break;

      // SetUp nonce (if only for new transaction) and set gasPrice (get data from GasStation)
      await this.transactionService.prepareBeforeSign(transaction);

      try {
        console.log('Signing and send transaction ...');

        const signedTransaction = await this.walletService
          .getWallet(this.providerService)
          .signTransaction(transaction);
        const sendTransaction =
          await this.providerService.provider.sendTransaction(
            signedTransaction,
          );

        if (sendTransaction.hash) {
          console.log('Got hash: ' + sendTransaction.hash);
          hash = sendTransaction.hash;
        }
      } catch (e) {
        console.log(e, 'SendTransaction');
      }

      repeat--;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`Transaction hash: $${hash}, repeat: ${repeat}`);

    if (await this.transactionService.isMintedTransaction(hash)) return hash;
    else return hash;
  }
}
