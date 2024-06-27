import { ConsoleLogger, Injectable, Inject } from '@nestjs/common';
import { TelegramService } from 'src/telegram/telegram.service';
import { TEXT } from './constants';
import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';

@Injectable()
export class TelegramLogger extends ConsoleLogger {
  constructor(
    @Inject(TelegramService)
    private readonly telegramService: TelegramService,
  ) {
    super();
  }

  //   alertStart(exchanges: ExchangerType[]) {
  //     this.telegramService.sendMessage(TEXT.START(exchanges));
  //   }

  alertEnd(
    successExchanges: ExchangerType[],
    failedExchanges: ExchangerType[],
    pausedExchanges: ExchangerType[],
    elsapsedTime: number,
  ) {
    this.telegramService.sendMessage(TEXT.END(successExchanges, failedExchanges, pausedExchanges, elsapsedTime));
  }

  lastUpdate(data: { platform: string; poolName: string; timeSinceUpdate: number }[]) {
    this.telegramService.sendMessage(TEXT.LAST_UPDATE(data));
  }

  error(message: any, stack?: string, context?: string) {
    this.telegramService.sendMessage(TEXT.ERROR(message, stack, context || 'Unknown context'));
    super.error(message, stack, context);
  }
}
