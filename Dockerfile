# ── Stage 1: dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# The in-memory Mongo used by the e2e tests must not download a binary here.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: production ──────────────────────────────────────────────────────
FROM node:22-alpine AS production
ENV NODE_ENV=production \
    MONGOMS_DISABLE_POSTINSTALL=1
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["node", "dist/main"]
