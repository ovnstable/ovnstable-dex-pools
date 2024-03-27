import * as Joi from 'joi';

export type ConfigSchema = {
  NODE_ENV: string;
  APP_PORT: number;

  TYPEORM_CONNECTION: string;
  TYPEORM_HOST: string;
  TYPEORM_USERNAME: string;
  TYPEORM_PASSWORD: string;
  TYPEORM_DATABASE: string;
  TYPEORM_PORT: number;
  TYPEORM_SYNCHRONIZE: boolean;
  TYPEORM_LOGGING: boolean;
  TYPEORM_ENTITIES: string;
  TYPEORM_MIGRATIONS: string;

  IS_MAC: boolean;

  WEB3_RPC_OPTIMISM: string;
  WEB3_RPC_ARBITRUM: string;
  WEB3_RPC_BSC: string;
  WEB3_RPC_ZKSYNC: string;
  WEB3_RPC_POLYGON: string;
  WEB3_RPC_BASE: string;
  WEB3_RPC_LINEA: string;

  TELEGRAM_BOT_CHAT: string;
  TELEGRAM_BOT_API_KEY: string;
  TELEGRAM_BOT_ERROR_CHAT: string;
  TELEGRAM_BOT_ENABLED: boolean;

  PRIVATE_KEY: string;
};

export const configValidationSchema = Joi.object<ConfigSchema>({
  NODE_ENV: Joi.string().required().valid('dev', 'prod'),
  APP_PORT: Joi.number().default(3000),

  TYPEORM_CONNECTION: Joi.string().required(),
  TYPEORM_HOST: Joi.string().required(),
  TYPEORM_USERNAME: Joi.string().required(),
  TYPEORM_PASSWORD: Joi.string().required(),
  TYPEORM_DATABASE: Joi.string().required(),
  TYPEORM_PORT: Joi.number().required(),
  TYPEORM_SYNCHRONIZE: Joi.boolean().required(),
  TYPEORM_LOGGING: Joi.boolean().required(),
  TYPEORM_ENTITIES: Joi.string().required(),
  TYPEORM_MIGRATIONS: Joi.string().required(),

  IS_MAC: Joi.boolean().required(),

  WEB3_RPC_OPTIMISM: Joi.string().required(),
  WEB3_RPC_ARBITRUM: Joi.string().required(),
  WEB3_RPC_BSC: Joi.string().required(),
  WEB3_RPC_ZKSYNC: Joi.string().required(),
  WEB3_RPC_POLYGON: Joi.string().required(),
  WEB3_RPC_BASE: Joi.string().required(),
  WEB3_RPC_LINEA: Joi.string().required(),

  TELEGRAM_BOT_CHAT: Joi.string().required(),
  TELEGRAM_BOT_API_KEY: Joi.string().required(),
  TELEGRAM_BOT_ERROR_CHAT: Joi.string().required(),
  TELEGRAM_BOT_ENABLED: Joi.boolean().required(),

  PRIVATE_KEY: Joi.string().required(),
});
