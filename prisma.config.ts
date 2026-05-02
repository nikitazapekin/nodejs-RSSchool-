import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

const buildTimeDatabaseUrl =
  'postgresql://build:build@localhost:5432/build?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? buildTimeDatabaseUrl,
  },
});
