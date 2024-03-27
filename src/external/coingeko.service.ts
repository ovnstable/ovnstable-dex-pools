import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CoingekoService {
  async getTokenPrice(tokenId, currency): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=${currency}`,
      );

      const price = response.data[tokenId][currency];
      console.log(`Price of ${tokenId} in ${currency}: ${price}`);
      return parseFloat(price);
    } catch (error) {
      console.error('Error fetching token price:', error.message, error);
    }
  }
}
