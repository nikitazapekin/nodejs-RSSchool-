export interface Comment {
  id: string;
  content: string;
  articleId: string;
  authorId: string | null;
  createdAt: number;
}
