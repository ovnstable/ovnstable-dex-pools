

export enum Operation  {
  SKIM = 0,
  SYNC = 1,
  BRIBE = 2,
  CUSTOM = 3
}

export class SkimDto {

  token: string;
  poolName: string;
  bribe: string;
  operation: Operation;
  to: string;
  dexName: string;
  feePercent: number;
  feeReceiver: string;
  __gap: number[]= [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

}

