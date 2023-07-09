# ssv-liquidator-monitor Grafana Service

This repository contains the Grafana service for monitoring SSV Liquidator data.

## Prerequisites
- Docker
- Docker Compose

## Running the Service
```shell
docker-compose up
```

This command starts two Docker containers:

1. Prometheus (Data source for Grafana)
2. Grafana (Data visualization)

## Accessing the Grafana Service
Access the Grafana service at `http://localhost:3333`

## Configure Prometheus as the data source:

1. Click the Gear icon on the left panel for Configuration.
2. Click 'Data Sources'.
3. Click 'Add data source'.
4. Select 'Prometheus'.
5. Input `http://ssv-liquidator-prometheus:9090` into the URL field.
6. Click 'Save & Test'.

## Setting up the Dashboard
To setup the dashboard:

1. Click the Plus icon on the left panel to create a new dashboard.
2. Click 'Import'.
3. Click 'Upload .json file' in the 'Import via panel json'.
4. Select the grafana.json file from the monitoring/ folder.
5. Click 'Load'.
