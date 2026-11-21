# Multi-stage full-stack build for fox3 (Node.js + SQLite D1/R2 shim + Vite Frontend)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build:web

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY server.ts server-env.ts tsconfig.json ./
COPY functions ./functions
COPY migrations ./migrations

RUN mkdir -p /app/.data

EXPOSE 80

CMD ["npm", "run", "start"]
