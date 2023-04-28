import { Transaction } from 'ethers';

export interface TransactionHandler {
  execute(transaction: Transaction): Promise<string>;
}
