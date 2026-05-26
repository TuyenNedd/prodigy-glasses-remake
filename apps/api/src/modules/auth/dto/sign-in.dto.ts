import { signInSchema } from '@prodigy/shared-types';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'password123' })
  password!: string;
}

export { signInSchema };
