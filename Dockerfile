FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY nest-cli.json tsconfig*.json ./
COPY .env.production .env
COPY src ./src
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN npm run build

FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY .env.production .env
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/dist ./dist

RUN chown -R node:node /app

EXPOSE 4000

USER node

CMD ["node", "dist/main.js"]
