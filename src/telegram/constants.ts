import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';
import { LogMessage } from './types/log.type';
import { formatElapsedTime } from './utils/formatElapsedTime';

export const TEXT = {
  LOG: (message: any, context: any) => {
    return `📝 [${context}] Log: ${message}`;
  },
  ERROR: (message: any, stack = '', context?: any) => {
    return `⚠️ [${context}]\n\n❌ Error: ${message}\n\n📄 Stack Trace: ${stack}`;
  },
  START: (exchanges: ExchangerType[]) => {
    let res = `🚀 Starting pools parser for:\n\n`;
    exchanges.forEach(exchange => {
      res += `🔹 ${exchange}\n`;
    });
    return res;
  },
  END: (exchangesSuccess: ExchangerType[], exchangesFail: ExchangerType[], elapsedTime: number) => {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = Math.floor(elapsedTime % 60);
    const formattedTime = `${minutes}m ${seconds}s`;

    let res = `🏁 Pools parser complete for:\n`;
    res += `⏱️ Elapsed Time: ${formattedTime}\n\n`;

    exchangesSuccess.forEach(exchange => {
      res += `✅ ${exchange}\n`;
    });

    if (exchangesFail.length > 0) {
      res += `\n`;
      exchangesFail.forEach(exchange => {
        res += `❌ ${exchange}\n`;
      });
    }

    return res;
  },
  LAST_UPDATE: (data: { platform: string; poolName: string; timeSinceUpdate: number }[]) => {
    let res = `📊 Daily pool update Status:\n\n`;

    data.forEach(({ platform, poolName, timeSinceUpdate }) => {
      const oneHourInMillis = 60 * 60 * 1000;
      const isStale = timeSinceUpdate > oneHourInMillis;
      const timeSinceUpdateText = formatElapsedTime(timeSinceUpdate);

      res += `${isStale ? `❗ [${platform}] ${poolName} - Last update: ${timeSinceUpdateText}  \n` : ''}`;
    });

    return res;
  },
};
