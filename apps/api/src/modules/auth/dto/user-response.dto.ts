import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.role = user.role;
    return dto;
  }
}

export class SignUpResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty()
  accessToken!: string;
}
