import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('APP_PORT');

  await app.listen(port, () => {
    console.log('ENV="' + configService.get('NODE_ENV') + '", Server started on port = ' + port);
  });
}
bootstrap();
