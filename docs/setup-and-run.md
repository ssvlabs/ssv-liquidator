# Setup and run

- [Setup and run](#setup-and-run)
  - [Configuration settings](#configuration-settings)
  - [Local mode](#local-mode)
    - [Local installation](#local-installation)
    - [Run in local-mode](#run-in-local-mode)
  - [Docker mode](#docker)
    - [Docker installation](#docker-installation)
    - [Run in docker-mode](#run-in-docker-mode)
  - [Configuration settings](#configuration-settings)

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
## Local mode

Make sure you have the following installed:

- [Node.js](https://nodejs.org/en/) (the latest LTS)
- [Yarn](https://yarnpkg.com/lang/en/docs/install/) (version 1.0 or higher)
- [Redis Server](https://redis.io/topics/quickstart)
> Make sure that Redis server is up
### 1. Local installation

```bash
yarn install
```
> Note: don't delete yarn.lock before installation

### 2. Run in local-mode

```bash
yarn start:worker
```

## Docker


### 1. Docker installation
Download Docker from the official website

- Mac <https://docs.docker.com/docker-for-mac/install/>
- Windows <https://docs.docker.com/docker-for-windows/install/>
- Ubuntu <https://docs.docker.com/install/linux/docker-ce/ubuntu/>

### 2. Docker Compose installation
Download Docker Compose from [the official website](https://docs.docker.com/compose/install)

### 3. Run in docker-mode
Open terminal\CMD window and navigate to the project directory and run the following command:

```bash
docker-compose up
```


