# Setup and run

- [Setup and run](#setup-and-run)
  - [First-time setup for local mode](#first-time-setup-for-local-mode)
    - [Installation](#installation)
    - [Message broker](#message-broker)
    - [Database](#database)
  - [Docker](#docker)
    - [Docker installation](#docker-installation)
    - [Docker-compose installation](#docker-compose-installation)
  - [Configuration settings](#configuration-settings)
  - [Run in local-mode](#run-in-local-mode)
  - [Run in docker-mode](#run-in-docker-mode)

## First-time setup for local mode

Make sure you have the following installed:

- [Node.js](https://nodejs.org/en/) (the latest LTS)
- [Yarn](https://yarnpkg.com/lang/en/docs/install/) (version 1.0 or higher)
- [Redis Server](https://redis.io/topics/quickstart)

## Installation

```bash
# Install dependencies from package.json
yarn install
```

> Note: don't delete yarn.lock before installation

### Message broker

The Redis server as a message-broker is used to handle periodic operations such as synchronizing burn rates, storing new validator accounts and running liquidation process.

### Database

> Note: The app uses [TypeORM](https://github.com/typeorm/typeorm) with Data Mapper pattern.

SQLite 2 is used for data storage. It's a local file-based database that doesn't need any settings on your part.

## Docker

if you are familiar with [docker](https://www.docker.com/) and [docker-compose](https://docs.docker.com/compose) then you can run built in docker-compose file, which will install and configure application and database for you.

### Docker installation

Download Docker from the official website:

- Mac <https://docs.docker.com/docker-for-mac/install/>
- Windows <https://docs.docker.com/docker-for-windows/install/>
- Ubuntu <https://docs.docker.com/install/linux/docker-ce/ubuntu/>

### Docker-compose installation

Download Docker Compose from [the official website](https://docs.docker.com/compose/install)

### Configuration settings

Before running the app, create a `.env` file and fill in the relevant configuration:

```env
WORKER_PORT=3030
REDIS_HOST=localhost # redis server host
REDIS_PORT=6379 # redis server port
NODE_URL=http://... # ETH1 Node url
SSV_NETWORK_ADDRESS=... # SSV Network contract address
SSV_REGISTRY_ADDRESS=... # [TEMPORARY] SSV Registery contract address
```

### Run in local-mode

> Note: If you're on Linux and see an `ENOSPC` error when running the commands below, you must [increase the number of available file watchers](https://stackoverflow.com/questions/22475849/node-js-error-enospc#answer-32600959).

```bash
yarn start:worker
```

### Run in docker-mode

Open an additional terminal\CMD window and navigate to the project directory and run the following command:

```bash
docker-compose up
```
