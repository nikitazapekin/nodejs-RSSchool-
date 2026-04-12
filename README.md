# Knowledge Hub API

REST API for a Knowledge Hub platform built with Nest.js and TypeScript.

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

The service uses `.env` and listens on port `4000` by default.

```bash
npm start
```

Swagger UI is available at:

```text
http://localhost:4000/doc
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
docker compose up --build
```

The Compose stack includes:

- `db` on port `5432`
- `app` on port `4000`
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

Add your pushed image URL here after publishing the application image to Docker Hub.
