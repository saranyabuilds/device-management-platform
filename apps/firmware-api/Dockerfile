# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /build

# Copy monorepo root files
COPY package*.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY nx.json ./

# Copy libs
COPY libs ./libs

# Copy firmware-api app
COPY apps/firmware-api ./apps/firmware-api

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build firmware-api
RUN pnpm nx build firmware-api --configuration=production

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install production dependencies only
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /build/dist/apps/firmware-api ./dist

# Non-root user for security
RUN addgroup -g 1001 nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
