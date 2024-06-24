import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { TEXT } from './constants';
import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';
import { LogMessage } from './types/log.type';

@Injectable()
export class TelegramService {
  constructor(
    @InjectBot(process.env.BOT_NAME)
    private readonly bot: Telegraf,
    private readonly configService: ConfigService,
  ) {}

  async sendMessage(text: string) {
    await this.bot.telegram.sendMessage(this.configService.get<string>('CHAT_ID'), text, {
      parse_mode: 'HTML',
    });
    return;
  }
}
