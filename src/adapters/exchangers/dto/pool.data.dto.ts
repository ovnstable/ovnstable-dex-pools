import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PoolData {
  @IsNumber()
  @IsNotEmpty()
  exchangeId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @IsNotEmpty()
  decimals: number;

  @IsString()
  @IsNotEmpty()
  tvl: string;

  @IsString()
  @IsNotEmpty()
  apr: string;

  @IsString()
  @IsNotEmpty()
  chain: string;

  @IsBoolean()
  @IsNotEmpty()
  enable: boolean;

  @IsString()
  @IsNotEmpty()
  metaData: string; // some additional data

  @IsString()
  @IsNotEmpty()
  pool_version: string;

  toString() {
    return JSON.stringify(this);
  }
}
