import { updateProfileSchema } from '@prodigy/shared-types';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  name?: string;

  @ApiPropertyOptional({ example: '+84901234567', nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ', nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ example: 'Hồ Chí Minh', nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatar?: string | null;
}

export { updateProfileSchema };
