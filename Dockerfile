# ---- Sutra Lounge production image ----
# Multi-stage: compile TypeScript, then ship a slim runtime image.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Toolchain needed to compile better-sqlite3 native bindings.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && apt-get purge -y python3 make g++ \
 && apt-get autoremove -y \
 && npm cache clean --force

# Compiled server
COPY --from=build /app/dist ./dist

# Runtime assets served by Express (templates + public files)
COPY views ./views
COPY css ./css
COPY js ./js
COPY img ./img

# Persistent data lives here. Mount a volume/disk at /app/data in production
# so the SQLite database and uploaded images survive restarts and redeploys.
RUN mkdir -p /app/data/uploads

ENV PORT=4173
ENV SUTRA_DB_PATH=/app/data/sutra.db
EXPOSE 4173

# Drop root privileges.
RUN chown -R node:node /app/data
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4173)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
