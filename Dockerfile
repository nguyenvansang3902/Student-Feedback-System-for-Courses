# syntax=docker/dockerfile:1
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o node -g node /app \
    && install -d -m 0700 -o node -g node /var/lib/sfs/feedback
USER node

FROM base AS dependencies
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 npm ci --no-audit --no-fund

FROM dependencies AS tooling
COPY --chown=node:node . .
RUN npm run db:generate
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "0.0.0.0"]

FROM tooling AS build
ENV SFS_STANDALONE=1
RUN node node_modules/next/dist/bin/next build

FROM base AS production
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/resources/fonts ./resources/fonts
EXPOSE 3000
CMD ["node", "server.js"]
