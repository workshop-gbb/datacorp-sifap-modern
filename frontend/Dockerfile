FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS build
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm install --global pnpm@10.30.3 --registry=$NPM_REGISTRY
RUN pnpm config set registry $NPM_REGISTRY
WORKDIR /build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /build/.next/standalone ./
COPY --from=build --chown=node:node /build/.next/static ./.next/static
COPY --from=build --chown=node:node /build/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
CMD ["node","server.js"]
