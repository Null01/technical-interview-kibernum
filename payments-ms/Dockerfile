# ── Build ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# node:20-alpine ships with a built-in "node" user (uid 1000)
RUN chown -R node:node /app
USER node

EXPOSE 3003

CMD ["node", "dist/main.js"]
