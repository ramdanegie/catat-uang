# Single-service: build web statis + serve API & UI via Elysia di :3001.
FROM oven/bun:1
WORKDIR /srv

COPY apps/api/package.json apps/api/bun.lock* ./api/
COPY apps/web/package.json apps/web/bun.lock* ./web/
RUN cd api && bun install --production
RUN cd web && bun install

COPY apps/api ./api
COPY apps/web ./web

# Build frontend untuk production: VITE_API_URL kosong = same-origin /api/v1.
RUN cd web && VITE_API_URL= bun run build

ENV PORT=3001
ENV DB_PATH=/data/app.db
VOLUME /data
EXPOSE 3001
WORKDIR /srv/api
CMD ["bun", "run", "src/index.ts"]
