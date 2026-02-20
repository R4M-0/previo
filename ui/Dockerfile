FROM node:20-bookworm-slim AS deps

WORKDIR /app/ui

COPY ui/package.json ui/package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder

WORKDIR /app/ui

COPY --from=deps /app/ui/node_modules ./node_modules
COPY ui/. .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/ui

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/ui/public ./public
COPY --from=builder --chown=node:node /app/ui/.next/standalone ./
COPY --from=builder --chown=node:node /app/ui/.next/static ./.next/static

# Install backend Python dependencies in the UI runtime container because
# Next.js API routes spawn backend scripts from /app/backend.
COPY backend/requirements.txt /tmp/backend-requirements.txt
RUN python3 -m pip install --no-cache-dir --break-system-packages -r /tmp/backend-requirements.txt \
    && rm -f /tmp/backend-requirements.txt

RUN mkdir -p /app/backend/data \
    && chown -R node:node /app/backend

USER node

EXPOSE 3000

CMD ["node", "server.js"]
