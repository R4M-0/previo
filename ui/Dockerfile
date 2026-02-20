FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app/ui

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder

WORKDIR /app/ui

COPY --from=deps /app/ui/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache python3 py3-pip

WORKDIR /app/ui

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/ui/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/ui/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/ui/.next/static ./.next/static

# Install backend Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages markdown

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
