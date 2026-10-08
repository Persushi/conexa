import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Role } from '../domain/role.enum';

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export class RegisterDto {
  @ApiProperty({ example: 'luke@rebels.org' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ng!Pass',
    description: 'Min 8 chars with upper, lower, number and symbol',
  })
  @IsString()
  @MaxLength(72) // bcrypt silently truncates beyond 72 bytes
  @Matches(PASSWORD_REGEX, {
    message:
      'password must have at least 8 characters, upper, lower, number and symbol',
  })
  password: string;

  // TODO(security): remove before production. See AuthService.register.
  @ApiPropertyOptional({
    enum: Role,
    default: Role.USER,
    description:
      'Role for the new account. ⚠️ Challenge-only: self-assigned roles are insecure ' +
      'and this field must be removed before production.',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
