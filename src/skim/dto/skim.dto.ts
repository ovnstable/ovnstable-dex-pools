

export enum Operation  {
  SKIM = 0,
  SYNC = 1,
  BRIBE = 2,
  CUSTOM = 3
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const REWARD_WALLET = '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46';

export class SkimDto {
  pool: string;
  token: string;
  poolName: string;
  bribe: string = ZERO_ADDRESS;
  operation: Operation = Operation.SKIM;
  to: string = REWARD_WALLET;
  dexName: string;
  feePercent: number;
  feeReceiver: string = ZERO_ADDRESS;
  __gap: number[]= [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

}

