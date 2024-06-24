import { ExchangerType } from 'src/exchanger/models/inner/exchanger.type';

export type LogMessage = {
  exchanger: ExchangerType;
  title?: string;
  message?: any;
};
