# Knowledge Hub API

REST API for a Knowledge Hub platform built with NestJS, TypeScript, PostgreSQL, Prisma, Google Gemini, and Qdrant.

## Stack

- Node.js `24.10.0` or newer within `24.x`
- NestJS `11`
- TypeScript `5`
- PostgreSQL `16`
- Prisma `7`
- Google Gemini API
- Qdrant vector database

## Gemini Setup

### Models used

- Generation model: `gemini-2.0-flash`
- Embedding model: `text-embedding-004`

Both are configurable through environment variables:

```env
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

### How to obtain a Gemini API key

1. Open [Google AI Studio](https://aistudio.google.com).
2. Sign in with your Google account.
3. Open the **API keys** page.
4. Click **Create API key**.
5. Select an existing Google Cloud project or create a new one.
6. Copy the generated key.
7. Put it into your local `.env` file as `GEMINI_API_KEY=...`.

## Vector DB

This project uses **Qdrant** as the external vector database.

- Compose service name: `vectordb`
- Internal URL from the app container: `http://vectordb:6333`
- Persistent volume: `qdrant_data`

Relevant env variables:

```env
RAG_VECTOR_DB_PROVIDER=qdrant
RAG_VECTOR_DB_URL=http://vectordb:6333
RAG_VECTOR_COLLECTION=knowledge_hub_articles
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=200
RAG_CONVERSATION_MAX_MESSAGES=20
```

## Environment Setup

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Required variables for this assignment:

```env
PORT=4002
HOST=0.0.0.0

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=knowledge_hub
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@db:5432/knowledge_hub?schema=public&connection_limit=5&pool_timeout=20

JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

GEMINI_API_KEY=your-gemini-api-key
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

RAG_VECTOR_DB_PROVIDER=qdrant
RAG_VECTOR_DB_URL=http://vectordb:6333
RAG_VECTOR_COLLECTION=knowledge_hub_articles
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=200
RAG_CONVERSATION_MAX_MESSAGES=20
```

## Full Startup Flow After Clone

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Put your real Gemini API key into `.env`.

4. Start the full stack:

```bash
docker compose up --build
```

The Compose stack includes:

- `db` for PostgreSQL
- `vectordb` for Qdrant
- `app` for the NestJS API
- optional `adminer` via `docker compose --profile debug up --build`

On startup, the app container runs Prisma migrations automatically before the NestJS server starts.

5. Open Swagger:

```text
http://localhost:4002/doc
```

6. Create a user and obtain a JWT token:

- `POST /auth/signup`
- `POST /auth/login`

7. Create Knowledge Hub data:

- create categories if needed
- create articles
- publish articles that should participate in default RAG indexing

8. Build the RAG index:

```bash
curl -X POST http://localhost:4002/ai/rag/index \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"onlyPublished":true}'
```

## RAG Endpoints

All `/ai/*` endpoints require Bearer authentication.

### Index Knowledge Hub data

`POST /ai/rag/index`

Example:

```bash
curl -X POST http://localhost:4002/ai/rag/index \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "onlyPublished": true,
    "articleIds": ["11111111-1111-4111-8111-111111111111"]
  }'
```

Example response:

```json
{
  "indexedArticles": 1,
  "indexedChunks": 4,
  "vectorCollection": "knowledge_hub_articles"
}
```

### Semantic search

`POST /ai/rag/search`

Example:

```bash
curl -X POST http://localhost:4002/ai/rag/search \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How is article moderation handled?",
    "limit": 5,
    "articleStatus": "published",
    "tags": ["nestjs"]
  }'
```

Example response:

```json
{
  "results": [
    {
      "articleId": "11111111-1111-4111-8111-111111111111",
      "articleTitle": "Moderation Workflow",
      "chunk": "Published articles can be reviewed by editors before archival...",
      "similarity": 0.812345
    }
  ]
}
```

### Chat with Knowledge Hub RAG

`POST /ai/rag/chat`

Example:

```bash
curl -X POST http://localhost:4002/ai/rag/chat \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Summarize the moderation flow and mention the main status transitions."
  }'
```

Example follow-up in the same conversation:

```bash
curl -X POST http://localhost:4002/ai/rag/chat \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Which roles are involved?",
    "conversationId": "<conversation-id-from-previous-response>"
  }'
```

Example response:

```json
{
  "answer": "Editors can move articles from draft to published, and published articles can later be archived...",
  "sources": [
    {
      "articleId": "11111111-1111-4111-8111-111111111111",
      "articleTitle": "Moderation Workflow",
      "relevantChunk": "Editors can publish drafts once the review is complete..."
    }
  ],
  "conversationId": "6b0d2d9a-6515-4afc-9172-0a0eb4b24fdb"
}
```

### Delete one article from the vector index

`DELETE /ai/rag/index/articles/:articleId`

Example:

```bash
curl -X DELETE http://localhost:4002/ai/rag/index/articles/11111111-1111-4111-8111-111111111111 \
  -H "Authorization: Bearer <jwt>"
```

### Inspect conversation history

`GET /ai/rag/chat/:conversationId/history`

Example:

```bash
curl http://localhost:4002/ai/rag/chat/<conversation-id>/history \
  -H "Authorization: Bearer <jwt>"
```

## RAG Flow

1. Published or selected Knowledge Hub articles are loaded from PostgreSQL.
2. Article content is split into deterministic overlapping chunks.
3. Gemini embeddings are generated for each chunk.
4. Chunks with metadata are stored in Qdrant.
5. Search requests embed the query, retrieve relevant chunks, and apply metadata filters.
6. Chat requests embed the question, retrieve relevant chunks, build a grounded prompt, and generate an answer with Gemini.
7. Returned sources are the exact chunks passed into the grounded prompt.

## Chunking

Chunking is configurable by env:

```env
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=200
```

The implementation is deterministic and uses stable chunk IDs based on `articleId:chunkIndex`.

## Docker Notes

Start everything with:

```bash
docker compose up --build
```

Qdrant data persists in the `qdrant_data` volume, PostgreSQL data persists in the `postgres_data` volume.

## Available Scripts

```bash
npm run build
npm run start
npm run start:dev
npm run lint
npm run test
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```

## Known Limitations

- Gemini free tier has request and daily quota limits.
- First full reindex can take noticeable time on larger article sets because embeddings are generated remotely.
- Search and chat latency depends on both Gemini and Qdrant availability.
- Gemini API availability is region-dependent.
- Conversation memory is stored in PostgreSQL and intentionally trimmed to the last `RAG_CONVERSATION_MAX_MESSAGES` messages.
- Retrieval quality depends on article content quality, chunk size, and how well the indexed articles cover the question.
