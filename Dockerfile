# Install dependencies only when needed
FROM node:18-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY . .
RUN npm install --force --legacy-peer-deps

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

COPY --from=builder /app ./

USER expressjs

CMD ["npm", "run", "server"]