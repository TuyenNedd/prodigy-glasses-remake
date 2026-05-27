import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { DataSource } from 'typeorm';
import * as cookieParser from 'cookie-parser';

import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mysqlContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;

  beforeAll(async () => {
    // Start MySQL container
    mysqlContainer = await new GenericContainer('mysql:8')
      .withEnvironment({
        MYSQL_ROOT_PASSWORD: 'test',
        MYSQL_DATABASE: 'prodigy_test',
        MYSQL_USER: 'test',
        MYSQL_PASSWORD: 'test',
      })
      .withExposedPorts(3306)
      .start();

    // Start Redis container
    redisContainer = await new GenericContainer('redis:7').withExposedPorts(6379).start();

    const mysqlPort = mysqlContainer.getMappedPort(3306);
    const redisPort = redisContainer.getMappedPort(6379);

    // Set env vars for the test
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = String(mysqlPort);
    process.env.DB_USERNAME = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_DATABASE = 'prodigy_test';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = String(redisPort);
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-long!!';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-long!';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    // Run migrations
    const dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await mysqlContainer?.stop();
    await redisContainer?.stop();
  });

  describe('POST /api/auth/sign-up', () => {
    it('should create user and return 201 with tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'test@example.com', password: 'password123', name: 'Test User' })
        .expect(201);

      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.password).toBeUndefined(); // Password never in response
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 409 on duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'test@example.com', password: 'password123', name: 'Duplicate' })
        .expect(409);
    });

    it('should return 400 on invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'invalid', password: 'password123', name: 'Bad Email' })
        .expect(400);
    });

    it('should return 400 on short password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'short@test.com', password: '123', name: 'Short Pass' })
        .expect(400);
    });
  });

  describe('POST /api/auth/sign-in', () => {
    it('should return 200 with tokens on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.accessToken).toBeDefined();
    });

    it('should return 401 on wrong password (no user enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);

      expect(res.body.code).toBe('invalid_credentials');
    });

    it('should return 401 on non-existent email (same error)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'nonexistent@test.com', password: 'password123' })
        .expect(401);

      expect(res.body.code).toBe('invalid_credentials');
    });
  });

  describe('Security: password never exposed', () => {
    it('GET /api/auth/me should not include password', async () => {
      const signIn = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'test@example.com', password: 'password123' });

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${signIn.body.accessToken}`)
        .expect(200);

      expect(res.body.password).toBeUndefined();
      expect(res.body.email).toBe('test@example.com');
    });
  });
});
