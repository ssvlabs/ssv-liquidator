FROM node:erbium

ENV APP_WORKDIR=/opt/app/

COPY package*.json yarn.lock $APP_WORKDIR
WORKDIR $APP_WORKDIR

RUN yarn install
COPY . $APP_WORKDIR

