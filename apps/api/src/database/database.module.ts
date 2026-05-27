import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'prodigy'),
        password: config.get<string>('DB_PASSWORD', 'prodigy_secret'),
        database: config.get<string>('DB_DATABASE', 'prodigy_glasses'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') === 'test',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
