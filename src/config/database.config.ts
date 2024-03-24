import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class PostgresConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get('TYPEORM_HOST'),
      username: this.configService.get('TYPEORM_USERNAME'),
      password: this.configService.get('TYPEORM_PASSWORD'),
      database: this.configService.get('TYPEORM_DATABASE'),
      port: this.configService.get('TYPEORM_PORT'),
      synchronize: this.configService.get('TYPEORM_SYNCHRONIZE'),
      logging: this.configService.get('TYPEORM_LOGGING'),
      entities: [this.configService.get('TYPEORM_ENTITIES')],
      migrations: [this.configService.get('TYPEORM_MIGRATIONS')],
    };
  }
}