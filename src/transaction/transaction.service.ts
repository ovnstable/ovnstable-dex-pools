import { BigNumber, ethers, Transaction, Wallet } from 'ethers';
import { ProviderService } from './provider.service';
import { WalletService } from './wallet.service';
import { TransactionHandler } from './transaction.handler';
import { HandlerSendWait } from './sendWait.handler';
import { HandlerGasPrice } from './gasprice.handler';
import { Chain } from '@overnight-contracts/eth-utils/dist/module/chain/Chain';
import { GasPriceService } from '@overnight-contracts/eth-utils/dist/module/gas/gasPriceService';

export enum Statuses {
  OK = 'OK',
  CANCEL = 'CANCEL',
}

export class TransactionRequest {
  to: string;
  data: string;
  contract: ethers.Contract;
  method: string;
  status: Statuses;
  values;
}

export class TransactionService {
  providerService: ProviderService;
  walletService: WalletService;
  gasPriceService: GasPriceService;

  wallet: Wallet;
  provider: ethers.providers.Provider;

  transactionHandler: TransactionHandler;

  constructor(providerService: ProviderService, walletService: WalletService) {
    this.providerService = providerService;
    this.walletService = walletService;
  }

  async load() {
    console.log('[Load TransactionService] ...');
    this.wallet = this.walletService.getWallet(this.providerService);
    this.provider = this.providerService.getProvider();

    const network = this.providerService.getChain();

    if (network == Chain.OPTIMISM) {
      this.transactionHandler = new HandlerSendWait(
        this,
        this.providerService,
        this.walletService,
      );
    } else {
      this.transactionHandler = new HandlerGasPrice(
        this,
        this.providerService,
        this.walletService,
      );
    }

    this.gasPriceService = new GasPriceService({
      enabledPolygonGasStation: true,
      enabledBlockNativeService: true,
      defaultProvider: this.provider,
    });
  }

  async send(request: TransactionRequest): Promise<string> {
    const transaction = {
      from: this.wallet.address,
      to: request.to,
      value: BigNumber.from(0),
      data: request.data,
      chainId: this.providerService.getChainId(),
      nonce: 0,
      gasLimit: BigNumber.from(0),
      gasPrice: BigNumber.from(0),
    } as Transaction;

    return this.execute(transaction);
  }

  async static(request: TransactionRequest) {
    await request.contract.callStatic[request.method](...request.values);
  }

  async prepareBeforeSign(transaction: Transaction) {
    if (transaction.nonce === 0) {
      transaction.nonce = await this.providerService
        .getProvider()
        .getTransactionCount(this.wallet.address, 'latest');
    }

    const transactionParams = await this.gasPriceService.getTransactionParams(
      this.providerService.chain,
    );

    const gasPrice = transactionParams.gasPrice;
    const gasLimit = transactionParams.gasLimit;

    transaction.gasPrice = BigNumber.from(gasPrice);
    transaction.gasLimit = BigNumber.from(gasLimit);

    const gasPriceGwei = ethers.utils.formatUnits(
      BigNumber.from(gasPrice),
      'gwei',
    );
    console.log(
      `Prepare transaction before signing: nonce [${transaction.nonce}] GasLimit [${transaction.gasLimit}] GasPrice: gwei [${gasPriceGwei}] `,
    );
  }

  async execute(transaction: Transaction): Promise<string> {
    return await this.transactionHandler.execute(transaction);
  }

  async isMintedTransaction(hash: string): Promise<boolean> {
    console.log(`Call: isMintedTransaction: ${hash}`);
    if (!hash) {
      console.log('Hash not found: ' + hash);
      return false;
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(hash);
      if (receipt && receipt.blockNumber) {
        console.log('Receipt found: ' + receipt.transactionHash);
        return true;
      } else {
        console.log('Receipt not found: ' + JSON.stringify(receipt));
        return false;
      }
    } catch (e) {
      console.log(`getTransactionReceipt throw error: ` + e);
      return false;
    }
  }
}
