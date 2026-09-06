FROM oven/bun:1.3.14-slim

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bunx prisma generate && bun run build

USER bun
EXPOSE 3000

CMD ["bun", ".next/standalone/server.js"]
