import { ConsoleLogger, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramLogger } from './telegram-logger.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('BOT_TOKEN'),
        botName: configService.get<string>('BOT_NAME'),
        include: [TelegramModule],
      }),
    }),
  ],
  exports: [TelegramLogger],
  providers: [TelegramService, TelegramLogger],
})
export class TelegramModule {}
