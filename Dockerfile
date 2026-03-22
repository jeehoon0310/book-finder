FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci && \
    echo "=== node_modules/.bin contents ===" && \
    ls node_modules/.bin/ | head -20 && \
    echo "=== next package check ===" && \
    ls node_modules/next/package.json 2>/dev/null && cat node_modules/next/package.json 2>/dev/null | head -5 || echo "next NOT installed" && \
    echo "=== npm ls next ===" && \
    npm ls next 2>/dev/null || true
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
