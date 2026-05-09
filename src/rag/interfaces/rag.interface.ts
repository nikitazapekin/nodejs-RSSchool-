import { ArticleStatus } from '../../common/enums/article-status.enum';

export interface RagIndexableArticle {
  id: string;
  title: string;
  content: string;
  status: ArticleStatus;
  categoryId: string | null;
  tags: string[];
  updatedAt: Date;
}

export interface RagChunk {
  id: string;
  articleId: string;
  articleTitle: string;
  chunkIndex: number;
  chunkText: string;
  contentForEmbedding: string;
  status: ArticleStatus;
  categoryId: string | null;
  tags: string[];
  updatedAt: string;
}

export interface RagVectorPayload {
  articleId: string;
  articleTitle: string;
  chunkIndex: number;
  chunkText: string;
  contentForEmbedding: string;
  status: ArticleStatus;
  categoryId: string | null;
  tags: string[];
  updatedAt: string;
}

export interface RagSearchFilters {
  articleStatus?: ArticleStatus;
  categoryId?: string;
  tags?: string[];
}

export interface RagConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface RagSearchHit {
  id: string;
  payload: RagVectorPayload;
  score: number;
}
