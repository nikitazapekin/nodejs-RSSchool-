## Docker Hub

https://hub.docker.com/layers/nikitazapekin/rs-app/latest/images/sha256:9990acb6dad5948ac8f6ca6501b3b74c7d75d4474884004b233c6ef5cc9761bd?uuid=5b61909a-eb8d-4ccd-afb0-a8bf5e576f94


# Knowledge Hub API

REST API for a Knowledge Hub platform built with Nest.js and TypeScript.

## AI Integration (Gemini)

This API integrates Google Gemini API for AI-powered article processing.

### Gemini Model

- **Model**: `gemini-2.0-flash` (configurable via `GEMINI_MODEL` env var)

### How to Obtain Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **"Create API key"** in the API keys section
4. Select or create a Google Cloud project
5. Copy the generated API key

### Setup After Cloning

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Add your Gemini API key** to `.env`:
   ```env
   GEMINI_API_KEY=your-actual-api-key-here
   ```

4. **(Optional) Configure AI settings** in `.env`:
   ```env
   GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
   GEMINI_MODEL=gemini-2.0-flash
   AI_RATE_LIMIT_RPM=20
   AI_CACHE_TTL_SEC=300
   ```

5. **Prepare the database with real article data:**
   ```bash
   npm run prisma:migrate:deploy
   npm run prisma:seed
   ```

6. **Run the application:**
   ```bash
   npm run start:dev
   ```
   Or with Docker:
   ```bash
   ./compose-up.sh
   ```

### Testing AI Endpoints

Swagger UI is available at `http://localhost:4002/doc`

**Important**: All AI endpoints require Bearer token authentication.

1. **Register/login** via `/auth/signup` or `/auth/login` to get JWT token
2. **Authorize** in Swagger UI with the token

#### Available AI Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/articles/:articleId/summarize` | POST | Summarize an article |
| `/ai/articles/:articleId/translate` | POST | Translate article content |
| `/ai/articles/:articleId/analyze` | POST | Analyze article content |
| `/ai/generate` | POST | Free-form text generation |
| `/ai/usage` | GET | Get AI usage statistics |

#### Example: Summarize Article

```bash
curl -X POST http://localhost:4002/ai/articles/{articleId}/summarize \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"maxLength": "medium"}'
```

Response:
```json
{
  "articleId": "...",
  "summary": "...",
  "originalLength": 1234,
  "summaryLength": 234
}
```

#### Example: Translate Article

```bash
curl -X POST http://localhost:4002/ai/articles/{articleId}/translate \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage": "Spanish", "sourceLanguage": "English"}'
```

#### Example: Analyze Article

```bash
curl -X POST http://localhost:4002/ai/articles/{articleId}/analyze \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"task": "review"}'
```

#### Example: Generic Prompt With Session Context

```bash
curl -X POST http://localhost:4002/ai/generate \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Summarize our previous discussion in one paragraph","sessionId":"550e8400-e29b-41d4-a716-446655440000"}'
```

### Known Limitations

- **Free-tier quotas**: Gemini free tier has rate limits (requests per minute/day)
- **Latency**: AI processing can take 2-10 seconds depending on content length
- **Regional availability**: Gemini API may not be available in all regions
- **Translation quality**: Auto-detected source language may not always be accurate
- **Response caching**: Cached responses expire after `AI_CACHE_TTL_SEC` (default 300s)
- **Rate limiting**: Maximum `AI_RATE_LIMIT_RPM` (default 20) requests per minute per IP
- **Short-term memory**: Generic prompt sessions are stored only in memory and are lost on restart

## Requirements

- Node.js `24.10.0` or newer within `24.x`
- npm
- Docker and Docker Compose

## Setup

```bash
npm install
```

Create a local `.env` from `.env.example` before running the app.

## Run

The service uses `.env` and listens on port `4002` by default.

```bash
npm start
```

Swagger UI is available at:

```text
http://localhost:4002/doc
```

## Available Scripts

```bash
npm start
npm run start:dev
npm run build
npm run lint
npm test
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:seed
npm run prisma:studio
```

## Docker

Start the full stack with PostgreSQL:

```bash
cp .env.example .env
./compose-up.sh
```

