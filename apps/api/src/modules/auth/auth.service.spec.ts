import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockRefreshTokenRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  manager: { connection: { query: jest.fn() } },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultVal?: unknown) => {
    const map: Record<string, unknown> = {
      BCRYPT_SALT_ROUNDS: 10,
      JWT_ACCESS_SECRET: 'test-access-secret-32-chars-long!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-32-chars-long!',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return map[key] ?? defaultVal;
  }),
};

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'default_IORedisModuleConnectionToken', useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        service.signUp({ email: 'test@test.com', password: 'password123', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user with hashed password and return tokens', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockImplementation((data) => ({ ...data, role: UserRole.USER }));
      mockUserRepo.save.mockResolvedValue(undefined);
      mockRefreshTokenRepo.create.mockImplementation((data) => data);
      mockRefreshTokenRepo.save.mockResolvedValue(undefined);

      const result = await service.signUp({
        email: 'new@test.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result.user.email).toBe('new@test.com');
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      // Password should be hashed
      const savedUser = mockUserRepo.create.mock.calls[0][0];
      expect(savedUser.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', savedUser.password)).toBe(true);
    });
  });

  describe('signIn', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.signIn({ email: 'notfound@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password wrong', async () => {
      const hashedPassword = await bcrypt.hash('correct', 10);
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: '1',
          email: 'test@test.com',
          password: hashedPassword,
          role: 'USER',
        }),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.signIn({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return tokens on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('correct123', 10);
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: '1',
          email: 'test@test.com',
          name: 'Test',
          password: hashedPassword,
          role: 'USER',
        }),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);
      mockRefreshTokenRepo.create.mockImplementation((data) => data);
      mockRefreshTokenRepo.save.mockResolvedValue(undefined);

      const result = await service.signIn({ email: 'test@test.com', password: 'correct123' });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('mock-token');
    });
  });
});
