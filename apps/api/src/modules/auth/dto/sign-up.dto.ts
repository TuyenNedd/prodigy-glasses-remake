import { signUpSchema } from '@prodigy/shared-types';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  password!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  name!: string;

  @ApiProperty({ example: '+84901234567', required: false })
  phone?: string;
}

export { signUpSchema };
