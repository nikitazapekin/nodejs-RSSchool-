import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiRateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { AiService } from './ai.service';
import { SummarizeArticleDto, SummaryLength } from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { AnalyzeArticleDto, AnalysisTask } from './dto/analyze-article.dto';
import { GenerateDto } from './dto/generate.dto';
import { ArticleIdParamDto } from './dto/article-id-param.dto';

@ApiTags('AI')
@ApiBearerAuth()
@UseInterceptors(AiRateLimitInterceptor)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('articles/:articleId/summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Summarize an article' })
  @ApiResponse({ status: 200, description: 'Article summarized successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async summarizeArticle(
    @Param() params: ArticleIdParamDto,
    @Body() dto: SummarizeArticleDto,
  ) {
    return this.aiService.summarizeArticle(
      params.articleId,
      dto.maxLength ?? SummaryLength.MEDIUM,
    );
  }

  @Post('articles/:articleId/translate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Translate an article' })
  @ApiResponse({ status: 200, description: 'Article translated successfully' })
  @ApiResponse({ status: 400, description: 'Missing targetLanguage' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async translateArticle(
    @Param() params: ArticleIdParamDto,
    @Body() dto: TranslateArticleDto,
  ) {
    return this.aiService.translateArticle(
      params.articleId,
      dto.targetLanguage,
      dto.sourceLanguage,
    );
  }

  @Post('articles/:articleId/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze an article' })
  @ApiResponse({ status: 200, description: 'Article analyzed successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async analyzeArticle(
    @Param() params: ArticleIdParamDto,
    @Body() dto: AnalyzeArticleDto,
  ) {
    return this.aiService.analyzeArticle(params.articleId, dto.task ?? AnalysisTask.REVIEW);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate text from prompt' })
  @ApiResponse({ status: 200, description: 'Text generated successfully' })
  async generate(@Body() dto: GenerateDto) {
    return this.aiService.generate(dto.prompt, dto.sessionId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get AI usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getUsage() {
    return this.aiService.getUsageStats();
  }
}
