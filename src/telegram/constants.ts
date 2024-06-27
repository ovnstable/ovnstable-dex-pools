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
  END: (
    exchangesSuccess: ExchangerType[],
    exchangesFail: ExchangerType[],
    exchangesPaused: ExchangerType[],
    elapsedTime: number,
  ) => {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = Math.floor(elapsedTime % 60);
    const formattedTime = `${minutes}m ${seconds}s`;

    let res = `🏁 Pools parser complete for:\n`;
    res += `⏱️ Elapsed Time: ${formattedTime}\n\n`;

    exchangesSuccess.forEach(exchange => {
      res += `✅ ${exchange}\n`;
    });

    if (exchangesPaused.length > 0) {
      res += `\n`;
      exchangesPaused.forEach(exchange => {
        res += `⏸️ ${exchange}\n`;
      });
    }

    if (exchangesFail.length > 0) {
      res += `\n`;
      exchangesFail.forEach(exchange => {
        res += `❌ ${exchange}\n`;
      });
    }

    return res;
  },
  LAST_UPDATE: (data: { platform: string; poolName: string; timeSinceUpdate: number }[]) => {
    let res = '📊 Daily pool update Status:\n\n';
    const maxMessageLength = 4096;
    const oneHourInMillis = 60 * 60 * 1000;
    const andMoreText = ' and more...';

    // Sort data by timeSinceUpdate in descending order
    const sortedData = data.sort((a, b) => b.timeSinceUpdate - a.timeSinceUpdate);

    for (const { platform, poolName, timeSinceUpdate } of sortedData) {
      const isStale = timeSinceUpdate > oneHourInMillis;
      const timeSinceUpdateText = formatElapsedTime(timeSinceUpdate);
      const str = `${isStale ? `❗ [${platform}] ${poolName} - Last update: ${timeSinceUpdateText}\n` : ''}`;

      if (res.length + str.length < maxMessageLength) {
        res += str;
      } else if (res.length + andMoreText.length < maxMessageLength) {
        res += andMoreText;
        break;
      } else {
        break;
      }
    }

    return res;
  },
};