`compose-up.sh` wraps `docker compose up --build` and removes any stale `rs-db-1` container/orphans before starting the stack so the legacy `docker-compose` client does not crash on Docker releases that stopped providing the `ContainerConfig` metadata field.

The Compose stack includes:

- `db` on port `5432`
- `app` on port `4002`
- optional `adminer` on port `8080` via `docker compose --profile debug up --build`

The application and PostgreSQL communicate over the custom `knowledge_hub_network` network, and PostgreSQL data is stored in the named `postgres_data` volume.
On first PostgreSQL startup, the initial Prisma SQL migration is applied automatically through `docker-entrypoint-initdb.d`.

## Prisma

The API now uses PostgreSQL through Prisma ORM.

Useful commands:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
```

If you run the Nest app locally against the Dockerized database, set `DATABASE_URL` to use `localhost` instead of `db`, for example:

```text
postgresql://knowledge_hub:knowledge_hub@localhost:5432/knowledge_hub?schema=public&connection_limit=5&pool_timeout=20
```

## Data Model

- `User`
- `Article`
- `Category`
- `Comment`
- `Tag`

User passwords are never returned in API responses.

## API Routes

### User

- `GET /user`
- `GET /user/:id`
- `POST /user`
- `PUT /user/:id`
- `DELETE /user/:id`

Create body:

```json
{
  "login": "editor01",
  "password": "secret123",
  "role": "editor"
}
```

Update password body:

```json
{
  "oldPassword": "secret123",
  "newPassword": "newSecret456"
}
```

### Article

- `GET /article`
- `GET /article/:id`
- `POST /article`
- `PUT /article/:id`
- `DELETE /article/:id`

Supported filters:

- `status`
- `categoryId`
- `tag`

Example:

```text
GET /article?status=published&tag=nodejs
```

Create body:

```json
{
  "title": "Nest fundamentals",
  "content": "Article body",
  "status": "draft",
  "authorId": null,
  "categoryId": null,
  "tags": ["nestjs", "nodejs"]
}
```

### Category

- `GET /category`
- `GET /category/:id`
- `POST /category`
- `PUT /category/:id`
- `DELETE /category/:id`

Create body:

```json
{
  "name": "Backend",
  "description": "Server-side engineering content"
}
```

### Comment

- `GET /comment?articleId={articleId}`
- `POST /comment`
- `DELETE /comment/:id`

Create body:

```json
{
  "content": "Useful article",
  "articleId": "00000000-0000-4000-8000-000000000000",
  "authorId": null
}
```

### AI (requires Bearer token)

- `POST /ai/articles/:articleId/summarize`
- `POST /ai/articles/:articleId/translate`
- `POST /ai/articles/:articleId/analyze`
- `POST /ai/generate`
- `GET /ai/usage`

Summarize body:
```json
{
  "maxLength": "short" | "medium" | "detailed"
}
```

Translate body:
```json
{
  "targetLanguage": "Spanish",
  "sourceLanguage": "English"  // optional
}
```

Analyze body:
```json
{
  "task": "review" | "bugs" | "optimize" | "explain"
}
```

Generate body:
```json
{
  "prompt": "Your prompt here"
}
```

## Validation and Behavior

- All request bodies are validated with DTO classes and a global validation pipe.
- UUID route parameters are validated with Nest pipes.
- Request logging is implemented through Nest middleware.
- Deleting a user sets `authorId` to `null` in related articles and removes their comments.
- Deleting a category sets `categoryId` to `null` in related articles.
- Deleting an article removes its comments.
- Creating a comment for a missing article returns `422 Unprocessable Entity`.
- Article tags are persisted through a many-to-many Prisma relation.

## Pagination and Sorting

List endpoints support optional pagination and sorting.

Query params:

- `page`
- `limit`
- `sortBy`
- `order` (`asc` or `desc`)

When `page` or `limit` is passed, the response format becomes:

```json
{
  "total": 1,
  "page": 1,
  "limit": 10,
  "data": []
}
```

Without pagination params, list endpoints return a plain array.

## Docker Hub

https://hub.docker.com/layers/nikitazapekin/rs-app/latest/images/sha256:9990acb6dad5948ac8f6ca6501b3b74c7d75d4474884004b233c6ef5cc9761bd?uuid=5b61909a-eb8d-4ccd-afb0-a8bf5e576f94
