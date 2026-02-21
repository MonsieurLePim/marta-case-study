# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json inversify.config.ts ./
COPY src ./src
RUN yarn build

# ---- production stage ----
FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist

EXPOSE 9000
CMD ["node", "./dist/src/index.js"]
