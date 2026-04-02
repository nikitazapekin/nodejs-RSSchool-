import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export class ArticleListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ArticleStatus, enumName: 'ArticleStatus' })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;
}
