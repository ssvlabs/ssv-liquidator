FROM node:20 AS builder

ENV APP_WORKDIR=/opt/app/

COPY package*.json yarn.lock $APP_WORKDIR
WORKDIR $APP_WORKDIR

RUN npm i -g node-gyp
RUN yarn install
COPY . $APP_WORKDIR

# slim
FROM node:20-slim

ENV NODE_OPTIONS=--openssl-legacy-provider
ENV APP_WORKDIR=/opt/app/

WORKDIR $APP_WORKDIR
COPY --from=builder $APP_WORKDIR $APP_WORKDIR
