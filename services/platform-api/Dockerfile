FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY services/background-workers ./services/background-workers
COPY services/platform-api ./services/platform-api

RUN pnpm install --frozen-lockfile --filter @quickwerk/platform-api...
RUN pnpm --filter @quickwerk/platform-api build

EXPOSE 3000

CMD ["pnpm", "--filter", "@quickwerk/platform-api", "start"]
