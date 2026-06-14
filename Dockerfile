# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Install deps (cached layer)
COPY pnpm-lock.yaml package.json ./
COPY patches/ ./patches/
RUN pnpm fetch --frozen-lockfile
COPY . .
RUN pnpm install --offline --frozen-lockfile

# Build Vite frontend + esbuild server bundle
RUN pnpm build

# Prune to production-only deps so the runtime stage stays lean
RUN pnpm prune --prod

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

RUN addgroup -S biome && adduser -S biome -G biome

WORKDIR /app

# Only copy compiled output and production node_modules (no dev deps, no source)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER biome

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]