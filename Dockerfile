FROM node:18

ENV NODE_OPTIONS=--openssl-legacy-provider
ENV APP_WORKDIR=/opt/app/

COPY package*.json yarn.lock $APP_WORKDIR
WORKDIR $APP_WORKDIR

RUN npm i -g node-gyp
RUN yarn install
COPY . $APP_WORKDIR
