import { Transform } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return 'active';
    const normalized = value.toString().toLowerCase().trim();
    if (['active', '1', 'true', 'yes', 'enabled', 'on', 'y', 'a'].includes(normalized)) return 'active';
    if (['inactive', '0', 'false', 'no', 'disabled', 'off', 'n', 'i', 'disabled', 'draft', 'pending'].includes(normalized)) return 'inactive';
    return 'active';
  })
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
