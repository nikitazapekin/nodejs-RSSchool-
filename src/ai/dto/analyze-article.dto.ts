import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum AnalysisTask {
  REVIEW = 'review',
  BUGS = 'bugs',
  OPTIMIZE = 'optimize',
  EXPLAIN = 'explain',
}

export class AnalyzeArticleDto {
  @ApiPropertyOptional({ enum: AnalysisTask, default: AnalysisTask.REVIEW })
  @IsOptional()
  @IsEnum(AnalysisTask)
  task?: AnalysisTask;
}
